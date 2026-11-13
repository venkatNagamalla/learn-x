
import rateLimit from 'express-rate-limit';

const authLimit = Number(process.env.AUTH_RATE_LIMIT) || 20;

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: authLimit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    message: 'Too many requests. Please try again after 15 minutes.',
  },
});
