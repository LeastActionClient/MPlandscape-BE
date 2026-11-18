import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
  ADMIN_NAME: z.string().default('Super Admin'),
  ADMIN_EMAIL: z.string().email().default('admin@mplandscape.com'),
  ADMIN_PASSWORD: z.string().default('AdminSecurePass123!'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid or missing environment configuration:');
    result.error.issues.forEach((issue) => {
      console.error(` - ${issue.path.join('.')}: ${issue.message}`);
    });
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid environment configuration in production');
    }
  }
  return result.success
    ? result.data
    : {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: parseInt(process.env.PORT || '5000', 10),
        MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/mp_landscape',
        FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
        JWT_SECRET: process.env.JWT_SECRET || 'mp_landscape_super_secret_jwt_key_2026_fallback',
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
        ADMIN_NAME: process.env.ADMIN_NAME || 'Super Admin',
        ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@mplandscape.com',
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'AdminSecurePass123!',
      };
};

export const ENV = parseEnv();
export default ENV;
