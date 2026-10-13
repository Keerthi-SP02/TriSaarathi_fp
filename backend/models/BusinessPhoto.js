import mongoose from 'mongoose';

const businessPhotoSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    cloudinaryPublicId: { type: String, required: true, trim: true, unique: true },
    secureUrl: { type: String, required: true, trim: true, maxlength: 2048 },
    altText: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { timestamps: true }
);

businessPhotoSchema.index({ businessId: 1, createdAt: -1 });

export default mongoose.model('BusinessPhoto', businessPhotoSchema);
