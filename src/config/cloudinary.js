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
 * Determine file extension from buffer magic numbers, original filename, or mimetype
 */
function getExtension(buffer, originalFilename = '', mimetype = '') {
  if (originalFilename) {
    const ext = path.extname(originalFilename).toLowerCase();
    if (ext) return ext;
  }
  if (mimetype) {
    const mime = mimetype.toLowerCase();
    if (mime.includes('mp4')) return '.mp4';
    if (mime.includes('webm')) return '.webm';
    if (mime.includes('quicktime')) return '.mov';
    if (mime.includes('x-m4v') || mime.includes('m4v')) return '.m4v';
    if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
    if (mime.includes('png')) return '.png';
    if (mime.includes('webp')) return '.webp';
    if (mime.includes('gif')) return '.gif';
    if (mime.includes('avif')) return '.avif';
  }
  // Magic numbers fallback
  if (buffer.length > 8 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    return '.mp4';
  }
  if (buffer.length > 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return '.webm';
  }
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return '.jpg';
  }
  if (buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return '.png';
  }
  if (buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return '.webp';
  }
  if (buffer.length > 3 && buffer.toString('ascii', 0, 3) === 'GIF') {
    return '.gif';
  }
  return '.jpg';
}

/**
 * Determine mime type from buffer
 */
function getMimeType(buffer, originalFilename = '', mimetype = '') {
  if (mimetype) return mimetype;
  const ext = getExtension(buffer, originalFilename, mimetype);
  switch (ext) {
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.mov':
      return 'video/quicktime';
    case '.m4v':
      return 'video/x-m4v';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.avif':
      return 'image/avif';
    case '.jpg':
    case '.jpeg':
    default:
      return 'image/jpeg';
  }
}

/**
 * Save image or video buffer to local storage when Cloudinary is unavailable
 */
function saveBufferLocally(buffer, folder, options = {}) {
  const ext = getExtension(buffer, options.filename, options.mimetype);
  const isVideo = ['.mp4', '.webm', '.mov', '.m4v'].includes(ext);
  const resourceType = isVideo ? 'video' : 'image';
  const cleanFolder = folder.replace(/^mp_landscape\/?/, '') || (isVideo ? 'gallery' : 'services');
  const prefix = isVideo ? 'video' : 'media';
  const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;

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
    resource_type: resourceType,
    format: ext.replace('.', ''),
  };
}

/**
 * Resilient storage fallback (data URI or local disk)
 */
function saveResiliently(buffer, folder, options = {}) {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const mime = getMimeType(buffer, options.filename, options.mimetype);
    const isVideo = mime.startsWith('video/');
    const dataUri = `data:${mime};base64,${buffer.toString('base64')}`;
    return {
      secure_url: dataUri,
      public_id: `data_uri:${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      resource_type: isVideo ? 'video' : 'image',
      format: getExtension(buffer, options.filename, options.mimetype).replace('.', ''),
    };
  }

  try {
    return saveBufferLocally(buffer, folder, options);
  } catch (fsErr) {
    console.warn('⚠️ Local filesystem not writable (serverless/Vercel environment). Storing media as data URI.');
  }

  const mime = getMimeType(buffer, options.filename, options.mimetype);
  const isVideo = mime.startsWith('video/');
  const dataUri = `data:${mime};base64,${buffer.toString('base64')}`;
  return {
    secure_url: dataUri,
    public_id: `data_uri:${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    resource_type: isVideo ? 'video' : 'image',
    format: getExtension(buffer, options.filename, options.mimetype).replace('.', ''),
  };
}

/**
 * Upload a file buffer to Cloudinary with reliable resilient fallback
 * Supports both images and videos
 * @param {Buffer} buffer - File buffer from Multer memoryStorage
 * @param {string} folder - Target folder in Cloudinary
 * @param {Object} options - Upload options (filename, mimetype, resource_type)
 * @returns {Promise<{ secure_url: string, public_id: string, resource_type: string, format: string }>}
 */
export const uploadToCloudinary = (buffer, folder = 'mp_landscape/services', options = {}) => {
  return new Promise((resolve, reject) => {
    // If Cloudinary is not configured, save using resilient fallback
    if (!ENV.CLOUDINARY_CLOUD_NAME || !ENV.CLOUDINARY_API_KEY || !ENV.CLOUDINARY_API_SECRET) {
      console.warn('⚠️ Cloudinary credentials not configured; saving uploaded media via resilient fallback.');
      try {
        const result = saveResiliently(buffer, folder, options);
        return resolve(result);
      } catch (saveErr) {
        return reject(saveErr);
      }
    }

    const isVideo =
      options.resource_type === 'video' ||
      (options.mimetype && options.mimetype.startsWith('video/')) ||
      (options.filename && /\.(mp4|webm|mov|m4v)$/i.test(options.filename));

    const resourceType = isVideo ? 'video' : (options.resource_type || 'auto');

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) {
          console.warn('⚠️ Cloudinary stream upload error:', error.message || error);
          try {
            const fallbackResult = saveResiliently(buffer, folder, options);
            return resolve(fallbackResult);
          } catch (fallbackErr) {
            return reject(error);
          }
        }
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Delete an asset by public ID (handles Cloudinary and local files)
 * Supports deleting both image and video resource types
 * @param {string} publicId - Asset public ID
 * @param {string} resourceType - Asset resource type ('image' or 'video')
 * @returns {Promise<{ result: string }>}
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!publicId) return { result: 'ok' };

  if (publicId.startsWith('data_uri:') || publicId.startsWith('data:')) {
    return { result: 'ok' };
  }

  if (publicId.startsWith('local:')) {
    const relativePath = publicId.replace('local:', '');
    try {
      const bePath = path.resolve(__dirname, '../../uploads', relativePath);
      const fePath = path.resolve(__dirname, '../../../MPlandscape-FE/public/uploads', relativePath);
      if (fs.existsSync(bePath)) fs.unlinkSync(bePath);
      if (fs.existsSync(fePath)) fs.unlinkSync(fePath);
    } catch (err) {
      console.warn('⚠️ Failed to delete local media file:', err.message);
    }
    return { result: 'ok' };
  }

  if (!ENV.CLOUDINARY_CLOUD_NAME || !ENV.CLOUDINARY_API_KEY) {
    return { result: 'ok' };
  }

  try {
    const type = resourceType === 'video' || resourceType === 'VIDEO' ? 'video' : 'image';
    const result = await Promise.race([
      cloudinary.uploader.destroy(publicId, { resource_type: type }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Cloudinary destroy timeout')), 3000)),
    ]);
    return result;
  } catch (error) {
    console.error(`⚠️ Cloudinary deletion warning for ${publicId}:`, error.message);
    return { result: 'error', error: error.message };
  }
};

export default cloudinary;
