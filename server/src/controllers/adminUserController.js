
import mongoose from 'mongoose';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

// GET /api/admin/users
export const getAdminUsers = asyncHandler(async (req, res) => {
  const {
    role,
    search,
    page = 1,
    limit = 10,
  } = req.query;

  const pageNumber = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 10));

  const filter = {};

  if (role) {
    if (!['student', 'instructor', 'admin'].includes(role)) {
      throw new ApiError(400, 'Invalid user role');
    }

    filter.role = role;
  }

  if (search?.trim()) {
    const escapedSearch = search.trim().replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

    filter.$or = [
      { name: { $regex: escapedSearch, $options: 'i' } },
      { email: { $regex: escapedSearch, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('name email role avatar isBlocked createdAt')
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize),

    User.countDocuments(filter),
  ]);

  res.json({
    items: users,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      pages: Math.ceil(total / pageSize),
    },
  });
});

// PATCH /api/admin/users/:id/block
export const updateUserBlockStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isBlocked } = req.body;

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'Invalid user ID');
  }

  if (typeof isBlocked !== 'boolean') {
    throw new ApiError(400, 'isBlocked must be true or false');
  }

  if (req.user._id.toString() === id) {
    throw new ApiError(400, 'You cannot block or unblock your own account');
  }

  const user = await User.findByIdAndUpdate(
    id,
    { $set: { isBlocked } },
    {
      new: true,
      runValidators: true,
    }
  ).select('name email role isBlocked');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.json({
    message: isBlocked
      ? 'User blocked successfully'
      : 'User unblocked successfully',
    user,
  });
});
