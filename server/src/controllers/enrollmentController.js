
import Enrollment from '../models/Enrollment.js';

import { asyncHandler } from '../utils/asyncHandler.js';

// GET /api/enrollments/mine
export const getMyEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({
    user: req.user._id,
  })
    .select(
      'course enrolledAt lessonProgress quizProgress completedAt'
    )
    .populate({
      path: 'course',
      select: 'title description thumbnail category level price instructor status',
      populate: {
        path: 'instructor',
        select: 'name',
      },
    })
    .sort({ enrolledAt: -1 })
    .lean();

  const items = enrollments
    .filter((enrollment) => enrollment.course)
    .map((enrollment) => ({
      enrollmentId: enrollment._id,
      enrolledAt: enrollment.enrolledAt,
      lessonProgress: enrollment.lessonProgress,
      quizProgress: enrollment.quizProgress,
      completedAt: enrollment.completedAt,
      course: enrollment.course,
    }));

  res.status(200).json({
    items,
    total: items.length,
  });
});
