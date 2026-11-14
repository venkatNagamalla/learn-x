
import express from 'express';

import {
  protect,
  requireRole,
} from '../middleware/auth.js';

import { requireEnrollment } from '../middleware/requireEnrollment.js';

import {
  getStudentLessonPlayback,
} from '../controllers/studentLessonController.js';

const router = express.Router();

router.use(
  protect,
  requireRole('student', 'instructor', 'admin')
);

// Preview lessons remain accessible without enrollment.
router.get(
  '/:id/playback',
  requireEnrollment({
    resource: 'lesson',
    allowPreview: true,
  }),
  getStudentLessonPlayback
);

export default router;
