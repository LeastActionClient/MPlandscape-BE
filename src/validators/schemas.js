import { z } from 'zod';
import { ENQUIRY_STATUS } from '../models/Enquiry.js';

// Auth Schemas
export const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// Service Schemas
export const serviceCreateSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(150).trim(),
  subtitle: z.string().max(250).trim().optional().default(''),
  description: z.string().min(10, 'Description must be at least 10 characters').trim(),
  features: z.preprocess((val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return val.split(',').map((s) => s.trim()).filter(Boolean); }
    }
    return val;
  }, z.array(z.string()).optional().default([])),
  imageUrl: z
    .string()
    .trim()
    .refine((val) => !val || /^https?:\/\/.+/i.test(val) || val.startsWith('/uploads/'), {
      message: 'Invalid image URL format. Please provide a valid HTTP/HTTPS URL.',
    })
    .optional()
    .nullable(),
  displayOrder: z.preprocess((val) => (val !== undefined ? Number(val) : 0), z.number().int()).default(0),
  isActive: z.preprocess((val) => (val === 'false' || val === false ? false : true), z.boolean()).default(true),
  seoTitle: z.string().trim().optional().default(''),
  seoDescription: z.string().trim().optional().default(''),
});

export const serviceUpdateSchema = serviceCreateSchema.partial();

// Gallery Schemas
export const galleryCreateSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(150).trim(),
  description: z.string().trim().optional().default(''),
  category: z.string().min(2, 'Category is required').trim(),
  imageUrl: z.string().optional(),
  displayOrder: z.preprocess((val) => (val !== undefined ? Number(val) : 0), z.number().int()).default(0),
  isActive: z.preprocess((val) => (val === 'false' || val === false ? false : true), z.boolean()).default(true),
});

export const galleryUpdateSchema = galleryCreateSchema.partial();

// Enquiry Schemas
export const enquiryCreateSchema = z.object({
  customerName: z.string().min(2, 'Customer name must be at least 2 characters').max(100).trim(),
  phone: z.string().min(7, 'Please enter a valid phone number').max(20).trim(),
  email: z.string().email('Please enter a valid email address').trim().toLowerCase(),
  serviceId: z.string().optional().nullable(),
  location: z.string().max(200).trim().optional().default(''),
  message: z.string().min(5, 'Message must be at least 5 characters').max(2000).trim(),
});

export const enquiryStatusSchema = z.object({
  status: z.enum(ENQUIRY_STATUS, {
    errorMap: () => ({ message: `Status must be one of: ${ENQUIRY_STATUS.join(', ')}` }),
  }),
});

export const enquiryNotesSchema = z.object({
  adminNotes: z.string().max(3000).trim(),
});

// Settings Schema
export const settingsUpdateSchema = z.object({
  companyName: z.string().min(2).max(100).trim().optional(),
  tagline: z.string().max(200).trim().optional(),
  aboutDescription: z.string().min(10).trim().optional(),
  vision: z.string().trim().optional(),
  mission: z.string().trim().optional(),
  phoneNumbers: z.array(z.string().trim()).optional(),
  emailAddresses: z.array(z.string().email().trim()).optional(),
  whatsappNumber: z.string().trim().optional(),
  address: z.string().trim().optional(),
  mapUrl: z.string().trim().optional(),
  workingHours: z.string().trim().optional(),
  socialLinks: z
    .object({
      facebook: z.string().trim().optional(),
      instagram: z.string().trim().optional(),
      linkedin: z.string().trim().optional(),
      youtube: z.string().trim().optional(),
      twitter: z.string().trim().optional(),
    })
    .optional(),
});
