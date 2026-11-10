
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import lessonRoutes from './routes/lessonRoutes.js';
import studentLessonRoutes from './routes/studentLessonRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import quizRoutes from './routes/quizRoutes.js';

const app = express();

app.use(helmet());

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

app.use(morgan('dev'));

// Phase 4: Payment callback route will be configured here
// before express.json(), according to the selected PayU integration.

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

// Student lesson playback routes
app.use('/api/student/lessons', studentLessonRoutes);

// Instructor lesson video upload routes
app.use('/api/lessons', lessonRoutes);

// Lesson progress routes
app.use('/api/progress', progressRoutes);

// Quiz routes
app.use('/api', quizRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    message: err.message || 'Server error',
  });
});

export default app;
