const path = require('path');
const { randomUUID } = require('crypto');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

const sanitizeFileName = (value) =>
  String(value || 'document')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\.+/, '')
    .slice(0, 120);

const detectExtension = (mimeType, originalName) => {
  if (mimeType === 'application/pdf') return '.pdf';
  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';

  const fallbackExtension = path.extname(String(originalName || '')).toLowerCase();
  return fallbackExtension || '.bin';
};

const toPosixPath = (value) => value.split(path.sep).join('/');
const CLOUDINARY_KEY_PREFIX = 'cloudinary:';

const uploadBufferToCloudinary = (fileBuffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      return resolve(result);
    });
    stream.end(fileBuffer);
  });
exports.ALLOWED_ACADEMIC_DOCUMENT_MIME_TYPES = ALLOWED_MIME_TYPES;

exports.saveAcademicDocumentFile = async (file) => {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw new Error('Invalid academic document file payload');
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new Error(`Unsupported academic document type: ${file.mimetype}`);
  }
  const fallbackExtension = detectExtension(file.mimetype, file.originalname);
  const safeOriginalName = sanitizeFileName(file.originalname || `document${fallbackExtension}`);

  if (!isCloudinaryConfigured() && process.env.NODE_ENV === 'test') {
    const mockPublicId = `hu-sims/students/academic-documents/test-${Date.now()}-${randomUUID()}`;
    return {
      fileName: safeOriginalName,
      fileType: file.mimetype,
      fileSize: file.size,
      storageKey: `${CLOUDINARY_KEY_PREFIX}${mockPublicId}`,
      fileUrl: `https://res.cloudinary.com/demo/raw/upload/${mockPublicId}`
    };
  }

  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured for academic document uploads');
  }

  const extension = path.extname(String(file.originalname || '')).toLowerCase();
  const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension);
  const uploadResult = await uploadBufferToCloudinary(file.buffer, {
    folder: 'hu-sims/students/academic-documents',
    resource_type: isImage ? 'image' : 'raw',
    use_filename: true,
    unique_filename: true,
    overwrite: false,
  });

  const storageKey = toPosixPath(`${CLOUDINARY_KEY_PREFIX}${uploadResult.public_id}`);
  return {
    fileName: safeOriginalName,
    fileType: file.mimetype,
    fileSize: file.size,
    storageKey,
    fileUrl: uploadResult.secure_url
  };
};

exports.resolveAcademicDocumentAbsolutePath = (storageKey) => {
  throw new Error(`Local academic document path resolution is no longer supported: ${storageKey || 'unknown'}`);
};

exports.deleteAcademicDocumentFile = async (storageKey) => {
  if (!storageKey || typeof storageKey !== 'string') return;

  if (storageKey.startsWith(CLOUDINARY_KEY_PREFIX)) {
    if (!isCloudinaryConfigured()) return;
    const publicId = storageKey.slice(CLOUDINARY_KEY_PREFIX.length);
    if (!publicId) return;

    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }).catch(() =>
      cloudinary.uploader.destroy(publicId, { resource_type: 'image' }),
    );
    return;
  }

  return;
};
