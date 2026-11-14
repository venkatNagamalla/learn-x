
import express from 'express';

import {
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getCourseQuizzes,
  getStudentQuiz,
  submitQuiz,
} from '../controllers/quizController.js';

import {
  protect,
  requireRole,
} from '../middleware/auth.js';

import { requireEnrollment } from '../middleware/requireEnrollment.js';

const router = express.Router();

// Instructor quiz management.
router.post(
  '/quizzes',
  protect,
  requireRole('instructor'),
  createQuiz
);

router.get(
  '/courses/:id/quizzes',
  protect,
  requireRole('instructor'),
  getCourseQuizzes
);

router.put(
  '/quizzes/:id',
  protect,
  requireRole('instructor'),
  updateQuiz
);

router.delete(
  '/quizzes/:id',
  protect,
  requireRole('instructor'),
  deleteQuiz
);

// Student quiz access requires enrollment.
router.get(
  '/quizzes/:id',
  protect,
  requireRole('student', 'instructor', 'admin'),
  requireEnrollment({ resource: 'quiz' }),
  getStudentQuiz
);

router.post(
  '/quizzes/:id/submit',
  protect,
  requireRole('student'),
  requireEnrollment({ resource: 'quiz' }),
  submitQuiz
);

export default router;
