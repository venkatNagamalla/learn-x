
import mongoose from 'mongoose';
import Earning from '../models/Earning.js';

// GET /api/admin/earnings
export const getAdminEarnings = async (req, res, next) => {
  try {
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

    const filter = {};

    if (payoutStatus) {
      filter.payoutStatus = payoutStatus;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Earning.find(filter)
        .populate('instructor', 'name email')
        .populate('course', 'title')
        .populate('payment', 'status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Earning.countDocuments(filter),
    ]);

    return res.json({
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

// PATCH /api/admin/earnings/:id/payout
export const markEarningAsPaid = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: 'Invalid earning ID.',
      });
    }

    const earning = await Earning.findOneAndUpdate(
      {
        _id: id,
        payoutStatus: 'pending',
      },
      {
        $set: {
          payoutStatus: 'paid',
          paidAt: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate('instructor', 'name email')
      .populate('course', 'title');

    if (!earning) {
      const existingEarning = await Earning.findById(id);

      if (!existingEarning) {
        return res.status(404).json({
          message: 'Earning not found.',
        });
      }

      if (existingEarning.payoutStatus === 'paid') {
        return res.status(409).json({
          message: 'This earning has already been paid.',
          payoutStatus: 'paid',
          paidAt: existingEarning.paidAt,
        });
      }

      return res.status(409).json({
        message: 'Earning payout could not be updated.',
      });
    }

    return res.json({
      message: 'Earning marked as paid successfully.',
      earning,
    });
  } catch (error) {
    next(error);
  }
};
