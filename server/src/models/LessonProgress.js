
import mongoose from 'mongoose';

const lessonProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },

    watchedSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },

    completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

lessonProgressSchema.index(
  { user: 1, lesson: 1 },
  { unique: true }
);

const LessonProgress = mongoose.model(
  'LessonProgress',
  lessonProgressSchema
);

export default LessonProgress;
