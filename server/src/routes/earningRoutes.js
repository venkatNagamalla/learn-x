
import express from 'express';

import {
  getEarningsSummary,
  getMonthlyEarnings,
  getEarningsTransactions,
  getInstructorCourseStats,
} from '../controllers/earningController.js';

import {
  protect,
  requireRole,
} from '../middleware/auth.js';

const router = express.Router();

// All instructor earnings routes require authentication
// and the instructor role.
router.use(protect, requireRole('instructor'));

// GET /api/earnings/summary
router.get('/summary', getEarningsSummary);

// GET /api/earnings/monthly
router.get('/monthly', getMonthlyEarnings);

// GET /api/earnings/courses
router.get('/courses', getInstructorCourseStats);

// GET /api/earnings/transactions
// Optional filter: ?payoutStatus=pending or ?payoutStatus=paid
router.get('/transactions', getEarningsTransactions);

export default router;
