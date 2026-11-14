
import express from 'express';

import {
  protect,
  requireRole,
} from '../middleware/auth.js';

import { requireEnrollment } from '../middleware/requireEnrollment.js';

import {
  updateLessonProgress,
  getLessonProgress,
} from '../controllers/progressController.js';

const router = express.Router();

router.use(
  protect,
  requireRole('student', 'instructor', 'admin')
);

// Preview lessons retain their existing access behavior.
router.put(
  '/lessons/:id',
  requireEnrollment({
    resource: 'lesson',
    allowPreview: true,
  }),
  updateLessonProgress
);

router.get(
  '/lessons/:id',
  requireEnrollment({
    resource: 'lesson',
    allowPreview: true,
  }),
  getLessonProgress
);

export default router;
