const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

const UPLOADS_ROOT_DIR = path.join(__dirname, '..', 'uploads');
const BASE_UPLOAD_DIR = path.join(UPLOADS_ROOT_DIR, 'students', 'academic-documents');
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
const ensurePathInsideUploads = (absolutePath) => {
  const normalizedRoot = path.resolve(UPLOADS_ROOT_DIR);
  const normalizedPath = path.resolve(absolutePath);
  const rootWithSep = normalizedRoot.endsWith(path.sep) ? normalizedRoot : `${normalizedRoot}${path.sep}`;

  if (normalizedPath !== normalizedRoot && !normalizedPath.startsWith(rootWithSep)) {
    throw new Error('Invalid academic document storage path');
  }

  return normalizedPath;
};

exports.ALLOWED_ACADEMIC_DOCUMENT_MIME_TYPES = ALLOWED_MIME_TYPES;

exports.saveAcademicDocumentFile = async (file) => {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw new Error('Invalid academic document file payload');
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new Error(`Unsupported academic document type: ${file.mimetype}`);
  }

  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const targetDir = path.join(BASE_UPLOAD_DIR, year, month);

  await fs.mkdir(targetDir, { recursive: true });

  const extension = detectExtension(file.mimetype, file.originalname);
  const safeOriginalName = sanitizeFileName(file.originalname || `document${extension}`);
  const storageFileName = `${Date.now()}-${randomUUID()}${extension}`;
  const absolutePath = path.join(targetDir, storageFileName);

  await fs.writeFile(absolutePath, file.buffer);

  const storageKey = toPosixPath(
    path.join('students', 'academic-documents', year, month, storageFileName)
  );

  return {
    fileName: safeOriginalName,
    fileType: file.mimetype,
    fileSize: file.size,
    storageKey,
    fileUrl: `/uploads/${storageKey}`
  };
};

exports.resolveAcademicDocumentAbsolutePath = (storageKey) => {
  if (!storageKey || typeof storageKey !== 'string') {
    throw new Error('Invalid academic document storage key');
  }

  const normalizedStorageKey = storageKey.replace(/^\/+/, '');
  return ensurePathInsideUploads(path.join(UPLOADS_ROOT_DIR, normalizedStorageKey));
};

exports.deleteAcademicDocumentFile = async (storageKey) => {
  if (!storageKey || typeof storageKey !== 'string') return;

  const absolutePath = exports.resolveAcademicDocumentAbsolutePath(storageKey);
  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
};
