import express from 'express';
import {
  getServices,
  getServiceBySlug,
  createService,
  updateService,
  deleteService,
} from '../controllers/serviceController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadSingleImage } from '../middleware/uploadMiddleware.js';
import { uploadLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

router
  .route('/')
  .get(getServices)
  .post(protect, uploadLimiter, uploadSingleImage('image'), createService);

router
  .route('/:id')
  .put(protect, uploadLimiter, uploadSingleImage('image'), updateService)
  .delete(protect, deleteService);

// GET by slug or ID
router.route('/:slug').get(getServiceBySlug);

export default router;
