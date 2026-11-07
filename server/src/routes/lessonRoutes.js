
import express from 'express';

import {
  protect,
  requireRole,
} from '../middleware/auth.js';

import {
  createLessonUploadUrl,
  completeLessonUpload,
} from '../controllers/lessonVideoController.js';

const router = express.Router();

// All video upload routes require instructor authentication
router.use(protect, requireRole('instructor'));

// Generate a presigned S3 upload URL
router.post('/:id/upload-url', createLessonUploadUrl);

// Verify upload and add video-processing job
router.post('/:id/upload-complete', completeLessonUpload);

export default router;
