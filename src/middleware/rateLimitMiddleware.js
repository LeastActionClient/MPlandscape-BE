import rateLimit from 'express-rate-limit';
import ENV from '../config/env.js';

const isTest = () => ENV.NODE_ENV === 'test';

// Strict rate limiter for login attempts to prevent brute force attacks
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 failed login attempts per window
  skipSuccessfulRequests: true, // Only count failed attempts against the limit
  skip: isTest,
  message: {
    success: false,
    message: 'Too many failed login attempts from this IP. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for public enquiry submissions to deter spam
export const enquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 enquiry submissions per hour
  skip: isTest,
  message: {
    success: false,
    message: 'Enquiry submission limit reached. You can only submit up to 5 enquiries per hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for media uploads to prevent storage abuse and DoS
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 media uploads per 15 minutes
  skip: isTest,
  message: {
    success: false,
    message: 'Media upload rate limit reached. Please wait before uploading more files.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter for broad traffic throttling
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 400, // Limit each IP to 400 requests per 15 minutes
  skip: isTest,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
