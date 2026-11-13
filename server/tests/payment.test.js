
import crypto from 'node:crypto';

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';

import request from 'supertest';

// Set the test-only authentication rate limit before loading the Express app.
process.env.AUTH_RATE_LIMIT = '1000';

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

const PAYU_KEY = 'test-merchant-key';
const PAYU_SALT = 'test-merchant-salt';

beforeAll(async () => {
  process.env.PAYU_KEY = PAYU_KEY;
  process.env.PAYU_SALT = PAYU_SALT;
  process.env.PAYU_BASE_URL = 'https://test.payu.in';
  process.env.SERVER_URL = 'http://localhost:5000';
  process.env.CLIENT_URL = 'http://localhost:5173';
  process.env.PLATFORM_FEE_PERCENT = '20';

  await startDb();
});

afterAll(async () => {
  await stopDb();
});

beforeEach(async () => {
  await clearDb();
});

afterEach(() => {
  vi.unstubAllGlobals();
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

  return {
    token: res.body.accessToken,
    userId: res.body.user.id,
  };
};

const createPublishedCourse = async (
  instructorId,
  price = 999
) => {
  return Course.create({
    title: 'Complete React Course',
    description: 'Learn React with practical projects.',
    category: 'Web Development',
    level: 'beginner',
    price,
    thumbnail: 'https://example.com/react.jpg',
    instructor: instructorId,
    status: 'published',
  });
};

const createOrder = (
  token,
  courseId,
  phone = '9876543210'
) => {
  return request(app)
    .post('/api/payments/create-order')
    .set('Authorization', `Bearer ${token}`)
    .send({
      courseId: courseId?.toString(),
      phone,
    });
};

// Generate a valid PayU reverse response hash for callback tests.
const generateCallbackHash = (data) => {
  const hashString = [
    PAYU_SALT,
    data.status,
    '',
    '',
    '',
    '',
    '',
    data.udf5 || '',
    data.udf4 || '',
    data.udf3 || '',
    data.udf2 || '',
    data.udf1 || '',
    data.email || '',
    data.firstname || '',
    data.productinfo || '',
    data.amount || '',
    data.txnid,
    data.key,
  ].join('|');

  return crypto
    .createHash('sha512')
    .update(hashString)
    .digest('hex');
};

// Mock PayU's server-to-server verify_payment response.
const mockPayUVerification = ({
  txnid,
  amount = '999.00',
  status = 'success',
  mihpayid = 'PAYU-TEST-123',
  apiStatus = 1,
} = {}) => {
  const transaction = {
    txnid,
    amt: amount,
    status,
    mihpayid,
  };

  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      status: apiStatus,
      transaction_details:
        apiStatus === 1
          ? {
              [txnid]: transaction,
            }
          : {},
    }),
  });

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
};

// Build callback/webhook data using the payment checkout information.
const createCallbackData = ({
  txnid,
  studentEmail,
  courseTitle,
  amount = '999.00',
  status = 'success',
  validHash = true,
}) => {
  const data = {
    key: PAYU_KEY,
    txnid,
    amount,
    productinfo: courseTitle,
    firstname: 'Test student',
    email: studentEmail,
    status,
    udf1: '',
    udf2: '',
    udf3: '',
    udf4: '',
    udf5: '',
  };

  data.hash = generateCallbackHash(data);

  if (!validHash) {
    data.hash = '0'.repeat(128);
  }

  return data;
};

const submitPayUCallback = (data) => {
  return request(app)
    .post('/api/payments/payu/callback')
    .type('form')
    .send(data);
};

const submitPayUWebhook = (data) => {
  return request(app)
    .post('/api/payments/payu/webhook')
    .type('form')
    .send(data);
};

