
import mongoose from 'mongoose';

import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Enrollment from '../models/Enrollment.js';
import LessonProgress from '../models/LessonProgress.js';

import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { recalcProgress } from '../services/progressService.js';

const getAccessibleLesson = async (lessonId, user) => {
  if (!mongoose.isValidObjectId(lessonId)) {
    throw new ApiError(400, 'Invalid lesson ID');
  }

  const lesson = await Lesson.findById(lessonId);

  if (!lesson) {
    throw new ApiError(404, 'Lesson not found');
  }

  const course = await Course.findOne({
    _id: lesson.course,
    status: 'published',
  });

  if (!course) {
    throw new ApiError(404, 'Published course not found');
  }

  const isInstructor =
    String(course.instructor) === String(user._id);

  const isAdmin = user.role === 'admin';

  const isEnrolled =
    user.role === 'student' &&
    Boolean(
      await Enrollment.exists({
        user: user._id,
        course: course._id,
      })
    );

  const hasAccess =
    lesson.isPreview ||
    isEnrolled ||
    isInstructor ||
    isAdmin;

  if (!hasAccess) {
    throw new ApiError(
      403,
      'Please enroll in this course to access this lesson'
    );
  }

  return { lesson, course };
};

// PUT /api/progress/lessons/:id
export const updateLessonProgress = asyncHandler(
  async (req, res) => {
    const { watchedSeconds, duration } = req.body;

    if (
      typeof watchedSeconds !== 'number' ||
      !Number.isFinite(watchedSeconds) ||
      watchedSeconds < 0
    ) {
      throw new ApiError(400, 'Invalid watchedSeconds value');
    }

    if (
      typeof duration !== 'number' ||
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      throw new ApiError(400, 'Invalid duration value');
    }

    const { lesson, course } = await getAccessibleLesson(
      req.params.id,
      req.user
    );

    const completed =
      watchedSeconds >= duration * 0.9;

    const progress = await LessonProgress.findOneAndUpdate(
      {
        user: req.user._id,
        lesson: lesson._id,
      },
      {
        $set: {
          course: course._id,
          watchedSeconds,
          completed,
        },
      },
      {
        returnDocument: 'after',
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    if (req.user.role === 'student') {
      await recalcProgress(req.user._id, course._id);
    }

    res.json({
      message: 'Lesson progress saved successfully',
      progress,
    });
  }
);

// GET /api/progress/lessons/:id
export const getLessonProgress = asyncHandler(
  async (req, res) => {
    const { lesson, course } = await getAccessibleLesson(
      req.params.id,
      req.user
    );

    const progress = await LessonProgress.findOne({
      user: req.user._id,
      lesson: lesson._id,
      course: course._id,
    });

    res.json({
      watchedSeconds: progress?.watchedSeconds ?? 0,
      completed: progress?.completed ?? false,
    });
  }
);
