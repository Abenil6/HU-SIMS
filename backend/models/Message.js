const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    recipients: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }],
    messageType: {
      type: String,
      enum: ['Direct', 'Broadcast', 'System'],
      required: true
    },
    category: {
      type: String,
      enum: ['General', 'Academic', 'Attendance', 'Emergency', 'Announcement', 'Reminder'],
      default: 'General'
    },
    subject: {
      type: String,
      trim: true
    },
    content: {
      type: String,
      required: true
    },
    // For broadcast messages
    broadcastFilters: {
      grade: String,
      section: String,
      role: String  // 'Student', 'Parent', 'Teacher'
    },
    // Read status
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
    starredBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      starredAt: {
        type: Date,
        default: Date.now
      }
    }],
    deletedBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      deletedAt: {
        type: Date,
        default: Date.now
      }
    }],
    // Reply to
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    // Priority
    priority: {
      type: String,
      enum: ['Low', 'Normal', 'High', 'Urgent'],
      default: 'Normal'
    },
    // Attachment reference (future feature)
    attachments: [{
      filename: String,
      path: String,
      mimeType: String
    }],
    // Status
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Indexes for efficient queries
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ recipients: 1, createdAt: -1 });
messageSchema.index({ 'starredBy.user': 1 });
messageSchema.index({ 'deletedBy.user': 1 });
messageSchema.index({ messageType: 1 });
messageSchema.index({ category: 1 });
messageSchema.index({ 'broadcastFilters.grade': 1 });

// Static method to get inbox for a user
messageSchema.statics.getInbox = async function(userId, page = 1, limit = 20) {
  const messages = await this.find({
    recipients: userId,
    isActive: true
  })
    .populate('sender', 'firstName lastName role')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await this.countDocuments({
    recipients: userId,
    isActive: true
  });

  // Add unread count
  const unreadCount = await this.countDocuments({
    recipients: userId,
    isActive: true,
    'readBy.user': { $ne: userId }
  });

  return {
    messages,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
      unreadCount
    }
  };
};

// Static method to send broadcast
messageSchema.statics.sendBroadcast = async function(senderId, recipients, subject, content, category, filters = {}) {
  const message = new this({
    sender: senderId,
    recipients,
    messageType: 'Broadcast',
    category,
    subject,
    content,
    broadcastFilters: filters
  });

  await message.save();
  return message;
};

// Static method to send system notification
messageSchema.statics.sendSystemNotification = async function(recipients, subject, content, priority = 'Normal') {
  const message = new this({
    sender: null,  // System user
    recipients,
    messageType: 'System',
    category: 'Announcement',
    subject,
    content,
    priority
  });

  await message.save();
  return message;
};

module.exports = mongoose.model('Message', messageSchema);
