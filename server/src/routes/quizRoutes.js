
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

const router = express.Router();

// Instructor: Create a quiz.
router.post(
  '/quizzes',
  protect,
  requireRole('instructor'),
  createQuiz
);

// Instructor: Get all quizzes for an owned course.
router.get(
  '/courses/:id/quizzes',
  protect,
  requireRole('instructor'),
  getCourseQuizzes
);

// Instructor: Update a quiz.
router.put(
  '/quizzes/:id',
  protect,
  requireRole('instructor'),
  updateQuiz
);

// Instructor: Delete a quiz.
router.delete(
  '/quizzes/:id',
  protect,
  requireRole('instructor'),
  deleteQuiz
);

// Student: Get a quiz after enrollment verification.
router.get(
  '/quizzes/:id',
  protect,
  requireRole('student'),
  getStudentQuiz
);

// Student: Submit quiz and receive server-calculated results.
router.post(
  '/quizzes/:id/submit',
  protect,
  requireRole('student'),
  submitQuiz
);

export default router;
