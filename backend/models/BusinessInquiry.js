import mongoose from 'mongoose';

const businessInquirySchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    travellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    experienceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RuralExperience',
      default: null,
    },
    subject: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    status: { type: String, enum: ['open', 'responded', 'closed'], default: 'open', index: true },
    businessResponse: { type: String, trim: true, maxlength: 5000, default: '' },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

businessInquirySchema.index({ businessId: 1, createdAt: -1 });
businessInquirySchema.index({ travellerId: 1, createdAt: -1 });

export default mongoose.model('BusinessInquiry', businessInquirySchema);
