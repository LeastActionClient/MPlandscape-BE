import mongoose from 'mongoose';

const gallerySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: false,
      default: 'Landscape Project',
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    imageUrl: {
      type: String,
      required: [true, 'Media URL is required'],
    },
    publicId: {
      type: String,
      default: '',
    },
    mediaType: {
      type: String,
      enum: ['IMAGE', 'VIDEO'],
      default: 'IMAGE',
      index: true,
    },
    resourceType: {
      type: String,
      default: 'image',
    },
    format: {
      type: String,
      default: '',
    },
    videoThumbnail: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      trim: true,
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field for mediaUrl aliased to imageUrl for cleaner API semantics
gallerySchema.virtual('mediaUrl').get(function () {
  return this.imageUrl;
});

// Index for efficient sorting & pagination
gallerySchema.index({ displayOrder: 1, createdAt: -1 });

const Gallery = mongoose.models.Gallery || mongoose.model('Gallery', gallerySchema);

export default Gallery;
