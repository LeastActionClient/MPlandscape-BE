import mongoose from 'mongoose';
import Service from '../models/Service.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';
import slugify from '../utils/slugify.js';

/**
 * @desc    Get all services (supports pagination, search, active filter)
 * @route   GET /api/services
 * @access  Public
 */
export const getServices = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    // By default, public requests only receive active services unless admin explicitly asks for all
    if (req.query.all !== 'true') {
      filter.isActive = true;
    } else if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { subtitle: searchRegex },
        { description: searchRegex },
      ];
    }

    const total = await Service.countDocuments(filter);
    const services = await Service.find(filter)
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      count: services.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single service by slug or ID
 * @route   GET /api/services/:slug
 * @access  Public
 */
export const getServiceBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    let service = await Service.findOne({ slug });

    // Fallback: check if slug is a valid MongoDB ObjectId
    if (!service && mongoose.Types.ObjectId.isValid(slug)) {
      service = await Service.findById(slug);
    }

    if (!service) {
      return res.status(404).json({
        success: false,
        message: `Service with slug or ID "${slug}" was not found`,
      });
    }

    // Inactive service edge case: hide from public unless requested with adminView=true
    if (!service.isActive && req.query.adminView !== 'true') {
      return res.status(404).json({
        success: false,
        message: `Service "${service.title}" is currently inactive.`,
      });
    }

    return res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error) {
    next(error);
  }
};


/**
 * @desc    Create a new service
 * @route   POST /api/services
 * @access  Private (Admin)
 */
export const createService = async (req, res, next) => {
  try {
    const body = { ...req.body };

    if (!body.title || !body.title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Service title is required',
      });
    }

    if (!body.description || !body.description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Service description is required',
      });
    }

    // Process image: file upload takes precedence over raw imageUrl string
    // Service banner image is strictly MANDATORY
    let imageUrl = null;
    let imagePublicId = null;

    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, 'mp_landscape/services');
        imageUrl = uploadResult.secure_url;
        imagePublicId = uploadResult.public_id;
      } catch (uploadError) {
        console.error('❌ Service banner upload error:', uploadError.message || uploadError);
        return res.status(uploadError.http_code === 400 ? 400 : 502).json({
          success: false,
          message: 'Image upload failed. Please try again or provide a valid image URL.',
        });
      }
    } else if (body.imageUrl && typeof body.imageUrl === 'string' && body.imageUrl.trim()) {
      const trimmedUrl = body.imageUrl.trim();
      const urlPattern = /^https?:\/\/.+/i;
      const isLocalUpload = trimmedUrl.startsWith('/uploads/');
      if (!urlPattern.test(trimmedUrl) && !isLocalUpload) {
        return res.status(400).json({
          success: false,
          message: 'Invalid image URL format. Please provide a valid HTTP/HTTPS URL.',
        });
      }
      imageUrl = trimmedUrl;
    }

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a service image or provide a valid image URL.',
      });
    }

    // Generate and guarantee unique slug
    let baseSlug = slugify(body.slug || body.title);
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await Service.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Parse features if passed as comma-separated or string
    let features = body.features;
    if (typeof features === 'string') {
      try {
        features = JSON.parse(features);
      } catch {
        features = features.split(',').map((f) => f.trim()).filter(Boolean);
      }
    }

    const service = await Service.create({
      title: body.title.trim(),
      slug: uniqueSlug,
      subtitle: body.subtitle ? body.subtitle.trim() : '',
      description: body.description.trim(),
      features: Array.isArray(features) ? features : [],
      imageUrl,
      imagePublicId,
      displayOrder: Number(body.displayOrder) || 0,
      isActive: body.isActive !== undefined ? body.isActive === 'true' || body.isActive === true : true,
      seoTitle: body.seoTitle ? body.seoTitle.trim() : body.title.trim(),
      seoDescription: body.seoDescription ? body.seoDescription.trim() : (body.subtitle ? body.subtitle.trim() : ''),
    });

    return res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing service
 * @route   PUT /api/services/:id
 * @access  Private (Admin)
 */
export const updateService = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid service ID format: ${id}`,
      });
    }

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: `Service with ID ${id} not found`,
      });
    }

    const body = { ...req.body };
    const oldPublicId = service.imagePublicId;

    // Handle image replacement safely: upload new image before deleting old one
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, 'mp_landscape/services');
        body.imageUrl = uploadResult.secure_url;
        body.imagePublicId = uploadResult.public_id;

        // Delete old image asynchronously only after successful new upload
        if (oldPublicId) {
          deleteFromCloudinary(oldPublicId).catch((err) =>
            console.error('Failed to cleanup old service image:', err.message)
          );
        }
      } catch (uploadError) {
        console.error('❌ Service banner update upload error:', uploadError.message || uploadError);
        return res.status(uploadError.http_code === 400 ? 400 : 502).json({
          success: false,
          message: 'Image upload failed. Please try again or provide a valid image URL.',
        });
      }
    } else if (body.removeImage === 'true' || body.removeImage === true) {
      // Removing image without providing a replacement is rejected
      return res.status(400).json({
        success: false,
        message: 'Please upload a service image or provide a valid image URL.',
      });
    } else if (body.imageUrl !== undefined) {
      if (body.imageUrl && typeof body.imageUrl === 'string' && body.imageUrl.trim()) {
        const trimmedUrl = body.imageUrl.trim();
        const urlPattern = /^https?:\/\/.+/i;
        const isLocalUpload = trimmedUrl.startsWith('/uploads/');
        if (!urlPattern.test(trimmedUrl) && !isLocalUpload) {
          return res.status(400).json({
            success: false,
            message: 'Invalid image URL format. Please provide a valid HTTP/HTTPS URL.',
          });
        }
        body.imageUrl = trimmedUrl;
      } else {
        // If empty string passed, preserve existing imageUrl if present; if none, reject
        if (!service.imageUrl) {
          return res.status(400).json({
            success: false,
            message: 'Please upload a service image or provide a valid image URL.',
          });
        }
        delete body.imageUrl;
      }
    }

    // If slug is being updated, verify uniqueness
    if (body.slug && body.slug !== service.slug) {
      const slugExists = await Service.findOne({ slug: slugify(body.slug), _id: { $ne: id } });
      if (slugExists) {
        return res.status(400).json({
          success: false,
          message: `The slug "${body.slug}" is already in use by another service.`,
        });
      }
      body.slug = slugify(body.slug);
    }

    // Parse features if needed
    if (body.features !== undefined) {
      if (typeof body.features === 'string') {
        try {
          body.features = JSON.parse(body.features);
        } catch {
          body.features = body.features.split(',').map((f) => f.trim()).filter(Boolean);
        }
      }
    }

    if (body.isActive !== undefined) {
      body.isActive = body.isActive === 'true' || body.isActive === true;
    }

    if (body.displayOrder !== undefined) {
      body.displayOrder = Number(body.displayOrder);
    }

    const updatedService = await Service.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: updatedService,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a service
 * @route   DELETE /api/services/:id
 * @access  Private (Admin)
 */
export const deleteService = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid service ID format: ${id}`,
      });
    }

    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: `Service with ID ${id} not found`,
      });
    }


    if (service.imagePublicId) {
      await deleteFromCloudinary(service.imagePublicId);
    }

    await Service.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Service deleted successfully',
      data: { id },
    });
  } catch (error) {
    next(error);
  }
};
