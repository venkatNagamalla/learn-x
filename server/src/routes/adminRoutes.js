
import express from 'express';

import {
  getPendingCourses,
  updateCourseStatus,
} from '../controllers/courseController.js';

import {
  getAdminEarnings,
  markEarningAsPaid,
} from '../controllers/adminEarningController.js';

import {
  getAdminSummary,
} from '../controllers/adminController.js';

import {
  getAdminUsers,
  updateUserBlockStatus,
} from '../controllers/adminUserController.js';

import {
  protect,
  requireRole,
} from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and admin role.
router.use(protect, requireRole('admin'));

// Dashboard summary
router.get('/summary', getAdminSummary);

// User management
router.get('/users', getAdminUsers);
router.patch('/users/:id/block', updateUserBlockStatus);

// Course approvals
router.get('/courses/pending', getPendingCourses);
router.patch('/courses/:id/status', updateCourseStatus);

// Instructor earnings and payouts
router.get('/earnings', getAdminEarnings);
router.patch('/earnings/:id/payout', markEarningAsPaid);

export default router;
