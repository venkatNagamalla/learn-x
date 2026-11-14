
import mongoose from 'mongoose';

import Earning from '../models/Earning.js';

// GET /api/earnings/summary
export const getEarningsSummary = async (req, res, next) => {
  try {
    const instructorId = req.user._id;

    const [result] = await Earning.aggregate([
      {
        $match: {
          instructor: new mongoose.Types.ObjectId(
            instructorId
          ),
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

    res.json({
      summary: result || {
        totalGross: 0,
        totalPlatformFee: 0,
        totalNet: 0,
        pendingPayout: 0,
        paidPayout: 0,
        totalTransactions: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/earnings/monthly
export const getMonthlyEarnings = async (req, res, next) => {
  try {
    const instructorId = req.user._id;

    const earnings = await Earning.aggregate([
      {
        $match: {
          instructor: new mongoose.Types.ObjectId(
            instructorId
          ),
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

    const skip = (page - 1) * limit;

    const filter = {
      instructor: instructorId,
    };

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
