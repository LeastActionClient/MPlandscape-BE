import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ENV from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (ENV.CLOUDINARY_CLOUD_NAME && ENV.CLOUDINARY_API_KEY && ENV.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
    api_key: ENV.CLOUDINARY_API_KEY,
    api_secret: ENV.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/**
 * Determine file extension from image buffer magic numbers
 */
function getExtensionFromBuffer(buffer) {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return '.jpg';
  }
  if (buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return '.png';
  }
  if (buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return '.webp';
  }
  return '.png';
}

/**
 * Save image buffer to local storage when Cloudinary is unavailable or lacks write permissions
 * Saves to both backend uploads folder (served via static) and frontend public/uploads folder
 */
function saveBufferLocally(buffer, folder) {
  const ext = getExtensionFromBuffer(buffer);
  const cleanFolder = folder.replace(/^mp_landscape\/?/, '') || 'services';
  const filename = `service_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;

  // 1. Save to backend uploads folder
  const beDir = path.resolve(__dirname, '../../uploads', cleanFolder);
  if (!fs.existsSync(beDir)) {
    fs.mkdirSync(beDir, { recursive: true });
  }
  fs.writeFileSync(path.join(beDir, filename), buffer);

  // 2. Save to frontend public/uploads folder so Vite dev server and client can serve it directly
  const feDir = path.resolve(__dirname, '../../../MPlandscape-FE/public/uploads', cleanFolder);
  if (!fs.existsSync(feDir)) {
    fs.mkdirSync(feDir, { recursive: true });
  }
  fs.writeFileSync(path.join(feDir, filename), buffer);

  return {
    secure_url: `/uploads/${cleanFolder}/${filename}`,
    public_id: `local:${cleanFolder}/${filename}`,
  };
}

/**
 * Upload a file buffer to Cloudinary with reliable local fallback for development
 * @param {Buffer} buffer - File buffer from Multer memoryStorage
 * @param {string} folder - Target folder in Cloudinary
 * @returns {Promise<{ secure_url: string, public_id: string }>}
 */
export const uploadToCloudinary = (buffer, folder = 'mp_landscape/services') => {
  return new Promise((resolve, reject) => {
    // If Cloudinary is not configured, save the actual file locally
    if (!ENV.CLOUDINARY_CLOUD_NAME || !ENV.CLOUDINARY_API_KEY || !ENV.CLOUDINARY_API_SECRET) {
      console.warn('⚠️ Cloudinary credentials not configured; saving uploaded image locally.');
      try {
        const localResult = saveBufferLocally(buffer, folder);
        return resolve(localResult);
      } catch (saveErr) {
        return reject(saveErr);
      }
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary stream upload error:', error.message || error);
          if (
            ENV.NODE_ENV !== 'production' &&
            (error.http_code === 403 ||
              error.message?.includes('forbidden') ||
              error.message?.includes('permissions') ||
              error.message?.includes('status code - 403'))
          ) {
            console.warn(
              '⚠️ Cloudinary API key lacks write permissions; saving uploaded image locally.'
            );
            try {
              const localResult = saveBufferLocally(buffer, folder);
              return resolve(localResult);
            } catch (saveErr) {
              return reject(saveErr);
            }
          }
          return reject(error);
        }
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Delete an asset by public ID (handles Cloudinary and local files)
 * @param {string} publicId - Asset public ID
 * @returns {Promise<{ result: string }>}
 */
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return { result: 'ok' };

  if (publicId.startsWith('local:')) {
    const relativePath = publicId.replace('local:', '');
    try {
      const bePath = path.resolve(__dirname, '../../uploads', relativePath);
      const fePath = path.resolve(__dirname, '../../../MPlandscape-FE/public/uploads', relativePath);
      if (fs.existsSync(bePath)) fs.unlinkSync(bePath);
      if (fs.existsSync(fePath)) fs.unlinkSync(fePath);
    } catch (err) {
      console.warn('⚠️ Failed to delete local image file:', err.message);
    }
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
    return { result: 'error', error: error.message };
  }
};

export default cloudinary;