describe('Payment Create Order API', () => {
  it('rejects payment creation without authentication', async () => {
    const res = await request(app)
      .post('/api/payments/create-order')
      .send({
        courseId: '507f1f77bcf86cd799439011',
        phone: '9876543210',
      });

    expect(res.status).toBe(401);
  });

  it('rejects payment creation by an instructor', async () => {
    const instructor = await registerUser(
      'instructor',
      'instructor-payment@test.com'
    );

    const res = await createOrder(
      instructor.token,
      '507f1f77bcf86cd799439011'
    );

    expect(res.status).toBe(403);
  });

  it('rejects a missing course ID', async () => {
    const student = await registerUser(
      'student',
      'student-missing-course@test.com'
    );

    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${student.token}`)
      .send({
        phone: '9876543210',
      });

    expect(res.status).toBe(400);
  });

  it('rejects an invalid phone number for a paid course', async () => {
    const instructor = await registerUser(
      'instructor',
      'invalid-phone-instructor@test.com'
    );

    const student = await registerUser(
      'student',
      'student-invalid-phone@test.com'
    );

    const course = await createPublishedCourse(
      instructor.userId
    );

    const res = await createOrder(
      student.token,
      course._id,
      '12345'
    );

    expect(res.status).toBe(400);
  });

  it('rejects a course that does not exist', async () => {
    const student = await registerUser(
      'student',
      'student-course-not-found@test.com'
    );

    const res = await createOrder(
      student.token,
      '507f1f77bcf86cd799439011'
    );

    expect(res.status).toBe(404);
  });

  it('rejects payment for an unpublished course', async () => {
    const instructor = await registerUser(
      'instructor',
      'draft-instructor@test.com'
    );

    const student = await registerUser(
      'student',
      'student-draft@test.com'
    );

    const course = await Course.create({
      title: 'Draft Course',
      description: 'This course is not published.',
      category: 'Web Development',
      level: 'beginner',
      price: 999,
      instructor: instructor.userId,
      status: 'draft',
    });

    const res = await createOrder(
      student.token,
      course._id
    );

    expect(res.status).toBe(404);
  });

  it('successfully creates a PayU payment for a published course', async () => {
    const instructor = await registerUser(
      'instructor',
      'payment-instructor@test.com'
    );

    const student = await registerUser(
      'student',
      'payment-student@test.com'
    );

    const course = await createPublishedCourse(
      instructor.userId
    );

    const res = await createOrder(
      student.token,
      course._id
    );

    expect(res.status).toBe(201);
    expect(res.body.free).toBe(false);
    expect(res.body.provider).toBe('payu');
    expect(res.body.paymentId).toBeDefined();
    expect(res.body.txnid).toBeDefined();

    expect(res.body.checkoutUrl).toBe(
      'https://test.payu.in/_payment'
    );

    expect(res.body.checkoutFields.key).toBe(PAYU_KEY);
    expect(res.body.checkoutFields.amount).toBe('999.00');
    expect(res.body.checkoutFields.productinfo).toBe(
      course.title
    );
    expect(res.body.checkoutFields.phone).toBe('9876543210');

    expect(res.body.checkoutFields.hash).toMatch(
      /^[a-f0-9]{128}$/
    );

    expect(res.body.checkoutFields.surl).toContain(
      '/api/payments/payu/callback'
    );

    expect(res.body.checkoutFields.furl).toBe(
      res.body.checkoutFields.surl
    );

    expect(
      res.body.checkoutFields.firstname.length
    ).toBeLessThanOrEqual(20);

    const payment = await Payment.findById(
      res.body.paymentId
    );

    expect(payment).not.toBeNull();
    expect(payment.user.toString()).toBe(student.userId);
    expect(payment.course.toString()).toBe(
      course._id.toString()
    );
    expect(payment.amount).toBe(99900);
    expect(payment.currency).toBe('INR');
    expect(payment.provider).toBe('payu');
    expect(payment.status).toBe('created');

    const enrollment = await Enrollment.findOne({
      user: student.userId,
      course: course._id,
    });

    expect(enrollment).toBeNull();
  });

  it('enrolls a student directly in a free course without creating a payment', async () => {
    const instructor = await registerUser(
      'instructor',
      'free-instructor@test.com'
    );

    const student = await registerUser(
      'student',
      'free-student@test.com'
    );

    const course = await createPublishedCourse(
      instructor.userId,
      0
    );

    const res = await createOrder(
      student.token,
      course._id
    );

    expect(res.status).toBe(200);
    expect(res.body.free).toBe(true);

    const enrollment = await Enrollment.findOne({
      user: student.userId,
      course: course._id,
    });

    expect(enrollment).not.toBeNull();
    expect(enrollment.lessonProgress).toBe(0);
    expect(enrollment.quizProgress).toBe(0);
    expect(enrollment.payment).toBeNull();

    const payment = await Payment.findOne({
      user: student.userId,
      course: course._id,
    });

    expect(payment).toBeNull();
  });

  it('rejects a second payment attempt when already enrolled in a paid course', async () => {
    const instructor = await registerUser(
      'instructor',
      'already-enrolled-instructor@test.com'
    );

    const student = await registerUser(
      'student',
      'already-enrolled-student@test.com'
    );

    const course = await createPublishedCourse(
      instructor.userId
    );

    await Enrollment.create({
      user: student.userId,
      course: course._id,
      lessonProgress: 25,
      quizProgress: 10,
    });

    const res = await createOrder(
      student.token,
      course._id
    );

    expect(res.status).toBe(409);

    const payment = await Payment.findOne({
      user: student.userId,
      course: course._id,
    });

    expect(payment).toBeNull();
  });
});

describe('PayU Callback API', () => {
  it('confirms a successful payment, enrolls the student, and creates one instructor earning', async () => {
    const instructor = await registerUser(
      'instructor',
      'callback-instructor@test.com'
    );

    const student = await registerUser(
      'student',
      'callback-student@test.com'
    );

    const course = await createPublishedCourse(
      instructor.userId
    );

    const orderRes = await createOrder(
      student.token,
      course._id
    );

    expect(orderRes.status).toBe(201);

    const txnid = orderRes.body.txnid;

    const callbackData = createCallbackData({
      txnid,
      studentEmail: 'callback-student@test.com',
      courseTitle: course.title,
    });

    const fetchMock = mockPayUVerification({
      txnid,
      amount: '999.00',
      status: 'success',
    });

    const res = await submitPayUCallback(callbackData);

    expect(res.status).toBe(303);

    const redirectUrl = new URL(res.headers.location);

    expect(redirectUrl.origin).toBe(
      'http://localhost:5173'
    );
    expect(redirectUrl.pathname).toBe('/payment/result');
    expect(redirectUrl.searchParams.get('txnid')).toBe(txnid);
    expect(redirectUrl.searchParams.get('status')).toBe('paid');

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const payment = await Payment.findOne({ txnid });

    expect(payment.status).toBe('paid');
    expect(payment.payuStatus).toBe('success');
    expect(payment.payuPaymentId).toBe('PAYU-TEST-123');
    expect(payment.responseHashVerified).toBe(true);
    expect(payment.paidAt).not.toBeNull();

    const enrollment = await Enrollment.findOne({
      user: student.userId,
      course: course._id,
    });

    expect(enrollment).not.toBeNull();
    expect(enrollment.payment.toString()).toBe(
      payment._id.toString()
    );
    expect(enrollment.lessonProgress).toBe(0);
    expect(enrollment.quizProgress).toBe(0);

    const earning = await Earning.findOne({
      payment: payment._id,
    });

    expect(earning).not.toBeNull();
    expect(earning.instructor.toString()).toBe(
      instructor.userId
    );
    expect(earning.course.toString()).toBe(
      course._id.toString()
    );
    expect(earning.gross).toBe(99900);
    expect(earning.platformFee).toBe(19980);
    expect(earning.net).toBe(79920);
    expect(earning.payoutStatus).toBe('pending');

    // A repeated successful callback must not create duplicates.
    const repeatedRes = await submitPayUCallback(
      callbackData
    );

    expect(repeatedRes.status).toBe(303);

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

  it('marks a failed payment without creating enrollment or earning', async () => {
    const instructor = await registerUser(
      'instructor',
      'failed-instructor@test.com'
    );

    const student = await registerUser(
      'student',
      'failed-student@test.com'
    );

    const course = await createPublishedCourse(
      instructor.userId
    );

    const orderRes = await createOrder(
      student.token,
      course._id
    );

    const txnid = orderRes.body.txnid;

    const callbackData = createCallbackData({
      txnid,
      studentEmail: 'failed-student@test.com',
      courseTitle: course.title,
      status: 'failure',
    });

    mockPayUVerification({
      txnid,
      status: 'failure',
    });

    const res = await submitPayUCallback(callbackData);

    expect(res.status).toBe(303);

    const redirectUrl = new URL(res.headers.location);

    expect(redirectUrl.searchParams.get('status')).toBe(
      'failed'
    );

    const payment = await Payment.findOne({ txnid });

    expect(payment.status).toBe('failed');
    expect(payment.payuStatus).toBe('failure');
    expect(payment.responseHashVerified).toBe(true);

    expect(
      await Enrollment.findOne({
        user: student.userId,
        course: course._id,
      })
    ).toBeNull();

    expect(
      await Earning.countDocuments()
    ).toBe(0);
  });

  it('keeps a pending payment without creating enrollment or earning', async () => {
    const instructor = await registerUser(
      'instructor',
      'pending-instructor@test.com'
    );

    const student = await registerUser(
      'student',
      'pending-student@test.com'
    );

    const course = await createPublishedCourse(
      instructor.userId
    );

    const orderRes = await createOrder(
      student.token,
      course._id
    );

    const txnid = orderRes.body.txnid;

    const callbackData = createCallbackData({
      txnid,
      studentEmail: 'pending-student@test.com',
      courseTitle: course.title,
      status: 'pending',
    });

    mockPayUVerification({
      txnid,
      status: 'pending',
    });

    const res = await submitPayUCallback(callbackData);

    expect(res.status).toBe(303);

    const redirectUrl = new URL(res.headers.location);

    expect(redirectUrl.searchParams.get('status')).toBe(
      'pending'
    );

    const payment = await Payment.findOne({ txnid });

    expect(payment.status).toBe('pending');
    expect(payment.payuStatus).toBe('pending');
    expect(payment.responseHashVerified).toBe(true);

    expect(
      await Enrollment.countDocuments()
    ).toBe(0);

    expect(
      await Earning.countDocuments()
    ).toBe(0);
  });

  it('rejects a callback with an invalid reverse hash', async () => {
    const instructor = await registerUser(
      'instructor',
      'invalid-hash-instructor@test.com'
    );

    const student = await registerUser(
      'student',
      'invalid-hash-student@test.com'
    );

    const course = await createPublishedCourse(
      instructor.userId
    );

    const orderRes = await createOrder(
      student.token,
      course._id
    );

    const txnid = orderRes.body.txnid;

    const callbackData = createCallbackData({
      txnid,
      studentEmail: 'invalid-hash-student@test.com',
      courseTitle: course.title,
      validHash: false,
    });

    const res = await submitPayUCallback(callbackData);

    expect(res.status).toBe(400);

    expect(res.body.message).toBe(
      'PayU response hash verification failed.'
    );

    const payment = await Payment.findOne({ txnid });

    expect(payment.status).toBe('created');

    expect(
      await Enrollment.countDocuments()
    ).toBe(0);

    expect(
      await Earning.countDocuments()
    ).toBe(0);
  });

  it('rejects a callback when PayU server verification does not confirm the transaction', async () => {
    const instructor = await registerUser(
      'instructor',
      'verification-instructor@test.com'
    );

    const student = await registerUser(
      'student',
      'verification-student@test.com'
    );

    const course = await createPublishedCourse(
      instructor.userId
    );

    const orderRes = await createOrder(
      student.token,
      course._id
    );

    const txnid = orderRes.body.txnid;

    const callbackData = createCallbackData({
      txnid,
      studentEmail: 'verification-student@test.com',
      courseTitle: course.title,
    });

    mockPayUVerification({
      txnid,
      apiStatus: 0,
    });

    const res = await submitPayUCallback(callbackData);

    expect(res.status).toBe(503);

    expect(res.body.message).toBe(
      'Unable to verify payment with PayU. Please retry.'
    );

    const payment = await Payment.findOne({ txnid });

    expect(payment.status).toBe('created');

    expect(
      await Enrollment.countDocuments()
    ).toBe(0);

    expect(
      await Earning.countDocuments()
    ).toBe(0);
  });

  it('rejects a callback when the verified amount does not match the payment', async () => {
    const instructor = await registerUser(
      'instructor',
      'amount-instructor@test.com'
    );

    const student = await registerUser(
      'student',
      'amount-student@test.com'
    );

    const course = await createPublishedCourse(
      instructor.userId
    );

    const orderRes = await createOrder(
      student.token,
      course._id
    );

    const txnid = orderRes.body.txnid;

    const callbackData = createCallbackData({
      txnid,
      studentEmail: 'amount-student@test.com',
      courseTitle: course.title,
    });

    mockPayUVerification({
      txnid,
      amount: '100.00',
      status: 'success',
    });

    const res = await submitPayUCallback(callbackData);

    expect(res.status).toBe(400);

    expect(res.body.message).toBe(
      'PayU transaction details mismatch.'
    );

    const payment = await Payment.findOne({ txnid });

    expect(payment.status).toBe('created');

    expect(
      await Enrollment.countDocuments()
    ).toBe(0);

    expect(
      await Earning.countDocuments()
    ).toBe(0);
  });
});

describe('PayU Webhook API', () => {
  it('confirms a successful webhook, enrolls the student, and creates one earning', async () => {
    const instructor = await registerUser(
      'instructor',
      'webhook-success-instructor@test.com'
    );

    const student = await registerUser(
      'student',
      'webhook-success-student@test.com'
    );

    const course = await createPublishedCourse(
      instructor.userId
    );

    const orderRes = await createOrder(
      student.token,
      course._id
    );

    expect(orderRes.status).toBe(201);

    const txnid = orderRes.body.txnid;

    const webhookData = createCallbackData({
      txnid,
      studentEmail: 'webhook-success-student@test.com',
      courseTitle: course.title,
    });

    const fetchMock = mockPayUVerification({
      txnid,
      status: 'success',
    });

    const res = await submitPayUWebhook(webhookData);

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.txnid).toBe(txnid);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const payment = await Payment.findOne({ txnid });

    expect(payment.status).toBe('paid');
    expect(payment.responseHashVerified).toBe(true);

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

  it('processes duplicate successful webhook notifications idempotently', async () => {
    const instructor = await registerUser(
      'instructor',
      'webhook-duplicate-instructor@test.com'
    );

    const student = await registerUser(
      'student',
      'webhook-duplicate-student@test.com'
    );

    const course = await createPublishedCourse(
      instructor.userId
    );

    const orderRes = await createOrder(
      student.token,
      course._id
    );

    const txnid = orderRes.body.txnid;

    const webhookData = createCallbackData({
      txnid,
      studentEmail: 'webhook-duplicate-student@test.com',
      courseTitle: course.title,
    });

    mockPayUVerification({
      txnid,
      status: 'success',
    });

    const firstRes = await submitPayUWebhook(webhookData);

    expect(firstRes.status).toBe(200);

    mockPayUVerification({
      txnid,
      status: 'success',
    });

    const secondRes = await submitPayUWebhook(webhookData);

    expect(secondRes.status).toBe(200);

    const payment = await Payment.findOne({ txnid });

    expect(payment.status).toBe('paid');

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

  it('marks a failed webhook payment without enrollment or earning', async () => {
    const instructor = await registerUser(
      'instructor',
      'webhook-failed-instructor@test.com'
    );

    const student = await registerUser(
      'student',
      'webhook-failed-student@test.com'
    );

    const course = await createPublishedCourse(
      instructor.userId
    );

    const orderRes = await createOrder(
      student.token,
      course._id
    );

    const txnid = orderRes.body.txnid;

    const webhookData = createCallbackData({
      txnid,
      studentEmail: 'webhook-failed-student@test.com',
      courseTitle: course.title,
      status: 'failure',
    });

    mockPayUVerification({
      txnid,
      status: 'failure',
    });

    const res = await submitPayUWebhook(webhookData);

    expect(res.status).toBe(200);

    const payment = await Payment.findOne({ txnid });

    expect(payment.status).toBe('failed');
    expect(payment.payuStatus).toBe('failure');

    expect(
      await Enrollment.countDocuments()
    ).toBe(0);

    expect(
      await Earning.countDocuments()
    ).toBe(0);
  });

  it('keeps a pending webhook payment without enrollment or earning', async () => {
    const instructor = await registerUser(
      'instructor',
      'webhook-pending-instructor@test.com'
    );

    const student = await registerUser(
      'student',
      'webhook-pending-student@test.com'
    );

    const course = await createPublishedCourse(
      instructor.userId
    );

    const orderRes = await createOrder(
      student.token,
      course._id
    );

    const txnid = orderRes.body.txnid;

    const webhookData = createCallbackData({
      txnid,
      studentEmail: 'webhook-pending-student@test.com',
      courseTitle: course.title,
      status: 'pending',
    });

    mockPayUVerification({
      txnid,
      status: 'pending',
    });

    const res = await submitPayUWebhook(webhookData);

    expect(res.status).toBe(200);

    const payment = await Payment.findOne({ txnid });

    expect(payment.status).toBe('pending');
    expect(payment.payuStatus).toBe('pending');

    expect(
      await Enrollment.countDocuments()
    ).toBe(0);

    expect(
      await Earning.countDocuments()
    ).toBe(0);
  });

  it('rejects a webhook with an invalid reverse hash', async () => {
    const instructor = await registerUser(
      'instructor',
      'webhook-invalid-instructor@test.com'
    );

    const student = await registerUser(
      'student',
      'webhook-invalid-student@test.com'
    );

    const course = await createPublishedCourse(
      instructor.userId
    );

    const orderRes = await createOrder(
      student.token,
      course._id
    );

    const txnid = orderRes.body.txnid;

    const webhookData = createCallbackData({
      txnid,
      studentEmail: 'webhook-invalid-student@test.com',
      courseTitle: course.title,
      validHash: false,
    });

    const res = await submitPayUWebhook(webhookData);

    expect(res.status).toBe(400);

    expect(res.body.message).toBe(
      'PayU response hash verification failed.'
    );

    const payment = await Payment.findOne({ txnid });

    expect(payment.status).toBe('created');

    expect(
      await Enrollment.countDocuments()
    ).toBe(0);

    expect(
      await Earning.countDocuments()
    ).toBe(0);
  });

  it('does not downgrade an already-paid payment after a failure webhook', async () => {
    const instructor = await registerUser(
      'instructor',
      'webhook-downgrade-instructor@test.com'
    );

    const student = await registerUser(
      'student',
      'webhook-downgrade-student@test.com'
    );

    const course = await createPublishedCourse(
      instructor.userId
    );

    const orderRes = await createOrder(
      student.token,
      course._id
    );

    const txnid = orderRes.body.txnid;

    const successData = createCallbackData({
      txnid,
      studentEmail: 'webhook-downgrade-student@test.com',
      courseTitle: course.title,
      status: 'success',
    });

    mockPayUVerification({
      txnid,
      status: 'success',
    });

    const successRes = await submitPayUWebhook(successData);

    expect(successRes.status).toBe(200);

    const failureData = createCallbackData({
      txnid,
      studentEmail: 'webhook-downgrade-student@test.com',
      courseTitle: course.title,
      status: 'failure',
    });

    mockPayUVerification({
      txnid,
      status: 'failure',
    });

    const failureRes = await submitPayUWebhook(failureData);

    expect(failureRes.status).toBe(200);

    const payment = await Payment.findOne({ txnid });

    expect(payment.status).toBe('paid');

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

describe('Payment Status API', () => {
  it('rejects payment status access without authentication', async () => {
    const res = await request(app)
      .get('/api/payments/TEST-TXN-123/status');

    expect(res.status).toBe(401);
  });

  it('returns payment status to the student who owns the payment', async () => {
    const instructor = await registerUser(
      'instructor',
      'status-instructor@test.com'
    );

    const student = await registerUser(
      'student',
      'status-student@test.com'
    );

    const course = await createPublishedCourse(
      instructor.userId
    );

    const orderRes = await createOrder(
      student.token,
      course._id
    );

    const txnid = orderRes.body.txnid;

    const res = await request(app)
      .get(`/api/payments/${encodeURIComponent(txnid)}/status`)
      .set('Authorization', `Bearer ${student.token}`);

    expect(res.status).toBe(200);

    expect(res.body.payment).toBeDefined();
    expect(res.body.payment.txnid).toBe(txnid);
    expect(res.body.payment.amount).toBe(99900);
    expect(res.body.payment.currency).toBe('INR');
    expect(res.body.payment.status).toBe('created');
    expect(res.body.payment.course.title).toBe(
      course.title
    );

    // Sensitive merchant credentials must never be exposed.
    expect(res.body.payment.hash).toBeUndefined();
    expect(res.body.payment.salt).toBeUndefined();
    expect(res.body.payment.user).toBeUndefined();
  });

  it('prevents another student from accessing someone else payment status', async () => {
    const instructor = await registerUser(
      'instructor',
      'ownership-instructor@test.com'
    );

    const studentOne = await registerUser(
      'student',
      'owner-student@test.com'
    );

    const studentTwo = await registerUser(
      'student',
      'other-student@test.com'
    );

    const course = await createPublishedCourse(
      instructor.userId
    );

    const orderRes = await createOrder(
      studentOne.token,
      course._id
    );

    const txnid = orderRes.body.txnid;

    const res = await request(app)
      .get(`/api/payments/${encodeURIComponent(txnid)}/status`)
      .set('Authorization', `Bearer ${studentTwo.token}`);

    expect(res.status).toBe(404);

    expect(res.body.message).toBe('Payment not found.');
  });

  it('returns 404 for a payment transaction that does not exist', async () => {
    const student = await registerUser(
      'student',
      'missing-status-student@test.com'
    );

    const res = await request(app)
      .get('/api/payments/UNKNOWN-TXN-123/status')
      .set('Authorization', `Bearer ${student.token}`);

    expect(res.status).toBe(404);
  });
});
