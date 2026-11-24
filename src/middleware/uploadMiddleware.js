import multer from 'multer';

// Use memory storage for direct Cloudinary streaming (strictly no permanent local disk storage)
const storage = multer.memoryStorage();

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
];

export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
  'video/mp4v-es',
];

export const ALLOWED_MEDIA_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  ...ALLOWED_VIDEO_MIME_TYPES,
];

const imageFileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    const error = new Error(
      `Invalid file format "${file.mimetype}". Only JPEG, PNG, WebP, GIF, and AVIF images are permitted.`
    );
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

const mediaFileFilter = (req, file, cb) => {
  const mime = file.mimetype.toLowerCase();
  if (ALLOWED_MEDIA_MIME_TYPES.includes(mime)) {
    cb(null, true);
  } else {
    const error = new Error(
      `Invalid file format "${file.mimetype}". Supported formats: Images (JPEG, PNG, WebP, GIF, AVIF) and Videos (MP4, WebM, MOV, M4V).`
    );
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

export const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB image limit
    files: 10,
  },
});

export const uploadMedia = multer({
  storage,
  fileFilter: mediaFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max file size for videos/media
    files: 10,
  },
});

export const uploadSingleImage = (fieldName = 'image') => upload.single(fieldName);
export const uploadMultipleImages = (fieldName = 'images', maxCount = 10) =>
  upload.array(fieldName, maxCount);

export const uploadSingleMedia = (fieldName = 'media') => uploadMedia.single(fieldName);
export const uploadMultipleMedia = (fieldName = 'media', maxCount = 10) =>
  uploadMedia.array(fieldName, maxCount);

export default upload;
