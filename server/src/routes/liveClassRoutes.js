
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

import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All live-class routes require authentication.
router.use(protect);

// Instructor creates a live class.
router.post(
  '/',
  requireRole('instructor'),
  createLiveClass
);

// Students and instructors can view their upcoming classes.
router.get(
  '/upcoming',
  requireRole('student', 'instructor'),
  getUpcomingLiveClasses
);

// Instructor views saved chat history after the class ends.
router.get(
  '/:id/history',
  requireRole('instructor'),
  getLiveClassHistory
);

// Instructor starts a class.
router.patch(
  '/:id/start',
  requireRole('instructor'),
  startLiveClass
);

// Instructor ends a class.
router.patch(
  '/:id/end',
  requireRole('instructor'),
  endLiveClass
);

// Only the owning instructor can save class messages.
router.post(
  '/:id/messages',
  requireRole('instructor'),
  saveLiveClassMessage
);

// Generate a room-access token.
router.post(
  '/:id/token',
  requireRole('student', 'instructor'),
  getLiveClassToken
);

export default router;
