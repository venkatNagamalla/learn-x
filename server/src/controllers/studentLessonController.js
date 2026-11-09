
import mongoose from 'mongoose';

import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';

import { createSignedLessonAccess } from '../config/cloudfront.js';

import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

// GET /api/student/lessons/:id/playback
export const getStudentLessonPlayback = asyncHandler(
  async (req, res) => {
    const { id } = req.params;

    // Validate lesson ID
    if (!mongoose.isValidObjectId(id)) {
      throw new ApiError(400, 'Invalid lesson ID');
    }

    // Find lesson
    const lesson = await Lesson.findById(id);

    if (!lesson) {
      throw new ApiError(404, 'Lesson not found');
    }

    // Only published courses can be watched
    const course = await Course.findOne({
      _id: lesson.course,
      status: 'published',
    });

    if (!course) {
      throw new ApiError(404, 'Published course not found');
    }

    // Paid course access:
    // Until enrollment is implemented, only preview lessons
    // are available in paid courses.
    if (course.price > 0 && !lesson.isPreview) {
      throw new ApiError(
        403,
        'Please purchase this course to watch this lesson'
      );
    }

    // Video must finish processing before playback
    if (lesson.processingStatus !== 'ready') {
      throw new ApiError(
        409,
        'This lesson video is not ready for playback'
      );
    }

    // Verify that the stored HLS path matches this lesson.
    const expectedHlsPath =
      `lessons/${lesson._id}/master.m3u8`;

    if (lesson.hlsPath !== expectedHlsPath) {
      throw new ApiError(
        409,
        'Lesson video path is unavailable'
      );
    }

    // Generate a signed URL for the complete lesson folder
    const playback = createSignedLessonAccess(
      lesson._id.toString()
    );

    res.json({
      message: 'Playback access generated successfully',

      lesson: {
        _id: lesson._id,
        title: lesson.title,
        description: lesson.description,
        duration: lesson.duration,
        isPreview: lesson.isPreview,
      },

      playback,
    });
  }
);
