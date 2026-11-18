import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadSingleImage } from '../middleware/uploadMiddleware.js';
import { uploadLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

router
  .route('/')
  .get(getSettings)
  .put(protect, uploadLimiter, uploadSingleImage('logo'), updateSettings);

export default router;
