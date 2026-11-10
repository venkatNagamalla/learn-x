
import mongoose from 'mongoose';
import { oid } from './helpers.js';

const questionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (options) => options.length >= 2,
        message: 'A question must have at least two options',
      },
    },
    correctIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    explanation: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    course: oid('Course'),
    section: {
      ...oid('Section'),
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    passPercent: {
      type: Number,
      default: 60,
      min: 0,
      max: 100,
    },
    maxAttempts: {
      type: Number,
      default: 3,
      min: 1,
    },
    questions: {
      type: [questionSchema],
      validate: {
        validator: (questions) => questions.length > 0,
        message: 'A quiz must contain at least one question',
      },
    },
  },
  { timestamps: true }
);

quizSchema.index({ course: 1, section: 1 });

export default mongoose.model('Quiz', quizSchema);
