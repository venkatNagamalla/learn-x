
import mongoose from 'mongoose';

import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Quiz from '../models/Quiz.js';
import LiveClass from '../models/LiveClass.js';

import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import Enrollment from '../models/Enrollment.js';

// Supported resources: course, lesson, quiz, liveClass.
export const requireEnrollment = ({
  resource = 'course',
  allowPreview = false,
} = {}) =>
  asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      throw new ApiError(400, `Invalid ${resource} ID`);
    }

    let course;
    let resourceDocument;

    switch (resource) {
      case 'course':
        course = await Course.findById(id);
        resourceDocument = course;
        break;

      case 'lesson':
        resourceDocument = await Lesson.findById(id);

        if (resourceDocument) {
          course = await Course.findById(resourceDocument.course);
        }
        break;

      case 'quiz':
        resourceDocument = await Quiz.findById(id);

        if (resourceDocument) {
          course = await Course.findById(resourceDocument.course);
        }
        break;

      case 'liveClass':
        resourceDocument = await LiveClass.findById(id);

        if (resourceDocument) {
          course = await Course.findById(resourceDocument.course);
        }
        break;

      default:
        throw new ApiError(500, 'Unsupported enrollment resource');
    }

    if (!resourceDocument || !course) {
      throw new ApiError(404, `${resource} or its course not found`);
    }

    const isAdmin = req.user.role === 'admin';

    const isInstructor =
      req.user.role === 'instructor' &&
      String(course.instructor) === String(req.user._id);

    // Free preview is allowed only for lesson resources.
    const isPreview =
      allowPreview &&
      resource === 'lesson' &&
      resourceDocument.isPreview === true;

    if (isAdmin || isInstructor || isPreview) {
      req.course = course;
      req.resource = resourceDocument;
      return next();
    }

    if (req.user.role !== 'student') {
      throw new ApiError(403, 'Access denied');
    }

    const enrolled = await Enrollment.exists({
      user: req.user._id,
      course: course._id,
    });

    if (!enrolled) {
      throw new ApiError(
        403,
        'Please enroll in this course to access this content'
      );
    }

    req.course = course;
    req.resource = resourceDocument;

    next();
  });
