const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    // User who performed the action
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false  // Optional for system-generated events
    },
    userRole: {
      type: String,
      required: true
    },
    username: {
      type: String,
      required: true
    },
    
    // Action details
    action: {
      type: String,
      required: true,
      enum: [
        'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 
        'PERMISSION_CHANGE', 'ROLE_ASSIGNMENT', 'SYSTEM_CONFIG',
        'BACKUP_CREATED', 'BACKUP_RESTORED', 'SECURITY_ALERT',
        'SYSTEM_START', 'SYSTEM_SHUTDOWN', 'DATABASE_MAINTENANCE'
      ]
    },
    
    // Resource that was affected
    resourceType: {
      type: String,
      required: true,
      enum: [
        'USER', 'SYSTEM_SETTING', 'PERMISSION', 'ROLE', 'BACKUP',
        'DATABASE', 'SECURITY', 'SYSTEM_MONITOR', 'AUDIT_LOG'
      ]
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId
    },
    resourceName: {
      type: String
    },
    
    // Details of the action
    description: {
      type: String,
      required: true
    },
    
    // IP address and user agent
    ipAddress: {
      type: String
    },
    userAgent: {
      type: String
    },
    
    // System information
    timestamp: {
      type: Date,
      default: Date.now
    },
    
    // Severity level
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'LOW'
    },
    
    // Success/failure status
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'WARNING'],
      default: 'SUCCESS'
    },
    
    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // For system-generated logs
    isSystemGenerated: {
      type: Boolean,
      default: false
    }
  },
  { 
    timestamps: true,
    collection: 'audit_logs'
  }
);

// Indexes for performance
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, timestamp: -1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });
auditLogSchema.index({ status: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

// Static method to log an action
auditLogSchema.statics.logAction = async function(logData) {
  try {
    const log = new this({
      ...logData,
      timestamp: new Date()
    });
    return await log.save();
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to avoid breaking main functionality
  }
};

// Static method to get system statistics
auditLogSchema.statics.getSystemStats = async function(timeRange = '24h') {
  const now = new Date();
  let startTime;
  
  switch(timeRange) {
    case '1h':
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  
  const stats = await this.aggregate([
    { $match: { timestamp: { $gte: startTime } } },
    {
      $group: {
        _id: null,
        totalLogs: { $sum: 1 },
        successCount: {
          $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] }
        },
        failureCount: {
          $sum: { $cond: [{ $eq: ['$status', 'FAILURE'] }, 1, 0] }
        },
        criticalCount: {
          $sum: { $cond: [{ $eq: ['$severity', 'CRITICAL'] }, 1, 0] }
        },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        totalLogs: 1,
        successCount: 1,
        failureCount: 1,
        criticalCount: 1,
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    }
  ]);
  
  return stats[0] || {
    totalLogs: 0,
    successCount: 0,
    failureCount: 0,
    criticalCount: 0,
    uniqueUserCount: 0
  };
};

// Static method to get recent activity
auditLogSchema.statics.getRecentActivity = async function(limit = 50) {
  return await this.find({})
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'username email')
    .lean();
};

// Static method to get security alerts
auditLogSchema.statics.getSecurityAlerts = async function(limit = 100) {
  return await this.find({
    $or: [
      { severity: 'CRITICAL' },
      { severity: 'HIGH' },
      { action: 'SECURITY_ALERT' },
      { status: 'FAILURE' }
    ]
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'username email')
    .lean();
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
