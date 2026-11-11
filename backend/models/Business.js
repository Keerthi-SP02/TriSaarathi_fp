import mongoose from 'mongoose';

const businessSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  businessName: { type: String, required: true, trim: true, maxlength: 150 },
  category: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, trim: true, maxlength: 500 },
  yearEstablished: { type: Number, min: 1800, max: new Date().getFullYear() },
  state: { type: String, required: true, enum: ['Andhra Pradesh'], default: 'Andhra Pradesh' },
  district: { type: String, trim: true, maxlength: 100, default: '' },
  locality: { type: String, trim: true, maxlength: 120, default: '' },
  address: { type: String, trim: true, maxlength: 500, default: '' },
  website: { type: String, trim: true, maxlength: 2048, default: '' },
  mobile: { type: String, trim: true, maxlength: 13, default: '' },
  email: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
  location: { type: { type: String, enum: ['Point'] }, coordinates: { type: [Number] } },
  lifecycleStatus: { type: String, enum: ['draft', 'pending', 'published', 'rejected'], default: 'draft', index: true },
}, { timestamps: true });

businessSchema.index({ location: '2dsphere' }, { sparse: true });
export default mongoose.model('Business', businessSchema);
