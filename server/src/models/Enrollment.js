
import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },

    enrolledAt: {
      type: Date,
      default: Date.now,
    },

    lessonProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    quizProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

enrollmentSchema.index(
  { user: 1, course: 1 },
  { unique: true }
);

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

export default Enrollment;
