const mongoose = require('mongoose');

const verificationTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true
    },
    token: {
      type: String,
      required: true,
      unique: true
    },
    type: {
      type: String,
      enum: ['email_verification', 'password_reset'],
      default: 'email_verification'
    },
    expiresAt: {
      type: Date,
      required: true
    },
    used: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Index for faster queries
verificationTokenSchema.index({ token: 1 });
verificationTokenSchema.index({ userId: 1 });
verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// TTL index - auto-delete expired tokens (handled by expiresAt field)

module.exports = mongoose.model('VerificationToken', verificationTokenSchema);
