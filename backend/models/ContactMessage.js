const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['New', 'Read', 'Replied', 'Archived'],
      default: 'New'
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium'
    },
    ipAddress: {
      type: String
    },
    userAgent: {
      type: String
    },
    // Admin response
    adminResponse: {
      type: String
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: {
      type: Date
    },
    // Email notification status
    emailSent: {
      type: Boolean,
      default: false
    },
    emailSentAt: {
      type: Date
    }
  },
  { timestamps: true }
);

// Indexes for better query performance
contactMessageSchema.index({ status: 1, createdAt: -1 });
contactMessageSchema.index({ email: 1 });
contactMessageSchema.index({ priority: 1, status: 1 });

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
