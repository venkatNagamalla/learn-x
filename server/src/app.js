
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
import liveClassRoutes from './routes/liveClassRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import earningRoutes from './routes/earningRoutes.js';

const app = express();

// Allow PayU Hosted Checkout form submissions.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        formAction: [
          "'self'",
          'https://test.payu.in',
          'https://secure.payu.in',
        ],
      },
    },
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(morgan('dev'));

// PayU Hosted Checkout callback parsing.
app.use(express.urlencoded({ extended: false }));

// Normal JSON API request parsing.
app.use(express.json());

app.use(cookieParser());

// Health check API.
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/earnings', earningRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/student/lessons', studentLessonRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api', quizRoutes);
app.use('/api/live', liveClassRoutes);
app.use('/api/certificates', certificateRoutes);

// Global error handler.
app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    message: err.message || 'Server error',
  });
});

export default app;
