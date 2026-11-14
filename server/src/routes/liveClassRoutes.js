
import express from 'express';

import {
  createLiveClass,
  getUpcomingLiveClasses,
  getLiveClassHistory,
  startLiveClass,
  endLiveClass,
  saveLiveClassMessage,
  getLiveClassToken,
} from '../controllers/liveClassController.js';

import {
  protect,
  requireRole,
} from '../middleware/auth.js';

import { requireEnrollment } from '../middleware/requireEnrollment.js';

const router = express.Router();

router.use(protect);

router.post(
  '/',
  requireRole('instructor'),
  createLiveClass
);

router.get(
  '/upcoming',
  requireRole('student', 'instructor'),
  getUpcomingLiveClasses
);

router.get(
  '/:id/history',
  requireRole('instructor'),
  getLiveClassHistory
);

router.patch(
  '/:id/start',
  requireRole('instructor'),
  startLiveClass
);

router.patch(
  '/:id/end',
  requireRole('instructor'),
  endLiveClass
);

router.post(
  '/:id/messages',
  requireRole('instructor'),
  saveLiveClassMessage
);

// Enrollment or course ownership is checked before token generation.
router.post(
  '/:id/token',
  requireRole('student', 'instructor'),
  requireEnrollment({ resource: 'liveClass' }),
  getLiveClassToken
);

export default router;
