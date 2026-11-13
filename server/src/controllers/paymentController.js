
import crypto from 'node:crypto';

import Course from '../models/Course.js';
import Payment from '../models/Payment.js';
import Enrollment from '../models/Enrollment.js';

import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

import {
  generatePayURequestHash,
  verifyPayUResponseHash,
  verifyPayUTransaction,
} from '../utils/payuUtils.js';

import { fulfillPayUPayment } from '../services/paymentFulfillment.js';

// Redirect the browser to the frontend payment result page.
const redirectToPaymentResult = (res, txnid, status) => {
  const clientUrl = process.env.CLIENT_URL;

  if (!clientUrl) {
    throw new ApiError(500, 'Frontend URL is not configured.');
  }

  const resultUrl = new URL('/payment/result', clientUrl);
  resultUrl.searchParams.set('txnid', txnid);
  resultUrl.searchParams.set('status', status);

  return res.redirect(303, resultUrl.toString());
};

// Free-course enrollment. Does not reset existing progress.
const ensureFreeEnrollment = async (userId, courseId) => {
  try {
    await Enrollment.findOneAndUpdate(
      { user: userId, course: courseId },
      {
        $setOnInsert: {
          user: userId,
          course: courseId,
          payment: null,
          enrolledAt: new Date(),
          lessonProgress: 0,
          quizProgress: 0,
          completedAt: null,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;

    const existing = await Enrollment.findOne({
      user: userId,
      course: courseId,
    });

    if (!existing) throw error;
  }
};

// Validate the PayU response and independently verify the transaction.
const verifyPayUNotification = async (data) => {
  const { PAYU_KEY, PAYU_SALT, PAYU_BASE_URL } = process.env;

  if (!PAYU_KEY || !PAYU_SALT || !PAYU_BASE_URL) {
    throw new ApiError(500, 'Payment gateway is not configured.');
  }

  if (!data?.txnid || !data?.hash || !data?.status || !data?.key) {
    throw new ApiError(400, 'Incomplete PayU notification.');
  }

  if (String(data.key) !== PAYU_KEY) {
    throw new ApiError(400, 'Invalid PayU merchant key.');
  }

  const payment = await Payment.findOne({
    txnid: String(data.txnid),
    provider: 'payu',
  });

  if (!payment) {
    throw new ApiError(404, 'Payment transaction not found.');
  }

  if (payment.currency !== 'INR') {
    throw new ApiError(400, 'Payment currency mismatch.');
  }

  const expectedAmount = (payment.amount / 100).toFixed(2);
  const callbackAmount = Number(data.amount);

  if (
    !Number.isFinite(callbackAmount) ||
    callbackAmount.toFixed(2) !== expectedAmount
  ) {
    throw new ApiError(400, 'Payment amount mismatch.');
  }

  if (!verifyPayUResponseHash(data, PAYU_SALT)) {
    throw new ApiError(400, 'PayU response hash verification failed.');
  }

  // Independently verify the transaction with PayU.
  const verification = await verifyPayUTransaction({
    key: PAYU_KEY,
    salt: PAYU_SALT,
    baseUrl: PAYU_BASE_URL,
    txnid: payment.txnid,
  });

  if (
    Number(verification.apiStatus) !== 1 ||
    !verification.transaction
  ) {
    throw new ApiError(
      503,
      'Unable to verify payment with PayU. Please retry.'
    );
  }

  const transaction = verification.transaction;
  const verifiedAmount = Number(transaction.amt);

  if (
    String(transaction.txnid) !== payment.txnid ||
    !Number.isFinite(verifiedAmount) ||
    verifiedAmount.toFixed(2) !== expectedAmount
  ) {
    throw new ApiError(400, 'PayU transaction details mismatch.');
  }

  // If PayU supplies a provider payment ID in both responses,
  // ensure they refer to the same transaction.
  if (
    data.mihpayid &&
    transaction.mihpayid &&
    String(data.mihpayid) !== String(transaction.mihpayid)
  ) {
    throw new ApiError(400, 'PayU payment reference mismatch.');
  }

  return { payment, transaction };
};

// Process verified success, failure, and pending outcomes.
const processPayUNotification = async (data) => {
  const { payment, transaction } =
    await verifyPayUNotification(data);

  const verifiedStatus = String(
    transaction.status || ''
  ).toLowerCase();

  if (payment.status === 'refunded') {
    return { payment, status: 'refunded' };
  }

  if (verifiedStatus === 'success') {
    const fulfilledPayment = await fulfillPayUPayment(
      payment.txnid,
      transaction.mihpayid || data.mihpayid || null,
      transaction
    );

    return { payment: fulfilledPayment, status: 'paid' };
  }

  if (verifiedStatus === 'failure') {
    // Never downgrade a paid or refunded payment.
    await Payment.updateOne(
      {
        _id: payment._id,
        status: { $nin: ['paid', 'refunded'] },
      },
      {
        $set: {
          status: 'failed',
          payuStatus: verifiedStatus,
          responseHashVerified: true,
        },
      }
    );

    const updatedPayment = await Payment.findById(payment._id);

    return {
      payment: updatedPayment,
      status: updatedPayment?.status === 'paid' ? 'paid' : 'failed',
    };
  }

  // Unknown or pending status: do not fulfill.
  await Payment.updateOne(
    {
      _id: payment._id,
      status: { $nin: ['paid', 'refunded'] },
    },
    {
      $set: {
        status: 'pending',
        payuStatus: verifiedStatus || 'unknown',
        responseHashVerified: true,
      },
    }
  );

  const updatedPayment = await Payment.findById(payment._id);

  return {
    payment: updatedPayment,
    status: updatedPayment?.status === 'paid' ? 'paid' : 'pending',
  };
};

// POST /api/payments/create-order
export const initiatePayUPayment = asyncHandler(async (req, res) => {
  const { courseId, phone } = req.body;

  if (!courseId) {
    throw new ApiError(400, 'Course ID is required.');
  }

  const course = await Course.findById(courseId);

  if (!course || course.status !== 'published') {
    throw new ApiError(404, 'Published course not found.');
  }

  if (!Number.isFinite(course.price) || course.price < 0) {
    throw new ApiError(400, 'Invalid course price.');
  }

  if (course.price === 0) {
    await ensureFreeEnrollment(req.user._id, course._id);

    return res.status(200).json({
      message: 'Successfully enrolled in the free course.',
      free: true,
    });
  }

  const existingEnrollment = await Enrollment.findOne({
    user: req.user._id,
    course: course._id,
  });

  if (existingEnrollment) {
    throw new ApiError(409, 'You are already enrolled in this course.');
  }

  if (!phone || !/^\d{10,15}$/.test(String(phone))) {
    throw new ApiError(
      400,
      'Please provide a valid phone number containing 10 to 15 digits.'
    );
  }

  const {
    PAYU_KEY,
    PAYU_SALT,
    PAYU_BASE_URL,
    SERVER_URL,
  } = process.env;

  if (!PAYU_KEY || !PAYU_SALT || !PAYU_BASE_URL || !SERVER_URL) {
    throw new ApiError(500, 'Payment gateway is not configured.');
  }

  const amountInPaise = Math.round(course.price * 100);

  if (!Number.isSafeInteger(amountInPaise) || amountInPaise < 1) {
    throw new ApiError(400, 'Invalid payment amount.');
  }

  const amount = (amountInPaise / 100).toFixed(2);

  const txnid =
    `LMS${Date.now().toString(36)}${crypto.randomBytes(6).toString('hex')}`;

  const productinfo = course.title.slice(0, 100);
  const firstname = String(req.user.name || 'Student')
    .trim()
    .slice(0, 20);
  const email = req.user.email;

  if (!email) {
    throw new ApiError(
      400,
      'A valid email address is required for payment.'
    );
  }

  const payment = await Payment.create({
    user: req.user._id,
    course: course._id,
    amount: amountInPaise,
    currency: 'INR',
    provider: 'payu',
    txnid,
    status: 'created',
  });

  const callbackUrl =
    `${SERVER_URL.replace(/\/+$/, '')}/api/payments/payu/callback`;

  const hash = generatePayURequestHash({
    key: PAYU_KEY,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    salt: PAYU_SALT,
  });

  const checkoutFields = {
    key: PAYU_KEY,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    phone: String(phone),
    surl: callbackUrl,
    furl: callbackUrl,
    hash,
    udf1: '',
    udf2: '',
    udf3: '',
    udf4: '',
    udf5: '',
  };

  const checkoutUrl =
    `${PAYU_BASE_URL.replace(/\/+$/, '')}/_payment`;

  return res.status(201).json({
    message: 'Payment initialized successfully.',
    free: false,
    provider: 'payu',
    paymentId: payment._id,
    txnid,
    checkoutUrl,
    checkoutFields,
  });
});

// POST /api/payments/payu/callback
// Browser return: verify, process, then redirect.
export const handlePayUCallback = asyncHandler(async (req, res) => {
  const result = await processPayUNotification(req.body);

  return redirectToPaymentResult(
    res,
    result.payment.txnid,
    result.status
  );
});

// POST /api/payments/payu/webhook
// Server-to-server notification: verify and acknowledge after processing.
export const handlePayUWebhook = asyncHandler(async (req, res) => {
  const result = await processPayUNotification(req.body);

  return res.status(200).json({
    received: true,
    txnid: result.payment.txnid,
    status: result.status,
  });
});

// GET /api/payments/:txnid/status
export const getPaymentStatus = asyncHandler(async (req, res) => {
  const { txnid } = req.params;

  if (!txnid) {
    throw new ApiError(400, 'Transaction ID is required.');
  }

  const payment = await Payment.findOne({
    txnid,
    user: req.user._id,
  })
    .select(
      'txnid amount currency status payuStatus paidAt createdAt'
    )
    .populate('course', 'title');

  if (!payment) {
    throw new ApiError(404, 'Payment not found.');
  }

  return res.status(200).json({
    payment: {
      txnid: payment.txnid,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      payuStatus: payment.payuStatus,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      course: payment.course
        ? { title: payment.course.title }
        : null,
    },
  });
});
