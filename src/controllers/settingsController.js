import SiteSettings from '../models/SiteSettings.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

/**
 * @desc    Get site settings
 * @route   GET /api/settings
 * @access  Public
 */
export const getSettings = async (req, res, next) => {
  try {
    const settings = await SiteSettings.getSettings();
    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update site settings
 * @route   PUT /api/settings
 * @access  Private (Admin)
 */
export const updateSettings = async (req, res, next) => {
  try {
    let settings = await SiteSettings.getSettings();
    const body = { ...req.body };

    // If logo file is uploaded, stream to Cloudinary
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'mp_landscape/branding');
      body.logo = uploadResult.secure_url;
    }

    // Parse array/object fields if sent as stringified JSON from FormData
    if (typeof body.phoneNumbers === 'string') {
      try { body.phoneNumbers = JSON.parse(body.phoneNumbers); } catch { body.phoneNumbers = body.phoneNumbers.split(',').map((s) => s.trim()).filter(Boolean); }
    }
    if (typeof body.emailAddresses === 'string') {
      try { body.emailAddresses = JSON.parse(body.emailAddresses); } catch { body.emailAddresses = body.emailAddresses.split(',').map((s) => s.trim()).filter(Boolean); }
    }
    if (typeof body.socialLinks === 'string') {
      try { body.socialLinks = JSON.parse(body.socialLinks); } catch { /* ignore */ }
    }

    const updatedSettings = await SiteSettings.findByIdAndUpdate(settings._id, body, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: 'Site settings updated successfully',
      data: updatedSettings,
    });
  } catch (error) {
    next(error);
  }
};
