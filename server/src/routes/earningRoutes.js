
import express from 'express';

import {
  getEarningsSummary,
  getMonthlyEarnings,
  getEarningsTransactions,
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

// GET /api/earnings/transactions
router.get('/transactions', getEarningsTransactions);

export default router;
