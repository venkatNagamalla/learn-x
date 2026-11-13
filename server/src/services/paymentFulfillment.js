
import Course from '../models/Course.js';
import Payment from '../models/Payment.js';
import Enrollment from '../models/Enrollment.js';
import Earning from '../models/Earning.js';

import { ApiError } from '../utils/ApiError.js';

// Create an enrollment safely without resetting existing progress.
const ensureEnrollment = async (userId, courseId, paymentId = null) => {
  try {
    await Enrollment.findOneAndUpdate(
      {
        user: userId,
        course: courseId,
      },
      {
        $setOnInsert: {
          user: userId,
          course: courseId,
          payment: paymentId,
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
      user: userId,
      course: courseId,
    });

    if (!existingEnrollment) {
      throw error;
    }
  }
};

// Create one instructor earning per successful payment.
const ensureEarning = async (payment, course) => {
  const feePercent = Number(process.env.PLATFORM_FEE_PERCENT);

  if (
    !Number.isFinite(feePercent) ||
    feePercent < 0 ||
    feePercent > 100
  ) {
    throw new ApiError(500, 'Invalid platform fee configuration.');
  }

  const gross = payment.amount;

  const platformFee = Math.round(
    (gross * feePercent) / 100
  );

  const net = gross - platformFee;

  try {
    await Earning.findOneAndUpdate(
      {
        payment: payment._id,
      },
      {
        $setOnInsert: {
          instructor: course.instructor,
          course: payment.course,
          payment: payment._id,
          gross,
          platformFee,
          net,
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

// Shared fulfillment function for browser returns and PayU webhooks.
export const fulfillPayUPayment = async (
  txnid,
  providerPaymentId,
  verifiedResponse
) => {
  if (!txnid || !verifiedResponse) {
    throw new ApiError(400, 'Verified payment details are required.');
  }

  const payment = await Payment.findOne({ txnid });

  if (!payment) {
    throw new ApiError(404, 'Payment transaction not found.');
  }

  if (payment.currency !== 'INR') {
    throw new ApiError(400, 'Payment currency mismatch.');
  }

  if (payment.provider !== 'payu') {
    throw new ApiError(400, 'Payment provider mismatch.');
  }

  // Never fulfill a refunded payment.
  if (payment.status === 'refunded') {
    throw new ApiError(409, 'This payment has already been refunded.');
  }

  // Only verified successful PayU transactions can be fulfilled.
  const verifiedStatus = String(
    verifiedResponse.status || ''
  ).toLowerCase();

  const verifiedTxnid = String(
    verifiedResponse.txnid || ''
  );

  const verifiedAmount = Number(verifiedResponse.amt);

  const expectedAmount = (payment.amount / 100).toFixed(2);

  if (
    verifiedStatus !== 'success' ||
    verifiedTxnid !== payment.txnid ||
    !Number.isFinite(verifiedAmount) ||
    verifiedAmount.toFixed(2) !== expectedAmount
  ) {
    throw new ApiError(400, 'Verified payment details mismatch.');
  }

  // Mark as paid without overwriting a refund.
  await Payment.updateOne(
    {
      _id: payment._id,
      status: { $ne: 'refunded' },
    },
    {
      $set: {
        status: 'paid',
        payuStatus: verifiedStatus,
        payuPaymentId: providerPaymentId || null,
        responseHashVerified: true,
        paidAt: payment.paidAt || new Date(),
      },
    }
  );

  const confirmedPayment = await Payment.findById(payment._id);

  if (!confirmedPayment || confirmedPayment.status !== 'paid') {
    throw new ApiError(409, 'Payment could not be confirmed.');
  }

  const course = await Course.findById(
    confirmedPayment.course
  ).select('instructor');

  if (!course || !course.instructor) {
    throw new ApiError(404, 'Course or instructor not found.');
  }

  // Both operations are idempotent.
  await ensureEnrollment(
    confirmedPayment.user,
    confirmedPayment.course,
    confirmedPayment._id
  );

  await ensureEarning(confirmedPayment, course);

  return confirmedPayment;
};
