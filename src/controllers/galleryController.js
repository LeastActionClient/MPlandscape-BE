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

    const CATEGORY_MAPPINGS = {
      'Indoor Landscaping': [
        'Indoor Landscaping',
        'Indoor',
        'Commercial',
        'Biophilic',
      ],
      'Outdoor Landscaping': [
        'Outdoor Landscaping',
        'Landscape Design',
        'Landscape Architecture',
        'Garden Maintenance',
        'Irrigation Systems',
        'Residential',
        'Outdoor',
      ],
      'Playground & Recreation': [
        'Playground & Recreation',
        'Playground',
        'Recreation',
      ],
      'Plantation & Nursery': [
        'Plantation & Nursery',
        'Plant Supply & Nursery',
        'Plant Trading',
        'Agriculture & Farm Development',
        'Horticulture',
        'Plantation',
        'Nursery',
      ],
    };

    if (
      req.query.category &&
      req.query.category !== 'All' &&
      req.query.category !== 'All Projects'
    ) {
      const cat = req.query.category;
      if (cat === 'Indoor Landscaping') {
        filter.$or = [
          { category: { $in: ['Indoor Landscaping', 'Indoor', 'Commercial', 'Biophilic'] } },
          { title: { $regex: /indoor|interior|office|atrium/i } },
        ];
      } else if (cat === 'Outdoor Landscaping') {
        filter.$or = [
          { category: { $in: ['Outdoor Landscaping', 'Landscape Design', 'Landscape Architecture', 'Garden Maintenance', 'Irrigation Systems', 'Residential', 'Outdoor'] } },
          { title: { $regex: /outdoor|garden|lawn|pathway|walkway|stone|residential|boundary/i } },
        ];
      } else if (cat === 'Playground & Recreation') {
        filter.$or = [
          { category: { $in: ['Playground & Recreation', 'Playground', 'Recreation'] } },
          { title: { $regex: /playground|recreation|swing|park/i } },
        ];
      } else if (cat === 'Plantation & Nursery') {
        filter.$or = [
          { category: { $in: ['Plantation & Nursery', 'Plant Supply & Nursery', 'Plant Trading', 'Agriculture & Farm Development', 'Horticulture', 'Plantation', 'Nursery'] } },
          { title: { $regex: /nursery|plantation|bonsai|topiary|foliage|plant supply/i } },
        ];
      } else {
        filter.category = cat;
      }
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
 * @desc    Create one or multiple gallery items (images or videos)
 * @route   POST /api/gallery
 * @access  Private (Admin)
 */
export const createGalleryItem = async (req, res, next) => {
  try {
    const body = { ...req.body };
    const category = body.category || 'Outdoor Landscaping';
    const baseTitle = body.title?.trim() || '';
    const description = body.description || '';
    const displayOrder = Number(body.displayOrder) || 0;
    const isActive = body.isActive !== undefined ? body.isActive === 'true' || body.isActive === true : true;

    const formatTitleFromFileName = (originalName) => {
      if (!originalName) return 'Landscape Project';
      const clean = originalName
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .trim();
      if (!clean) return 'Landscape Project';
      return clean
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    };

    // Normalize uploaded files from array, fields, or single file upload
    const uploadedFiles = Array.isArray(req.files)
      ? req.files
      : req.files
      ? [
          ...(req.files.media || []),
          ...(req.files.images || []),
          ...(req.files.image || []),
          ...(req.files.videos || []),
          ...(req.files.video || []),
          ...(req.files.files || []),
          ...(req.files.file || []),
        ]
      : req.file
      ? [req.file]
      : [];

    if (uploadedFiles.length > 0) {
      // Validate each file's size per media type
      for (const file of uploadedFiles) {
        const mime = (file.mimetype || '').toLowerCase();
        const isVideo = mime.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.originalname || '');
        if (isVideo && file.size > 100 * 1024 * 1024) {
          return res.status(400).json({
            success: false,
            message: `Video file "${file.originalname}" exceeds the 100 MB limit.`,
          });
        }
        if (!isVideo && file.size > 15 * 1024 * 1024) {
          return res.status(400).json({
            success: false,
            message: `Image file "${file.originalname}" exceeds the 15 MB limit.`,
          });
        }
      }

      const createdItems = [];
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const mime = (file.mimetype || '').toLowerCase();
        const isVideo = mime.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.originalname || '');
        const resourceType = isVideo ? 'video' : 'image';
        const mediaType = isVideo ? 'VIDEO' : 'IMAGE';

        try {
          const uploadResult = await uploadToCloudinary(file.buffer, 'mp_landscape/gallery', {
            filename: file.originalname,
            mimetype: file.mimetype,
            resource_type: resourceType,
          });
          let itemTitle = baseTitle;
          if (!itemTitle) {
            itemTitle = formatTitleFromFileName(file.originalname);
          } else if (uploadedFiles.length > 1) {
            itemTitle = `${baseTitle} - Part ${i + 1}`;
          }

          const item = await Gallery.create({
            title: itemTitle,
            description,
            category,
            imageUrl: uploadResult.secure_url,
            publicId: uploadResult.public_id || '',
            mediaType,
            resourceType: uploadResult.resource_type || resourceType,
            format: uploadResult.format || '',
            displayOrder: displayOrder + i,
            isActive,
          });
          createdItems.push(item);
        } catch (uploadError) {
          console.error(`❌ Failed to upload gallery ${mediaType.toLowerCase()} ${i + 1}:`, uploadError.message || uploadError);
        }
      }

      if (createdItems.length === 0) {
        return res.status(502).json({
          success: false,
          message: 'Media upload failed. Please try again or check the selected files.',
        });
      }

      return res.status(201).json({
        success: true,
        message: `${createdItems.length} gallery items uploaded successfully`,
        data: createdItems.length === 1 ? createdItems[0] : createdItems,
      });
    }

    // Handle raw imageUrl or mediaUrl in JSON payload
    if (body.imageUrl || body.mediaUrl) {
      const mediaUrl = body.imageUrl || body.mediaUrl;
      const isVideo = body.mediaType === 'VIDEO' || /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(mediaUrl);
      const mediaType = isVideo ? 'VIDEO' : (body.mediaType || 'IMAGE');
      const resourceType = isVideo ? 'video' : (body.resourceType || 'image');

      const item = await Gallery.create({
        title: baseTitle || 'Landscape Project',
        description,
        category,
        imageUrl: mediaUrl,
        publicId: body.publicId || '',
        mediaType,
        resourceType,
        format: body.format || '',
        videoThumbnail: body.videoThumbnail || '',
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
      message: 'Please provide at least one image or video file, or an imageUrl.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update gallery item details or replace media
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
    const oldResourceType = item.resourceType || item.mediaType || 'image';

    const uploadedFile =
      req.file ||
      (req.files && (
        req.files.media?.[0] ||
        req.files.image?.[0] ||
        req.files.video?.[0] ||
        req.files.file?.[0]
      ));

    // When replacing media: upload new media successfully before deleting the old one
    if (uploadedFile) {
      const mime = (uploadedFile.mimetype || '').toLowerCase();
      const isVideo = mime.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(uploadedFile.originalname || '');
      if (isVideo && uploadedFile.size > 100 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: `Video file "${uploadedFile.originalname}" exceeds the 100 MB limit.`,
        });
      }
      if (!isVideo && uploadedFile.size > 15 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: `Image file "${uploadedFile.originalname}" exceeds the 15 MB limit.`,
        });
      }

      const resourceType = isVideo ? 'video' : 'image';
      const mediaType = isVideo ? 'VIDEO' : 'IMAGE';

      const uploadResult = await uploadToCloudinary(uploadedFile.buffer, 'mp_landscape/gallery', {
        filename: uploadedFile.originalname,
        mimetype: uploadedFile.mimetype,
        resource_type: resourceType,
      });

      body.imageUrl = uploadResult.secure_url;
      body.publicId = uploadResult.public_id || '';
      body.mediaType = mediaType;
      body.resourceType = uploadResult.resource_type || resourceType;
      body.format = uploadResult.format || '';

      if (oldPublicId) {
        deleteFromCloudinary(oldPublicId, oldResourceType).catch((err) =>
          console.error('Failed to cleanup old gallery media:', err.message)
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
      await deleteFromCloudinary(item.publicId, item.resourceType || item.mediaType || 'image');
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
