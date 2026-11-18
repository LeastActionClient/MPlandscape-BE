import express from 'express';
import {
  createEnquiry,
  getEnquiries,
  getEnquiryById,
  updateEnquiryStatus,
  updateEnquiryNotes,
  deleteEnquiry,
  exportEnquiriesCSV,
} from '../controllers/enquiryController.js';
import { protect } from '../middleware/authMiddleware.js';
import { enquiryLimiter } from '../middleware/rateLimitMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  enquiryCreateSchema,
  enquiryStatusSchema,
  enquiryNotesSchema,
} from '../validators/schemas.js';

const router = express.Router();

// Public submission route with rate limiting
router.post('/', enquiryLimiter, validate(enquiryCreateSchema), createEnquiry);

// Admin-only export route (must precede /:id)
router.get('/export', protect, exportEnquiriesCSV);

// Admin-only list & detail routes
router.get('/', protect, getEnquiries);
router.get('/:id', protect, getEnquiryById);
router.patch('/:id/status', protect, validate(enquiryStatusSchema), updateEnquiryStatus);
router.patch('/:id/notes', protect, validate(enquiryNotesSchema), updateEnquiryNotes);
router.delete('/:id', protect, deleteEnquiry);

export default router;
