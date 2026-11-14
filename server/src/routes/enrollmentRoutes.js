
import express from 'express';

import {
  protect,
  requireRole,
} from '../middleware/auth.js';

import {
  getMyEnrollments,
} from '../controllers/enrollmentController.js';

const router = express.Router();

// Only authenticated students can view their enrollments.
router.get(
  '/mine',
  protect,
  requireRole('student'),
  getMyEnrollments
);

export default router;
