import multer from 'multer';

// Use memory storage for direct Cloudinary streaming (strictly no permanent local disk storage)
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    const error = new Error(
      `Invalid file format "${file.mimetype}". Only JPEG, PNG, WebP, and AVIF images are permitted.`
    );
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB maximum file size limit
    files: 10, // Max 10 files in multi-upload
  },
});

export const uploadSingleImage = (fieldName = 'image') => upload.single(fieldName);
export const uploadMultipleImages = (fieldName = 'images', maxCount = 10) =>
  upload.array(fieldName, maxCount);

export default upload;
