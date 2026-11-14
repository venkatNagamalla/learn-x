
import mongoose from 'mongoose';

import Earning from '../models/Earning.js';

// PATCH /api/admin/earnings/:id/payout
export const markEarningAsPaid = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: 'Invalid earning ID.',
      });
    }

    // Atomically update only pending earnings.
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
    ).populate('instructor', 'name email')
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
