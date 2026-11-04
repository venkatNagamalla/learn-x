import mongoose from 'mongoose';
import { oid } from './helpers.js';

const sectionSchema = new mongoose.Schema(
  {
    course: oid('Course', { required: true }),

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
  },
  { timestamps: true }
);

sectionSchema.index({ course: 1, order: 1 });

export default mongoose.model('Section', sectionSchema);