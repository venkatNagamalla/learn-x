
import mongoose from 'mongoose';

import Earning from '../models/Earning.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';

// GET /api/earnings/summary
export const getEarningsSummary = async (req, res, next) => {
  try {
    const instructorId = new mongoose.Types.ObjectId(
      req.user._id
    );

    const [result] = await Earning.aggregate([
      {
        $match: {
          instructor: instructorId,
        },
      },
      {
        $group: {
          _id: null,
          totalGross: { $sum: '$gross' },
          totalPlatformFee: { $sum: '$platformFee' },
          totalNet: { $sum: '$net' },
          pendingPayout: {
            $sum: {
              $cond: [
                { $eq: ['$payoutStatus', 'pending'] },
                '$net',
                0,
              ],
            },
          },
          paidPayout: {
            $sum: {
              $cond: [
                { $eq: ['$payoutStatus', 'paid'] },
                '$net',
                0,
              ],
            },
          },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);

    const courseIds = await Course.distinct('_id', {
      instructor: instructorId,
    });

    const [students, totalCourses] = await Promise.all([
      Enrollment.distinct('user', {
        course: { $in: courseIds },
      }),
      Course.countDocuments({
        instructor: instructorId,
      }),
    ]);

    res.json({
      summary: {
        ...(result || {
          totalGross: 0,
          totalPlatformFee: 0,
          totalNet: 0,
          pendingPayout: 0,
          paidPayout: 0,
          totalTransactions: 0,
        }),
        totalStudents: students.length,
        totalCourses,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/earnings/monthly
export const getMonthlyEarnings = async (req, res, next) => {
  try {
    const instructorId = new mongoose.Types.ObjectId(
      req.user._id
    );

    const earnings = await Earning.aggregate([
      {
        $match: {
          instructor: instructorId,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          gross: { $sum: '$gross' },
          platformFee: { $sum: '$platformFee' },
          net: { $sum: '$net' },
          transactions: { $sum: 1 },
        },
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
        },
      },
    ]);

    res.json({ items: earnings });
  } catch (error) {
    next(error);
  }
};

// GET /api/earnings/courses
export const getInstructorCourseStats = async (
  req,
  res,
  next
) => {
  try {
    const instructorId = new mongoose.Types.ObjectId(
      req.user._id
    );

    const courses = await Course.find({
      instructor: instructorId,
    })
      .select('title thumbnail status ratingAvg ratingCount')
      .sort({ createdAt: -1 })
      .lean();

    const courseIds = courses.map((course) => course._id);

    const [earningStats, enrollmentStats] = await Promise.all([
      Earning.aggregate([
        {
          $match: {
            instructor: instructorId,
            course: { $in: courseIds },
          },
        },
        {
          $group: {
            _id: '$course',
            grossRevenue: { $sum: '$gross' },
            netRevenue: { $sum: '$net' },
            sales: { $sum: 1 },
          },
        },
      ]),

      Enrollment.aggregate([
        {
          $match: {
            course: { $in: courseIds },
          },
        },
        {
          $group: {
            _id: '$course',
            students: { $sum: 1 },
          },
        },
      ]),
    ]);

    const earningsByCourse = new Map(
      earningStats.map((item) => [
        String(item._id),
        item,
      ])
    );

    const enrollmentsByCourse = new Map(
      enrollmentStats.map((item) => [
        String(item._id),
        item.students,
      ])
    );

    const items = courses.map((course) => {
      const id = String(course._id);
      const earning = earningsByCourse.get(id);

      return {
        _id: course._id,
        title: course.title,
        thumbnail: course.thumbnail,
        status: course.status,
        students: enrollmentsByCourse.get(id) || 0,
        grossRevenue: earning?.grossRevenue || 0,
        netRevenue: earning?.netRevenue || 0,
        sales: earning?.sales || 0,
        ratingAvg: course.ratingAvg || 0,
        ratingCount: course.ratingCount || 0,
      };
    });

    res.json({
      items,
      total: items.length,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/earnings/transactions
export const getEarningsTransactions = async (
  req,
  res,
  next
) => {
  try {
    const instructorId = req.user._id;

    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      50,
      Math.max(
        1,
        Number.parseInt(req.query.limit, 10) || 10
      )
    );

    const { payoutStatus } = req.query;

    if (
      payoutStatus &&
      !['pending', 'paid'].includes(payoutStatus)
    ) {
      return res.status(400).json({
        message: 'Invalid payout status.',
      });
    }

    const skip = (page - 1) * limit;

    const filter = {
      instructor: instructorId,
    };

    if (payoutStatus) {
      filter.payoutStatus = payoutStatus;
    }

    const [items, total] = await Promise.all([
      Earning.find(filter)
        .populate('course', 'title thumbnail')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Earning.countDocuments(filter),
    ]);

    res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};
