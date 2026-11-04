import mongoose from 'mongoose';
import { oid } from './helpers.js';

const lessonSchema = new mongoose.Schema(
  {
    course: oid('Course', { required: true }),

    section: oid('Section', { required: true }),

    title: {
      type: String,
      required: true,
      trim: true,
    },

    order: {
      type: Number,
      required: true,
      min: 1,
    },

    description: {
      type: String,
      default: '',
    },

    rawKey: {
      type: String,
      default: '',
    },

    hlsPath: {
      type: String,
      default: '',
    },

    duration: {
      type: Number,
      default: 0,
      min: 0,
    },

    processingStatus: {
      type: String,
      enum: ['none', 'uploaded', 'processing', 'ready', 'failed'],
      default: 'none',
    },

    isPreview: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

lessonSchema.index({ course: 1, section: 1, order: 1 });

export default mongoose.model('Lesson', lessonSchema);