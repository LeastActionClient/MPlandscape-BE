import { v2 as cloudinary } from 'cloudinary';
import ENV from './env.js';

if (ENV.CLOUDINARY_CLOUD_NAME && ENV.CLOUDINARY_API_KEY && ENV.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
    api_key: ENV.CLOUDINARY_API_KEY,
    api_secret: ENV.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} buffer - File buffer from Multer memoryStorage
 * @param {string} folder - Target folder in Cloudinary
 * @returns {Promise<{ secure_url: string, public_id: string }>}
 */
export const uploadToCloudinary = (buffer, folder = 'mp_landscape') => {
  return new Promise((resolve, reject) => {
    // If Cloudinary is not configured (e.g., local dev or testing without keys), return a safe mock/placeholder
    if (!ENV.CLOUDINARY_CLOUD_NAME || !ENV.CLOUDINARY_API_KEY) {
      console.warn('⚠️ Cloudinary not fully configured in env; utilizing fallback mock upload.');
      const mockId = `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      return resolve({
        secure_url: `https://images.unsplash.com/photo-1558904541-efa8c4a5af9b?auto=format&fit=crop&w=1200&q=80`,
        public_id: `${folder}/${mockId}`,
      });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary stream upload error:', error);
          return reject(error);
        }
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Delete an asset from Cloudinary by public ID
 * Handles errors gracefully to avoid breaking database cleanup operations
 * @param {string} publicId - Cloudinary asset public ID
 * @returns {Promise<{ result: string }>}
 */
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId || publicId.startsWith('mock_') || publicId.includes('/mock_')) {
    return { result: 'ok' };
  }

  if (!ENV.CLOUDINARY_CLOUD_NAME || !ENV.CLOUDINARY_API_KEY) {
    return { result: 'ok' };
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error(`⚠️ Cloudinary deletion warning for ${publicId}:`, error.message);
    // Return error status rather than crashing calling process
    return { result: 'error', error: error.message };
  }
};

export default cloudinary;
