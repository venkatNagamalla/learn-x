
import Course from '../models/Course.js';
import Payment from '../models/Payment.js';
import Enrollment from '../models/Enrollment.js';
import Earning from '../models/Earning.js';

import { ApiError } from './ApiError.js';

// Create an enrollment without resetting existing learning progress.
const ensureEnrollment = async (userId, courseId, paymentId) => {
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

// Create exactly one instructor earning per successful payment.
const ensureEarning = async (payment, course) => {
  const feePercent = Number(process.env.PLATFORM_FEE_PERCENT);

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

// Shared fulfillment function for browser callbacks and PayU webhooks.
export const fulfillPayUPayment = async ({
  payment,
  transaction,
}) => {
  if (!payment || !transaction) {
    throw new ApiError(
      400,
      'Payment and verified transaction are required.'
    );
  }

  if (
    payment.provider !== 'payu' ||
    payment.currency !== 'INR'
  ) {
    throw new ApiError(
      400,
      'Payment provider or currency mismatch.'
    );
  }

  const verifiedAmount = Number(transaction.amt);
  const expectedAmount = (payment.amount / 100).toFixed(2);

  if (
    transaction.txnid !== payment.txnid ||
    !Number.isFinite(verifiedAmount) ||
    verifiedAmount.toFixed(2) !== expectedAmount ||
    String(transaction.status || '').toLowerCase() !== 'success'
  ) {
    throw new ApiError(
      400,
      'Verified PayU transaction details mismatch.'
    );
  }

  const providerPaymentId = String(
    transaction.mihpayid || ''
  ).trim();

  if (
    !providerPaymentId ||
    providerPaymentId.toLowerCase() === 'not found'
  ) {
    throw new ApiError(
      400,
      'Valid PayU payment reference is missing.'
    );
  }

  if (
    payment.payuPaymentId &&
    payment.payuPaymentId !== providerPaymentId
  ) {
    throw new ApiError(
      409,
      'PayU payment reference does not match.'
    );
  }

  if (payment.status === 'refunded') {
    throw new ApiError(
      409,
      'This payment has already been refunded.'
    );
  }

  // Never downgrade a refunded payment.
  await Payment.updateOne(
    {
      _id: payment._id,
      status: { $ne: 'refunded' },
    },
    {
      $set: {
        status: 'paid',
        payuStatus: 'success',
        payuPaymentId: providerPaymentId,
        responseHashVerified: true,
        paidAt: payment.paidAt || new Date(),
      },
    }
  );

  const confirmedPayment = await Payment.findById(
    payment._id
  );

  if (!confirmedPayment || confirmedPayment.status !== 'paid') {
    throw new ApiError(
      409,
      'Payment could not be confirmed.'
    );
  }

  // Find the course instructor.
  const course = await Course.findById(
    confirmedPayment.course
  ).select('instructor');

  if (!course || !course.instructor) {
    throw new ApiError(
      404,
      'Course or instructor not found.'
    );
  }

  // Create enrollment without resetting lesson or quiz progress.
  await ensureEnrollment(
    confirmedPayment.user,
    confirmedPayment.course,
    confirmedPayment._id
  );

  // Create the instructor earning exactly once.
  await ensureEarning(confirmedPayment, course);

  return confirmedPayment;
};
