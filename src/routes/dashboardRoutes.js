import express from 'express';
import {
  getDashboardStats,
  getRecentEnquiries,
  getEnquiryTrends,
} from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All dashboard endpoints are strictly protected for admin access only
router.use(protect);

router.get('/stats', getDashboardStats);
router.get('/recent-enquiries', getRecentEnquiries);
router.get('/enquiry-trends', getEnquiryTrends);

export default router;
