import mongoose from 'mongoose';

const ruralExperienceSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    category: { type: String, required: true, trim: true, maxlength: 100 },
    region: { type: String, required: true, trim: true, maxlength: 120 },
    duration: { type: String, trim: true, maxlength: 80, default: '' },
    price: { type: Number, required: true, min: 0, max: 10000000 },
    imageUrl: { type: String, trim: true, maxlength: 2048, default: '' },
    eventDate: { type: Date, default: null },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  },
  { timestamps: true }
);

ruralExperienceSchema.index({ businessId: 1, createdAt: -1 });
ruralExperienceSchema.index({ status: 1, region: 1, createdAt: -1 });

export default mongoose.model('RuralExperience', ruralExperienceSchema);
