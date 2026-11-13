
import express from 'express';

import {
  initiatePayUPayment,
  handlePayUCallback,
  handlePayUWebhook,
  getPaymentStatus,
} from '../controllers/paymentController.js';

import {
  protect,
  requireRole,
} from '../middleware/auth.js';

const router = express.Router();

// Student: Create a payment attempt or enroll in a free course.
router.post(
  '/create-order',
  protect,
  requireRole('student'),
  initiatePayUPayment
);

// PayU: Browser success/failure return.
router.post(
  '/payu/callback',
  handlePayUCallback
);

// PayU: Server-to-server payment notification.
router.post(
  '/payu/webhook',
  handlePayUWebhook
);

// Student: Fetch their own payment status.
router.get(
  '/:txnid/status',
  protect,
  requireRole('student'),
  getPaymentStatus
);

export default router;
