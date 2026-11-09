
import express from 'express';

import {
  protect,
  requireRole,
} from '../middleware/auth.js';

import {
  updateLessonProgress,
  getLessonProgress,
} from '../controllers/progressController.js';

const router = express.Router();

// Only authenticated users can access lesson progress.
router.use(
  protect,
  requireRole('student', 'instructor', 'admin')
);

// Save lesson progress
router.put('/lessons/:id', updateLessonProgress);

// Get saved lesson progress
router.get('/lessons/:id', getLessonProgress);

export default router;
