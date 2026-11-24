import express from 'express';
import {
  getGallery,
  getGalleryItem,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
} from '../controllers/galleryController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadMedia } from '../middleware/uploadMiddleware.js';
import { uploadLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

const galleryUpload = uploadMedia.fields([
  { name: 'images', maxCount: 10 },
  { name: 'image', maxCount: 1 },
  { name: 'videos', maxCount: 10 },
  { name: 'video', maxCount: 1 },
  { name: 'media', maxCount: 10 },
  { name: 'files', maxCount: 10 },
  { name: 'file', maxCount: 1 },
]);

const gallerySingleUpload = uploadMedia.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'media', maxCount: 1 },
  { name: 'file', maxCount: 1 },
]);

router
  .route('/')
  .get(getGallery)
  .post(protect, uploadLimiter, galleryUpload, createGalleryItem);

router
  .route('/:id')
  .get(getGalleryItem)
  .put(protect, uploadLimiter, gallerySingleUpload, updateGalleryItem)
  .delete(protect, deleteGalleryItem);

export default router;
