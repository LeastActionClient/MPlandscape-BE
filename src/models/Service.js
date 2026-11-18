import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Service title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Service slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: [250, 'Subtitle cannot exceed 250 characters'],
      default: '',
    },
    description: {
      type: String,
      required: [true, 'Service description is required'],
    },
    features: {
      type: [String],
      default: [],
    },
    imageUrl: {
      type: String,
      required: [true, 'Service image URL is required'],
    },
    imagePublicId: {
      type: String,
      default: '',
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    seoTitle: {
      type: String,
      trim: true,
      default: '',
    },
    seoDescription: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Text index for search functionality
serviceSchema.index({ title: 'text', description: 'text', subtitle: 'text' });

const Service = mongoose.models.Service || mongoose.model('Service', serviceSchema);

export default Service;
