import mongoose from 'mongoose';

const tourismListingSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, index: true },
  kind: { type: String, enum: ['destination', 'business'], required: true, default: 'destination' },
  name: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  sourceName: { type: String, required: true, trim: true },
  sourceUrl: { type: String, required: true },
  imageUrl: { type: String, required: true },
  imageAlt: { type: String, required: true },
  imageAuthor: { type: String, required: true },
  imageSourceUrl: { type: String, required: true },
  imageLicense: { type: String, required: true },
  imageLicenseUrl: { type: String, required: true },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true, strict: true });

export default mongoose.model('TourismListing', tourismListingSchema);
