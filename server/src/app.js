
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import lessonRoutes from './routes/lessonRoutes.js';

const app = express();

app.use(helmet());

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

app.use(morgan('dev'));

// Phase 4: Razorpay webhook route goes here,
// before express.json()

app.use(express.json());
app.use(cookieParser());

// Health check API
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Course management routes
app.use('/api/courses', courseRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Lesson video upload routes
app.use('/api/lessons', lessonRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    message: err.message || 'Server error',
  });
});

export default app;
