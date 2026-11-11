import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['Traveller', 'Business', 'Admin'],
      default: 'Traveller',
      required: true,
    },
    region: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    businessName: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    businessDescription: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    businessAvatarUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: '',
    },
    businessPhone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: '',
    },
    businessPublicEmail: {
      type: String,
      lowercase: true,
      trim: true,
      maxlength: 254,
      default: '',
    },
    businessWebsite: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: '',
    },
    businessAddress: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    businessLatitude: { type: Number, min: -90, max: 90, default: null },
    businessLongitude: { type: Number, min: -180, max: 180, default: null },
    companyId: {
      type: String,
      trim: true,
      uppercase: true,
      match: /^[A-Z]{2}\d{4}$/,
      unique: true,
      sparse: true,
    },
    employeeId: {
      type: String,
      trim: true,
      uppercase: true,
      match: /^[A-Z]{2}\d{4}$/,
      unique: true,
      sparse: true,
    },
    adminApprovalStatus: {
      type: String,
      enum: ['pending', 'approved'],
    },
    businessApprovalStatus: {
      type: String,
      enum: ['not-applicable', 'pending', 'changes_requested', 'approved', 'rejected'],
      default() {
        return this.role === 'Business' ? 'pending' : 'not-applicable';
      },
    },
    businessApplication: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, businessApprovalStatus: 1 });

export default mongoose.model('User', userSchema);
