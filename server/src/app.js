import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';

const app = express();

app.use(helmet());

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
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

// Routes will be mounted here as we build them.

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    message: err.message || 'Server error'
  });
});

export default app;