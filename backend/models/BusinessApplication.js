import mongoose from 'mongoose';

const uploadSchema = new mongoose.Schema({
  id: { type: String, required: true },
  category: { type: String, default: '' },
  originalName: { type: String, required: true, maxlength: 180 },
  storageKey: { type: String, required: true, select: false },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const auditSchema = new mongoose.Schema({
  action: { type: String, required: true, maxlength: 40 },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  note: { type: String, trim: true, maxlength: 1000, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, unique: true, index: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['draft', 'pending_review', 'changes_requested', 'approved', 'rejected'], default: 'draft', index: true },
  verificationNotes: { type: String, trim: true, maxlength: 1000, default: '' },
  alternativeEvidence: { type: Boolean, default: false },
  documents: { type: [uploadSchema], default: [] },
  photos: { type: [uploadSchema], default: [] },
  submittedAt: { type: Date, default: null },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  reviewNote: { type: String, trim: true, maxlength: 1000, default: '' },
  audit: { type: [auditSchema], default: [] },
}, { timestamps: true });

applicationSchema.index({ status: 1, submittedAt: -1 });
applicationSchema.index({ ownerId: 1, status: 1 });
export default mongoose.model('BusinessApplication', applicationSchema);
