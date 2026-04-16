const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['General', 'Academic', 'Event', 'Holiday', 'Emergency', 'Fee'],
      default: 'General'
    },
    priority: {
      type: String,
      enum: ['Low', 'Normal', 'High', 'Urgent'],
      default: 'Normal'
    },
    targetRoles: [{
      type: String,
      enum: ['SystemAdmin', 'SchoolAdmin', 'Teacher', 'Student', 'Parent'],
      default: ['SystemAdmin', 'SchoolAdmin', 'Teacher', 'Student', 'Parent']
    }],
    targetGrades: [{
      type: String,
      enum: ['9', '10', '11', '12', 'All']
    }],
    targetSections: [String],
    readBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      readAt: {
        type: Date,
        default: Date.now
      }
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    published: {
      type: Boolean,
      default: false
    },
    publishStartDate: {
      type: Date
    },
    publishEndDate: {
      type: Date
    },
    attachments: [{
      filename: String,
      path: String,
      mimeType: String
    }]
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
announcementSchema.index({ published: 1, publishStartDate: 1, publishEndDate: 1 });
announcementSchema.index({ type: 1 });
announcementSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);
