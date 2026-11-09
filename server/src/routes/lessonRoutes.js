
import express from 'express';

import {
  protect,
  requireRole,
} from '../middleware/auth.js';

import {
  createLessonUploadUrl,
  completeLessonUpload,
  getLessonProcessingStatus,
  retryLessonProcessing,
} from '../controllers/lessonVideoController.js';

const router = express.Router();

// All video routes require instructor authentication
router.use(protect, requireRole('instructor'));

// Generate a presigned S3 upload URL
router.post('/:id/upload-url', createLessonUploadUrl);

// Verify uploaded video and queue processing
router.post('/:id/upload-complete', completeLessonUpload);

// Get current video-processing status
router.get('/:id/status', getLessonProcessingStatus);

// Retry failed video processing
router.post('/:id/retry', retryLessonProcessing);

export default router;
