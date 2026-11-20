import express from 'express';
import {
  getGallery,
  getGalleryItem,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
} from '../controllers/galleryController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { uploadLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

const galleryUpload = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'image', maxCount: 1 },
]);

router
  .route('/')
  .get(getGallery)
  .post(protect, uploadLimiter, galleryUpload, createGalleryItem);

router
  .route('/:id')
  .get(getGalleryItem)
  .put(protect, uploadLimiter, upload.single('image'), updateGalleryItem)
  .delete(protect, deleteGalleryItem);

export default router;
