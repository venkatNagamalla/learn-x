
import mongoose from 'mongoose';
import { oid } from './helpers.js';

const liveClassSchema = new mongoose.Schema(
  {
    course: oid('Course', { required: true }),

    instructor: oid('User', { required: true }),

    title: {
      type: String,
      required: true,
      trim: true,
    },

    scheduledAt: {
      type: Date,
      required: true,
    },

    roomName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ['scheduled', 'live', 'ended'],
      default: 'scheduled',
    },

    messages: [
      {
        name: {
          type: String,
          required: true,
        },

        text: {
          type: String,
          required: true,
          trim: true,
        },

        at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

liveClassSchema.index({ course: 1, scheduledAt: 1 });
liveClassSchema.index({ instructor: 1, scheduledAt: 1 });

export default mongoose.model('LiveClass', liveClassSchema);
