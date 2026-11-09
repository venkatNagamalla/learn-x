
import mongoose from 'mongoose';

import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Enrollment from '../models/Enrollment.js';

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

    const user = req.user;

    // Check whether the user is the instructor or admin
    const isInstructor =
      String(course.instructor) === String(user._id);

    const isAdmin = user.role === 'admin';

    // Check student enrollment
    const isEnrolled =
      user.role === 'student' &&
      Boolean(
        await Enrollment.exists({
          user: user._id,
          course: course._id,
        })
      );

    // Allow preview lessons, enrolled students,
    // course instructors, and administrators
    const hasAccess =
      lesson.isPreview ||
      isEnrolled ||
      isInstructor ||
      isAdmin;

    if (!hasAccess) {
      throw new ApiError(
        403,
        'Please enroll in this course to watch this lesson'
      );
    }

    // Video must finish processing before playback
    if (lesson.processingStatus !== 'ready') {
      throw new ApiError(
        409,
        'This lesson video is not ready for playback'
      );
    }

    // Verify stored HLS path
    const expectedHlsPath =
      `lessons/${lesson._id}/master.m3u8`;

    if (lesson.hlsPath !== expectedHlsPath) {
      throw new ApiError(
        409,
        'Lesson video path is unavailable'
      );
    }

    // Generate signed URL for the complete lesson folder
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
