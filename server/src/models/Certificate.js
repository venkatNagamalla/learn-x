
import mongoose from 'mongoose';
import { oid } from './helpers.js';

const certificateSchema = new mongoose.Schema(
  {
    user: oid('User', { required: true }),
    course: oid('Course', { required: true }),

    certificateId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    pdfKey: {
      type: String,
      required: true,
      trim: true,
    },

    issuedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// A student can receive only one certificate per course.
certificateSchema.index(
  { user: 1, course: 1 },
  { unique: true }
);

const Certificate = mongoose.model(
  'Certificate',
  certificateSchema
);

export default Certificate;
