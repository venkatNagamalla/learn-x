
import Course from '../models/Course.js';
import Payment from '../models/Payment.js';
import Enrollment from '../models/Enrollment.js';
import Earning from '../models/Earning.js';

import { ApiError } from '../utils/ApiError.js';

// Create or recover an enrollment without resetting existing progress.
const ensureEnrollment = async (payment) => {
  try {
    await Enrollment.findOneAndUpdate(
      {
        user: payment.user,
        course: payment.course,
      },
      {
        $setOnInsert: {
          user: payment.user,
          course: payment.course,
          payment: payment._id,
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
    if (error.code !== 11000) {
      throw error;
    }

    const existingEnrollment = await Enrollment.findOne({
      user: payment.user,
      course: payment.course,
    });

    if (!existingEnrollment) {
      throw error;
    }
  }

  // Attach the successful payment to an existing enrollment
  // if it was previously created without a payment reference.
  await Enrollment.updateOne(
    {
      user: payment.user,
      course: payment.course,
      payment: null,
    },
    {
      $set: {
        payment: payment._id,
      },
    }
  );
};

// Create exactly one earning per successful payment.
const ensureEarning = async (payment, course) => {
  const feePercent = Number(
    process.env.PLATFORM_FEE_PERCENT || 20
  );

  if (
    !Number.isFinite(feePercent) ||
    feePercent < 0 ||
    feePercent > 100
  ) {
    throw new ApiError(
      500,
      'Invalid platform fee configuration.'
    );
  }

  const feePaise = Math.round(
    (payment.amount * feePercent) / 100
  );

  const netPaise = payment.amount - feePaise;

  try {
    const earning = await Earning.findOneAndUpdate(
      {
        payment: payment._id,
      },
      {
        $setOnInsert: {
          instructor: course.instructor,
          course: payment.course,
          payment: payment._id,
          gross: payment.amount,
          platformFee: feePaise,
          net: netPaise,
          payoutStatus: 'pending',
          paidAt: null,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    if (
      String(earning.instructor) !== String(course.instructor) ||
      String(earning.course) !== String(payment.course) ||
      earning.gross !== payment.amount ||
      earning.platformFee !== feePaise ||
      earning.net !== netPaise
    ) {
      throw new ApiError(
        409,
        'Existing earning does not match the verified payment.'
      );
    }
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }

    const existingEarning = await Earning.findOne({
      payment: payment._id,
    });

    if (!existingEarning) {
      throw error;
    }
  }
};

// Shared, recoverable fulfillment service.
// Called by both the verified browser return and PayU webhook.
export const fulfillPayUPayment = async (
  txnid,
  providerPaymentId,
  verifiedDetails
) => {
  if (!txnid || !verifiedDetails) {
    throw new ApiError(
      400,
      'Verified payment details are required.'
    );
  }

  // Find the locally stored payment attempt.
  const payment = await Payment.findOne({
    txnid,
    provider: 'payu',
  });

  if (!payment) {
    throw new ApiError(
      404,
      'Payment transaction not found.'
    );
  }

  // Validate stored payment details.
  if (
    !payment.user ||
    !payment.course ||
    payment.currency !== 'INR' ||
    payment.provider !== 'payu'
  ) {
    throw new ApiError(
      400,
      'Stored payment details are invalid.'
    );
  }

  if (payment.status === 'refunded') {
    throw new ApiError(
      409,
      'This payment has already been refunded.'
    );
  }

  // Validate independently verified PayU details.
  const verifiedStatus = String(
    verifiedDetails.status || ''
  ).toLowerCase();

  const verifiedTxnid = String(
    verifiedDetails.txnid || ''
  );

  const verifiedAmount = Number(
    verifiedDetails.amt
  );

  const expectedAmount = (
    payment.amount / 100
  ).toFixed(2);

  if (
    verifiedStatus !== 'success' ||
    verifiedTxnid !== payment.txnid ||
    !Number.isFinite(verifiedAmount) ||
    verifiedAmount.toFixed(2) !== expectedAmount
  ) {
    throw new ApiError(
      400,
      'Verified payment details mismatch.'
    );
  }

  if (
    verifiedDetails.currency &&
    String(verifiedDetails.currency).toUpperCase() !==
      payment.currency
  ) {
    throw new ApiError(
      400,
      'Verified payment currency mismatch.'
    );
  }

  // Validate provider payment reference when available.
  const verifiedProviderId =
    providerPaymentId ||
    verifiedDetails.mihpayid ||
    null;

  if (
    payment.payuPaymentId &&
    verifiedProviderId &&
    String(payment.payuPaymentId) !==
      String(verifiedProviderId)
  ) {
    throw new ApiError(
      409,
      'PayU payment reference mismatch.'
    );
  }

  // Load the course and its instructor before claiming payment.
  const course = await Course.findById(
    payment.course
  ).select('instructor');

  if (!course || !course.instructor) {
    throw new ApiError(
      404,
      'Course or instructor not found.'
    );
  }

  // Atomically claim the payment.
  // Only one concurrent request can change a non-paid,
  // non-refunded payment to paid.
  const claimResult = await Payment.updateOne(
    {
      _id: payment._id,
      status: {
        $nin: ['paid', 'refunded'],
      },
    },
    {
      $set: {
        status: 'paid',
        payuStatus: verifiedStatus,
        payuPaymentId: verifiedProviderId,
        responseHashVerified: true,
        paidAt: new Date(),
      },
    }
  );

  // Reload the payment after the atomic claim.
  const confirmedPayment = await Payment.findById(
    payment._id
  );

  if (!confirmedPayment) {
    throw new ApiError(
      404,
      'Payment transaction not found.'
    );
  }

  if (confirmedPayment.status === 'refunded') {
    throw new ApiError(
      409,
      'This payment has already been refunded.'
    );
  }

  if (confirmedPayment.status !== 'paid') {
    throw new ApiError(
      409,
      'Payment could not be confirmed.'
    );
  }

  // If another request already claimed the payment,
  // continue with safe recovery operations.
  // This also repairs missing records after a process crash.
  await ensureEnrollment(confirmedPayment);

  await ensureEarning(
    confirmedPayment,
    course
  );

  return confirmedPayment;
};
