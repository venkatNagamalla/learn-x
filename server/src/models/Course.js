import mongoose from 'mongoose';
import { oid } from './helpers.js';

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },

    price: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    thumbnail: {
      type: String,
      default: '',
    },

    instructor: oid('User', { required: true }),

    status: {
      type: String,
      enum: ['draft', 'pending', 'published'],
      default: 'draft',
    },

    ratingAvg: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    seeded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Enable text search on title and description
courseSchema.index({
  title: 'text',
  description: 'text',
});

export default mongoose.model('Course', courseSchema);