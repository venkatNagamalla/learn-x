import express from 'express';

import {
  register,
  login,
  refresh,
  logout,
  getMe,
} from '../controllers/authController.js';

import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/authLimiter.js';

const router = express.Router();

// Public routes
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);

// Protected route
router.get('/me', protect, getMe);

export default router;