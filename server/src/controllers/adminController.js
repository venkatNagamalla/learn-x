
import User from '../models/User.js';
import Course from '../models/Course.js';
import Earning from '../models/Earning.js';

// GET /api/admin/summary
export const getAdminSummary = async (req, res, next) => {
  try {
    const [
      students,
      instructors,
      admins,
      drafts,
      pendingCourses,
      published,
      earningsSummary,
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'instructor' }),
      User.countDocuments({ role: 'admin' }),

      Course.countDocuments({ status: 'draft' }),
      Course.countDocuments({ status: 'pending' }),
      Course.countDocuments({ status: 'published' }),

      Earning.aggregate([
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$gross' },
            totalPlatformFees: { $sum: '$platformFee' },
            totalTransactions: { $sum: 1 },
          },
        },
      ]),
    ]);

    const totals = earningsSummary[0] || {
      totalSales: 0,
      totalPlatformFees: 0,
      totalTransactions: 0,
    };

    return res.json({
      summary: {
        users: {
          students,
          instructors,
          admins,
          total: students + instructors + admins,
        },
        courses: {
          draft: drafts,
          pending: pendingCourses,
          published,
          total: drafts + pendingCourses + published,
        },
        totalSales: totals.totalSales,
        totalPlatformFees: totals.totalPlatformFees,
        totalTransactions: totals.totalTransactions,
      },
    });
  } catch (error) {
    next(error);
  }
};
