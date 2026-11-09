
import express from 'express';

import {
  protect,
  requireRole,
} from '../middleware/auth.js';

import {
  getStudentLessonPlayback,
} from '../controllers/studentLessonController.js';

const router = express.Router();

// Only authenticated students can access playback
router.use(protect, requireRole('student'));

// Generate signed CloudFront playback access
router.get('/:id/playback', getStudentLessonPlayback);

export default router;
