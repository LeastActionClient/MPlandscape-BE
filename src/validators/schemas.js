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
  title: z.string().max(150).trim().optional().default('Landscape Project'),
  description: z.string().trim().optional().default(''),
  category: z.string().trim().optional().default('Outdoor Landscaping'),
  imageUrl: z.string().optional(),
  mediaType: z.enum(['IMAGE', 'VIDEO']).optional().default('IMAGE'),
  resourceType: z.string().optional().default('image'),
  format: z.string().optional().default(''),
  videoThumbnail: z.string().optional().default(''),
  displayOrder: z.preprocess((val) => (val !== undefined ? Number(val) : 0), z.number().int()).default(0),
  isActive: z.preprocess((val) => (val === 'false' || val === false ? false : true), z.boolean()).default(true),
});

export const galleryUpdateSchema = galleryCreateSchema.partial();

// Enquiry Schemas
export const enquiryCreateSchema = z
  .object({
    customerName: z
      .string({ required_error: 'Please enter a valid name using letters only.' })
      .trim()
      .refine((val) => val.length > 0, {
        message: 'Please enter a valid name using letters only.',
      })
      .refine((val) => /^[a-zA-Z\s]+$/.test(val), {
        message: 'Please enter a valid name using letters only.',
      })
      .refine((val) => val.trim().length >= 2, {
        message: 'Please enter a valid name using letters only.',
      })
      .refine((val) => val.trim().length <= 60, {
        message: 'Name cannot exceed 60 characters',
      })
      .transform((val) => val.trim().replace(/\s+/g, ' ')),

    phone: z
      .string({ required_error: 'Please enter a valid 10-digit mobile number.' })
      .trim()
      .refine((val) => /^[0-9]{10}$/.test(val), {
        message: 'Please enter a valid 10-digit mobile number.',
      })
      .refine((val) => !/^(\d)\1{9}$/.test(val), {
        message: 'Please enter a valid 10-digit mobile number.',
      }),

    email: z
      .string({ required_error: 'Email address is required' })
      .trim()
      .toLowerCase()
      .refine((val) => val.length > 0, {
        message: 'Please enter a valid email address',
      })
      .refine((val) => !/\s/.test(val), {
        message: 'Email address cannot contain spaces',
      })
      .refine((val) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val), {
        message: 'Please enter a valid email address (e.g. customer@example.com)',
      }),

    serviceId: z
      .string()
      .optional()
      .nullable()
      .refine((val) => !val || /^[0-9a-fA-F]{24}$/.test(val), {
        message: 'Invalid service selected. The service ID format is invalid.',
      }),

    location: z
      .string()
      .trim()
      .max(150, 'Project location cannot exceed 150 characters')
      .optional()
      .default('')
      .refine((val) => !val || /^[\p{L}\p{M}\p{N}\s,.\-\/#&'()]+$/u.test(val), {
        message: 'Location contains invalid characters',
      })
      .refine((val) => !val || /[\p{L}\p{M}\p{N}]/u.test(val), {
        message: 'Please enter a valid location or address',
      })
      .refine((val) => !val || !/(.)\1{4,}/i.test(val), {
        message: 'Please enter a valid location without repeated characters',
      }),

    message: z
      .string({ required_error: 'Project details are required' })
      .trim()
      .min(10, 'Message must be at least 10 characters')
      .max(1000, 'Project details cannot exceed 1,000 characters')
      .refine((val) => !/(.)\1{4,}/i.test(val), {
        message: 'Please provide a meaningful description without repeated characters',
      })
      .refine(
        (val) => {
          const unique = new Set(val.replace(/\s/g, '').split('')).size;
          return unique >= 3;
        },
        {
          message: 'Please provide meaningful project requirements',
        }
      ),

    website_hp: z.string().optional().default(''),
  })
  .strict();

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
