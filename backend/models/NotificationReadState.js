const mongoose = require('mongoose');

const notificationReadStateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

notificationReadStateSchema.index({ user: 1, key: 1 }, { unique: true });
notificationReadStateSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model('NotificationReadState', notificationReadStateSchema);
