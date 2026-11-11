import mongoose from 'mongoose';

const businessPostSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    imageUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: '',
    },
    media: {
      type: [{
        _id: false,
        url: { type: String, required: true, trim: true, maxlength: 2048 },
        type: { type: String, enum: ['image', 'video'], required: true },
        publicId: { type: String, required: true, trim: true, maxlength: 255 },
        thumbnailUrl: { type: String, trim: true, maxlength: 2048, default: '' },
        bytes: { type: Number, required: true, min: 1 },
        duration: { type: Number, default: null },
      }],
      default: [],
    },
    category: {
      type: String,
      enum: ['', 'handlooms', 'agriculture', 'food', 'homestays', 'tourism', 'handicrafts'],
      default: '',
    },
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    savedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    comments: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },
      content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  { timestamps: true }
);

businessPostSchema.index({ createdAt: -1 });

export default mongoose.model('BusinessPost', businessPostSchema);
