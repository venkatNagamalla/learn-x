
import mongoose from 'mongoose';

import Quiz from '../models/Quiz.js';
import Course from '../models/Course.js';
import Section from '../models/Section.js';
import Enrollment from '../models/Enrollment.js';
import QuizAttempt from '../models/QuizAttempt.js';

import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { recalcProgress } from '../services/progressService.js';

// Validate quiz questions before saving.
const validateQuestions = (questions) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    return 'A quiz must contain at least one question';
  }

  for (const question of questions) {
    if (!question.text?.trim()) {
      return 'Every question must have text';
    }

    if (!Array.isArray(question.options) || question.options.length < 2) {
      return 'Every question must have at least two options';
    }

    if (
      !Number.isInteger(question.correctIndex) ||
      question.correctIndex < 0 ||
      question.correctIndex >= question.options.length
    ) {
      return 'Each question must have a valid correct option';
    }
  }

  return null;
};

// Create a quiz (instructor only).
export const createQuiz = async (req, res) => {
  const {
    course: courseId,
    section: sectionId,
    title,
    passPercent,
    maxAttempts,
    questions,
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return res.status(400).json({ message: 'Valid course ID is required' });
  }

  const course = await Course.findOne({
    _id: courseId,
    instructor: req.user._id,
  });

  if (!course) {
    return res.status(404).json({
      message: 'Course not found or you are not the owner',
    });
  }

  if (sectionId) {
    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return res.status(400).json({ message: 'Invalid section ID' });
    }

    const section = await Section.findOne({
      _id: sectionId,
      course: courseId,
    });

    if (!section) {
      return res.status(400).json({
        message: 'Section does not belong to this course',
      });
    }
  }

  const validationError = validateQuestions(questions);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const quiz = await Quiz.create({
    course: courseId,
    section: sectionId || null,
    title,
    passPercent,
    maxAttempts,
    questions,
  });

  return res.status(201).json({
    message: 'Quiz created successfully',
    quiz,
  });
};

// Update an existing quiz (owner only).
export const updateQuiz = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid quiz ID' });
  }

  const quiz = await Quiz.findById(req.params.id);

  if (!quiz) {
    return res.status(404).json({ message: 'Quiz not found' });
  }

  const course = await Course.findOne({
    _id: quiz.course,
    instructor: req.user._id,
  });

  if (!course) {
    return res.status(403).json({
      message: 'You are not allowed to update this quiz',
    });
  }

  const { section, title, passPercent, maxAttempts, questions } = req.body;

  if (section !== undefined) {
    if (section === null || section === '') {
      quiz.section = null;
    } else {
      if (!mongoose.Types.ObjectId.isValid(section)) {
        return res.status(400).json({ message: 'Invalid section ID' });
      }

      const existingSection = await Section.findOne({
        _id: section,
        course: quiz.course,
      });

      if (!existingSection) {
        return res.status(400).json({
          message: 'Section does not belong to this course',
        });
      }

      quiz.section = section;
    }
  }

  if (title !== undefined) quiz.title = title;
  if (passPercent !== undefined) quiz.passPercent = passPercent;
  if (maxAttempts !== undefined) quiz.maxAttempts = maxAttempts;

  if (questions !== undefined) {
    const validationError = validateQuestions(questions);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    quiz.questions = questions;
  }

  await quiz.save();

  return res.status(200).json({
    message: 'Quiz updated successfully',
    quiz,
  });
};

// Delete an existing quiz (owner only).
export const deleteQuiz = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid quiz ID' });
  }

  const quiz = await Quiz.findById(req.params.id);

  if (!quiz) {
    return res.status(404).json({ message: 'Quiz not found' });
  }

  const course = await Course.findOne({
    _id: quiz.course,
    instructor: req.user._id,
  });

  if (!course) {
    return res.status(403).json({
      message: 'You are not allowed to delete this quiz',
    });
  }

  await quiz.deleteOne();

  return res.status(200).json({
    message: 'Quiz deleted successfully',
  });
};

// Get all quizzes for an instructor's course.
export const getCourseQuizzes = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid course ID' });
  }

  const course = await Course.findOne({
    _id: req.params.id,
    instructor: req.user._id,
  });

  if (!course) {
    return res.status(404).json({
      message: 'Course not found or you are not the owner',
    });
  }

  const quizzes = await Quiz.find({
    course: course._id,
  }).sort({ createdAt: -1 });

  return res.status(200).json({
    count: quizzes.length,
    quizzes,
  });
};

