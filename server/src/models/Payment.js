
import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },

    provider: {
      type: String,
      default: 'payu',
      lowercase: true,
      trim: true,
    },

    txnid: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    payuPaymentId: {
      type: String,
      default: null,
      trim: true,
    },

    status: {
      type: String,
      enum: ['created', 'pending', 'paid', 'failed', 'refunded'],
      default: 'created',
      index: true,
    },

    payuStatus: {
      type: String,
      default: null,
      trim: true,
    },

    responseHashVerified: {
      type: Boolean,
      default: false,
    },

    rawResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },

    paidAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ user: 1, course: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
