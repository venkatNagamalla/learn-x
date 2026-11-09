
import express from 'express';

import {
  protect,
  requireRole,
} from '../middleware/auth.js';

import {
  getStudentLessonPlayback,
} from '../controllers/studentLessonController.js';

const router = express.Router();

// Only authenticated students, instructors, and admins
// can access the playback endpoint.
router.use(
  protect,
  requireRole('student', 'instructor', 'admin')
);

// Generate signed CloudFront playback access
router.get('/:id/playback', getStudentLessonPlayback);

export default router;
