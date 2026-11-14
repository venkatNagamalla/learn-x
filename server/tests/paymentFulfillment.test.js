
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest';

import request from 'supertest';

process.env.AUTH_RATE_LIMIT = '1000';
process.env.PLATFORM_FEE_PERCENT = '20';

const { default: app } = await import('../src/app.js');

import Course from '../src/models/Course.js';
import Payment from '../src/models/Payment.js';
import Enrollment from '../src/models/Enrollment.js';
import Earning from '../src/models/Earning.js';

import {
  startDb,
  stopDb,
  clearDb,
} from './setup.js';

import {
  fulfillPayUPayment,
} from '../src/services/paymentFulfillment.js';

beforeAll(async () => {
  await startDb();
});

afterAll(async () => {
  await stopDb();
});

beforeEach(async () => {
  await clearDb();
});

const registerUser = async (role, email) => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      name: `Test ${role}`,
      email,
      password: 'Test@123456',
      role,
    });

  expect(res.status).toBe(201);

  return {
    token: res.body.accessToken,
    userId: res.body.user.id,
  };
};

const createTestPayment = async () => {
  const instructor = await registerUser(
    'instructor',
    'fulfillment-instructor@test.com'
  );

  const student = await registerUser(
    'student',
    'fulfillment-student@test.com'
  );

  const course = await Course.create({
    title: 'Fulfillment Test Course',
    description: 'Testing payment fulfillment.',
    category: 'Web Development',
    level: 'beginner',
    price: 999,
    thumbnail: 'https://example.com/course.jpg',
    instructor: instructor.userId,
    status: 'published',
  });

  const txnid = `TEST-TXN-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  const payment = await Payment.create({
    user: student.userId,
    course: course._id,
    amount: 99900,
    currency: 'INR',
    provider: 'payu',
    txnid,
    status: 'created',
  });

  return {
    instructor,
    student,
    course,
    payment,
    txnid,
  };
};

const verifiedDetails = (txnid) => ({
  status: 'success',
  txnid,
  amount: '999.00',
  mihpayid: 'PAYU-FULFILLMENT-TEST',
});

describe('Payment Fulfillment Service', () => {
  it('handles simultaneous fulfillment requests without creating duplicate records', async () => {
    const {
      student,
      course,
      payment,
      txnid,
    } = await createTestPayment();

    const details = verifiedDetails(txnid);

    await Promise.all([
      fulfillPayUPayment(
        txnid,
        details.mihpayid,
        details
      ),
      fulfillPayUPayment(
        txnid,
        details.mihpayid,
        details
      ),
    ]);

    const confirmedPayment = await Payment.findById(
      payment._id
    );

    expect(confirmedPayment.status).toBe('paid');

    const enrollments = await Enrollment.find({
      user: student.userId,
      course: course._id,
    });

    expect(enrollments).toHaveLength(1);

    expect(enrollments[0].payment.toString()).toBe(
      payment._id.toString()
    );

    const earnings = await Earning.find({
      payment: payment._id,
    });

    expect(earnings).toHaveLength(1);

    expect(earnings[0].gross).toBe(99900);
    expect(earnings[0].platformFee).toBe(19980);
    expect(earnings[0].net).toBe(79920);
  });

  it('recovers missing enrollment and earning records when a paid payment is processed again', async () => {
    const {
      student,
      course,
      payment,
      txnid,
    } = await createTestPayment();

    // Simulate a previous fulfillment attempt that marked
    // the payment as paid but stopped before creating
    // enrollment and earning records.
    payment.status = 'paid';
    payment.payuStatus = 'success';
    payment.payuPaymentId = 'PAYU-FULFILLMENT-TEST';
    payment.responseHashVerified = true;
    payment.paidAt = new Date();

    await payment.save();

    expect(
      await Enrollment.countDocuments({
        user: student.userId,
        course: course._id,
      })
    ).toBe(0);

    expect(
      await Earning.countDocuments({
        payment: payment._id,
      })
    ).toBe(0);

    const details = verifiedDetails(txnid);

    await fulfillPayUPayment(
      txnid,
      details.mihpayid,
      details
    );

    const enrollment = await Enrollment.findOne({
      user: student.userId,
      course: course._id,
    });

    expect(enrollment).not.toBeNull();

    expect(enrollment.payment.toString()).toBe(
      payment._id.toString()
    );

    const earning = await Earning.findOne({
      payment: payment._id,
    });

    expect(earning).not.toBeNull();
    expect(earning.gross).toBe(99900);
    expect(earning.platformFee).toBe(19980);
    expect(earning.net).toBe(79920);

    // A further retry must still leave exactly one
    // enrollment and one earning.
    await fulfillPayUPayment(
      txnid,
      details.mihpayid,
      details
    );

    expect(
      await Enrollment.countDocuments({
        user: student.userId,
        course: course._id,
      })
    ).toBe(1);

    expect(
      await Earning.countDocuments({
        payment: payment._id,
      })
    ).toBe(1);
  });
});