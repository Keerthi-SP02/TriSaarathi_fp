import mongoose from 'mongoose';

const importedPlaceSchema = new mongoose.Schema({
  sourceId: { type: String, required: true, unique: true, trim: true, maxlength: 240 },
  externalId: { type: String, required: true, trim: true, maxlength: 200 },
  source: { type: String, required: true, enum: ['OpenStreetMap'], index: true },
  sourceProvider: { type: String, required: true, trim: true, maxlength: 80 },
  name: { type: String, required: true, trim: true, maxlength: 240 },
  category: { type: String, trim: true, maxlength: 300, default: '' },
  location: { type: String, trim: true, maxlength: 500, default: '' },
  address: { type: String, trim: true, maxlength: 1000, default: '' },
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  description: { type: String, trim: true, maxlength: 3000, default: '' },
  website: { type: String, trim: true, maxlength: 2048, default: '' },
  phone: { type: String, trim: true, maxlength: 80, default: '' },
  openingHours: { type: String, trim: true, maxlength: 500, default: '' },
  photo: { type: mongoose.Schema.Types.Mixed, default: null },
  sourceUrl: { type: String, trim: true, maxlength: 2048, default: '' },
  license: { type: String, trim: true, maxlength: 200, default: '' },
  attribution: { type: String, trim: true, maxlength: 1000, default: '' },
  isImported: { type: Boolean, default: true, immutable: true },
  lastFetchedAt: { type: Date, default: Date.now, index: true },
  lastSeenAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

export default mongoose.model('ImportedPlace', importedPlaceSchema);