// Get a quiz for an enrolled student.
// Never expose correctIndex or explanation before submission.
export const getStudentQuiz = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid quiz ID' });
  }

  const quiz = await Quiz.findById(req.params.id);

  if (!quiz) {
    return res.status(404).json({ message: 'Quiz not found' });
  }

  const enrollment = await Enrollment.findOne({
    user: req.user._id,
    course: quiz.course,
  });

  if (!enrollment) {
    return res.status(403).json({
      message: 'You must be enrolled in this course to access the quiz',
    });
  }

  const studentQuiz = await Quiz.findById(req.params.id)
    .select('-questions.correctIndex -questions.explanation');

  return res.status(200).json({
    quiz: studentQuiz,
  });
};

// Submit a quiz and calculate the score on the server.
export const submitQuiz = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'Invalid quiz ID');
  }

  const quiz = await Quiz.findById(req.params.id);

  if (!quiz) {
    throw new ApiError(404, 'Quiz not found');
  }

  // Verify that the student is enrolled.
  const enrollment = await Enrollment.findOne({
    user: req.user._id,
    course: quiz.course,
  });

  if (!enrollment) {
    throw new ApiError(
      403,
      'You must be enrolled in this course to submit the quiz'
    );
  }

  // Check how many attempts the student has already used.
  const used = await QuizAttempt.countDocuments({
    user: req.user._id,
    quiz: quiz._id,
  });

  if (used >= quiz.maxAttempts) {
    throw new ApiError(400, 'No attempts left');
  }

  const { answers } = req.body;

  // Require exactly one answer for every question.
  if (
    !Array.isArray(answers) ||
    answers.length !== quiz.questions.length
  ) {
    throw new ApiError(
      400,
      'Please submit an answer for every question'
    );
  }

  // Convert submitted answers into a question-ID-based map.
  // Supports both the current object format and the older numeric format.
  const normalizedAnswers = new Map();

  for (let i = 0; i < answers.length; i++) {
    const submittedAnswer = answers[i];
    const quizQuestion = quiz.questions[i];

    let questionId;
    let selectedIndex;

    if (typeof submittedAnswer === 'number') {
      // Backward compatibility with the old format: [1, 0, ...]
      questionId = String(quizQuestion._id);
      selectedIndex = submittedAnswer;
    } else if (
      submittedAnswer &&
      typeof submittedAnswer === 'object' &&
      !Array.isArray(submittedAnswer)
    ) {
      questionId = String(
        submittedAnswer.question ||
        submittedAnswer.questionId ||
        ''
      );

      selectedIndex = submittedAnswer.selectedIndex;

      if (questionId !== String(quizQuestion._id)) {
        throw new ApiError(
          400,
          `Question ID mismatch for question ${i + 1}`
        );
      }
    } else {
      throw new ApiError(
        400,
        `Invalid answer format for question ${i + 1}`
      );
    }

    if (normalizedAnswers.has(questionId)) {
      throw new ApiError(
        400,
        `Duplicate answer for question ${i + 1}`
      );
    }

    if (
      !Number.isInteger(selectedIndex) ||
      selectedIndex < 0 ||
      selectedIndex >= quizQuestion.options.length
    ) {
      throw new ApiError(
        400,
        `Invalid answer for question ${i + 1}`
      );
    }

    normalizedAnswers.set(questionId, selectedIndex);
  }

  let correct = 0;

  // Grade answers using correctIndex stored in MongoDB.
  const review = quiz.questions.map((question) => {
    const selectedIndex = normalizedAnswers.get(
      String(question._id)
    );

    const isCorrect = selectedIndex === question.correctIndex;

    if (isCorrect) {
      correct++;
    }

    return {
      question: question.text,
      chosen: selectedIndex,
      correctIndex: question.correctIndex,
      ok: isCorrect,
      explanation: question.explanation,
    };
  });

  const score = Math.round(
    (correct / quiz.questions.length) * 100
  );

  const passed = score >= quiz.passPercent;

  // Save the attempt separately from lesson progress.
  await QuizAttempt.create({
    user: req.user._id,
    quiz: quiz._id,
    answers: quiz.questions.map((question) => ({
      question: question._id,
      selectedIndex: normalizedAnswers.get(
        String(question._id)
      ),
    })),
    score,
    passed,
  });

  // Recalculate quiz progress after saving the attempt.
  await recalcProgress(req.user._id, quiz.course);

  const attemptsLeft = quiz.maxAttempts - used - 1;

  return res.status(200).json({
    message: 'Quiz submitted successfully',
    score,
    correctAnswers: correct,
    totalQuestions: quiz.questions.length,
    passed,
    review,
    attemptsLeft,
  });
});
