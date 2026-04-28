const path = require('path');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

const uploadBufferToCloudinary = (fileBuffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      return resolve(result);
    });
    stream.end(fileBuffer);
  });

exports.uploadMaterialFileToCloudinary = async (req, res, next) => {
  try {
    console.log('[uploadMaterialFileToCloudinary] REQ RECEIVED', { hasFile: !!req.file, bodyKeys: Object.keys(req.body || {}) });
    if (!req.file) {
      console.log('[uploadMaterialFileToCloudinary] No file in req. Proceeding to next().');
      return next();
    }

    console.log('[uploadMaterialFileToCloudinary] Cloudinary configured?', isCloudinaryConfigured());
    if (!isCloudinaryConfigured()) {
      return res.status(500).json({
        success: false,
        message: 'File storage is not configured. Missing Cloudinary credentials.',
      });
    }

    const extension = path.extname(req.file.originalname || '').toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension);
    
    console.log('[uploadMaterialFileToCloudinary] Starting Cloudinary upload...', { size: req.file.size, type: req.file.mimetype });
    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: 'hu-sims/materials',
      resource_type: isImage ? 'image' : 'raw',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    });

    req.uploadedFile = {
      publicId: uploadResult.public_id,
      fileUrl: uploadResult.secure_url,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileMimeType: req.file.mimetype,
    };

    console.log('[uploadMaterialFileToCloudinary] Upload SUCCESS, proceeding to next()');
    return next();
  } catch (error) {
    console.error('[uploadMaterialFileToCloudinary] ERROR', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload material to cloud storage',
      error: error.message,
    });
  }
};

exports.uploadSubmissionFileToCloudinary = async (req, res, next) => {
  try {
    if (!req.file) return next();

    if (!isCloudinaryConfigured()) {
      return res.status(500).json({
        success: false,
        message: 'File storage is not configured. Missing Cloudinary credentials.',
      });
    }

    const extension = path.extname(req.file.originalname || '').toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension);
    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: 'hu-sims/material-submissions',
      resource_type: isImage ? 'image' : 'raw',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    });

    req.uploadedSubmissionFile = {
      publicId: uploadResult.public_id,
      fileUrl: uploadResult.secure_url,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileMimeType: req.file.mimetype,
    };

    return next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to upload submission to cloud storage',
      error: error.message,
    });
  }
};
