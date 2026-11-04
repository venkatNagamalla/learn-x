import express from 'express';

import {
  getPendingCourses,
  updateCourseStatus,
} from '../controllers/courseController.js';

import {
  protect,
  requireRole,
} from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect, requireRole('admin'));

// GET /api/admin/courses/pending
router.get('/courses/pending', getPendingCourses);

// PATCH /api/admin/courses/:id/status
router.patch('/courses/:id/status', updateCourseStatus);

export default router;