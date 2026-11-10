
import mongoose from 'mongoose';
import { oid } from './helpers.js';

const answerSchema = new mongoose.Schema(
  {
    question: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    selectedIndex: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const quizAttemptSchema = new mongoose.Schema(
  {
    user: oid('User'),
    quiz: oid('Quiz'),

    answers: {
      type: [answerSchema],
      default: [],
    },

    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    passed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

quizAttemptSchema.index({ user: 1, quiz: 1, createdAt: -1 });

export default mongoose.model('QuizAttempt', quizAttemptSchema);
