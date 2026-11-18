import mongoose from 'mongoose';
import Gallery from '../models/Gallery.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

/**
 * @desc    Get gallery items (with category filtering, pagination, and sorting)
 * @route   GET /api/gallery
 * @access  Public
 */
export const getGallery = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 24));
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.all !== 'true') {
      filter.isActive = true;
    } else if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    if (req.query.category && req.query.category !== 'All') {
      filter.category = req.query.category;
    }

    const total = await Gallery.countDocuments(filter);
    const items = await Gallery.find(filter)
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get list of distinct categories for filters
    const categories = await Gallery.distinct('category', { isActive: true });

    return res.status(200).json({
      success: true,
      count: items.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      categories,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single gallery item
 * @route   GET /api/gallery/:id
 * @access  Public
 */
export const getGalleryItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid gallery item ID format: ${id}`,
      });
    }

    const item = await Gallery.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Gallery item with ID ${id} not found`,
      });
    }


    return res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create one or multiple gallery items
 * @route   POST /api/gallery
 * @access  Private (Admin)
 */
export const createGalleryItem = async (req, res, next) => {
  try {
    const body = { ...req.body };
    const category = body.category || 'General';
    const title = body.title || 'Landscape Project Showcase';
    const description = body.description || '';
    const displayOrder = Number(body.displayOrder) || 0;
    const isActive = body.isActive !== undefined ? body.isActive === 'true' || body.isActive === true : true;

    // Handle multiple uploaded files
    if (req.files && req.files.length > 0) {
      const createdItems = [];
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const uploadResult = await uploadToCloudinary(file.buffer, 'mp_landscape/gallery');
        const itemTitle = req.files.length === 1 ? title : `${title} - Part ${i + 1}`;

        const item = await Gallery.create({
          title: itemTitle,
          description,
          category,
          imageUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          displayOrder: displayOrder + i,
          isActive,
        });
        createdItems.push(item);
      }

      return res.status(201).json({
        success: true,
        message: `${createdItems.length} gallery items uploaded successfully`,
        data: createdItems,
      });
    }

    // Handle single file upload
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'mp_landscape/gallery');
      const item = await Gallery.create({
        title,
        description,
        category,
        imageUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        displayOrder,
        isActive,
      });

      return res.status(201).json({
        success: true,
        message: 'Gallery item created successfully',
        data: item,
      });
    }

    // Handle raw imageUrl in JSON payload
    if (body.imageUrl) {
      const item = await Gallery.create({
        title,
        description,
        category,
        imageUrl: body.imageUrl,
        publicId: body.publicId || '',
        displayOrder,
        isActive,
      });

      return res.status(201).json({
        success: true,
        message: 'Gallery item created successfully',
        data: item,
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Please provide at least one image file or an imageUrl.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update gallery item details or image
 * @route   PUT /api/gallery/:id
 * @access  Private (Admin)
 */
export const updateGalleryItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid gallery item ID format: ${id}`,
      });
    }

    const item = await Gallery.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Gallery item with ID ${id} not found`,
      });
    }

    const body = { ...req.body };
    const oldPublicId = item.publicId;

    // When replacing image: upload new image successfully before deleting the old one
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'mp_landscape/gallery');
      body.imageUrl = uploadResult.secure_url;
      body.publicId = uploadResult.public_id;

      if (oldPublicId) {
        deleteFromCloudinary(oldPublicId).catch((err) =>
          console.error('Failed to cleanup old gallery image:', err.message)
        );
      }
    }

    if (body.isActive !== undefined) {
      body.isActive = body.isActive === 'true' || body.isActive === true;
    }

    if (body.displayOrder !== undefined) {
      body.displayOrder = Number(body.displayOrder);
    }

    const updatedItem = await Gallery.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: 'Gallery item updated successfully',
      data: updatedItem,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete gallery item and its Cloudinary asset
 * @route   DELETE /api/gallery/:id
 * @access  Private (Admin)
 */
export const deleteGalleryItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid gallery item ID format: ${id}`,
      });
    }

    const item = await Gallery.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Gallery item with ID ${id} not found`,
      });
    }


    if (item.publicId) {
      await deleteFromCloudinary(item.publicId);
    }

    await Gallery.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Gallery item deleted successfully',
      data: { id },
    });
  } catch (error) {
    next(error);
  }
};
