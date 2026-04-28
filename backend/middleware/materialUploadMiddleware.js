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

    return next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to upload material to cloud storage',
      error: error.message,
    });
  }
};
