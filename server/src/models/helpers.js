import mongoose from 'mongoose';

export const oid = (ref, extra = {}) => ({
  type: mongoose.Schema.Types.ObjectId,
  ref,
  index: true,
  ...extra,
});