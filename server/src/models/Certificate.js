
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

    // Undefined for older certificates; 2 identifies the redesigned PDF.
    pdfDesignVersion: {
      type: Number,
    },

    issuedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

certificateSchema.index(
  { user: 1, course: 1 },
  { unique: true }
);

const Certificate = mongoose.model(
  'Certificate',
  certificateSchema
);

export default Certificate;
