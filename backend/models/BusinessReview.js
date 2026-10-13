import mongoose from 'mongoose';

const businessReviewSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    businessResponse: { type: String, trim: true, maxlength: 2000, default: '' },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

businessReviewSchema.index({ businessId: 1, reviewerId: 1 }, { unique: true });
businessReviewSchema.index({ businessId: 1, createdAt: -1 });

export default mongoose.model('BusinessReview', businessReviewSchema);
