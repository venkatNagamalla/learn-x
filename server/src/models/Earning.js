
import mongoose from 'mongoose';

const earningSchema = new mongoose.Schema(
  {
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },

    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
      unique: true,
    },

    gross: {
      type: Number,
      required: true,
      min: 0,
    },

    platformFee: {
      type: Number,
      required: true,
      min: 0,
    },

    net: {
      type: Number,
      required: true,
      min: 0,
    },

    payoutStatus: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
      index: true,
    },

    paidAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

earningSchema.index({ instructor: 1, createdAt: -1 });
earningSchema.index({ course: 1 });

const Earning = mongoose.model('Earning', earningSchema);

export default Earning;
