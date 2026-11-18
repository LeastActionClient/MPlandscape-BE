import mongoose from 'mongoose';

const siteSettingsSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      default: 'MP Landscape Services',
      trim: true,
    },
    logo: {
      type: String,
      default: '/mp-logo.png',
    },
    tagline: {
      type: String,
      default: 'Premier Landscaping, Agriculture & Horticultural Solutions',
      trim: true,
    },
    aboutDescription: {
      type: String,
      default:
        'MP Landscape Services is a premier landscaping, agricultural development, and horticultural services company dedicated to engineering sustainable, breathtaking outdoor environments.',
    },
    vision: {
      type: String,
      default:
        'To be the leading innovator in sustainable landscaping and precision agricultural development.',
    },
    mission: {
      type: String,
      default:
        'Delivering superior horticultural craftsmanship, soil science mastery, and client-centric outdoor designs.',
    },
    phoneNumbers: {
      type: [String],
      default: ['+91 98765 43210', '+91 98765 43211'],
    },
    emailAddresses: {
      type: [String],
      default: ['info@mplandscape.com', 'enquiries@mplandscape.com'],
    },
    whatsappNumber: {
      type: String,
      default: '+91 98765 43210',
    },
    address: {
      type: String,
      default: 'Green Valley Horticultural Park, Coimbatore, Tamil Nadu, India',
    },
    mapUrl: {
      type: String,
      default: 'https://maps.google.com',
    },
    workingHours: {
      type: String,
      default: 'Mon - Sat: 8:00 AM - 6:30 PM (Sunday Closed)',
    },
    socialLinks: {
      facebook: { type: String, default: 'https://facebook.com/mplandscape' },
      instagram: { type: String, default: 'https://instagram.com/mplandscape' },
      linkedin: { type: String, default: 'https://linkedin.com/company/mplandscape' },
      youtube: { type: String, default: '' },
      twitter: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Singleton helper method to retrieve or auto-initialize settings
 */
siteSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const SiteSettings = mongoose.models.SiteSettings || mongoose.model('SiteSettings', siteSettingsSchema);

export default SiteSettings;
