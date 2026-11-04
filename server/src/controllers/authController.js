import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import jwt from 'jsonwebtoken';
import {
  signAccess,
  signRefresh,
  cookieOpts,
} from '../utils/tokenUtils.js';

// POST /register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email and password are required');
  }

  if (!['student', 'instructor'].includes(role)) {
    throw new ApiError(400, 'Invalid role');
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (await User.findOne({ email: normalizedEmail })) {
    throw new ApiError(409, 'Email already used');
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    role,
    passwordHash: await bcrypt.hash(password, 10),
  });

  res
    .cookie('refreshToken', signRefresh(user), cookieOpts)
    .status(201)
    .json({
      accessToken: signAccess(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
});

// POST /login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const user = await User.findOne({
    email: email.trim().toLowerCase(),
  }).select('+passwordHash');

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  res
    .cookie('refreshToken', signRefresh(user), cookieOpts)
    .status(200)
    .json({
      accessToken: signAccess(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
});

// POST /refresh
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    throw new ApiError(401, 'Refresh token missing');
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.id);

  if (!user) {
    throw new ApiError(401, 'User not found');
  }

  return res.status(200).json({
    accessToken: signAccess(user),
  });
});

// POST /logout
export const logout = (req, res) => {
  res.clearCookie('refreshToken', cookieOpts);

  return res.status(200).json({
    message: 'Logged out successfully',
  });
};

// GET /me
export const getMe = asyncHandler(async (req, res) => {
  return res.status(200).json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      avatar: req.user.avatar,
    },
  });
});