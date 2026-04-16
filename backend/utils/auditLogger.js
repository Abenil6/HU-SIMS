const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * Log user login
 */
const logUserLogin = async (req, user, status = 'SUCCESS') => {
  await AuditLog.logAction({
    userId: user._id,
    userRole: user.role,
    username: user.username,
    action: 'LOGIN',
    resourceType: 'USER',
    resourceId: user._id,
    resourceName: user.username,
    description: `User ${user.username} logged in`,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    status: status,
    severity: status === 'SUCCESS' ? 'LOW' : 'MEDIUM'
  });
};

/**
 * Log user logout
 */
const logUserLogout = async (req, user) => {
  await AuditLog.logAction({
    userId: user._id,
    userRole: user.role,
    username: user.username,
    action: 'LOGOUT',
    resourceType: 'USER',
    resourceId: user._id,
    resourceName: user.username,
    description: `User ${user.username} logged out`,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    status: 'SUCCESS',
    severity: 'LOW'
  });
};

/**
 * Log user management action
 */
const logUserAction = async (req, action, targetUser, description, status = 'SUCCESS') => {
  await AuditLog.logAction({
    userId: req.user._id,
    userRole: req.user.role,
    username: req.user.username,
    action: action,
    resourceType: 'USER',
    resourceId: targetUser._id,
    resourceName: targetUser.username,
    description: description,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    status: status,
    severity: action === 'DELETE' ? 'HIGH' : 'MEDIUM',
    metadata: {
      targetRole: targetUser.role,
      targetEmail: targetUser.email
    }
  });
};

/**
 * Log role assignment
 */
const logRoleAssignment = async (req, targetUser, oldRole, newRole) => {
  await AuditLog.logAction({
    userId: req.user._id,
    userRole: req.user.role,
    username: req.user.username,
    action: 'ROLE_ASSIGNMENT',
    resourceType: 'ROLE',
    resourceId: targetUser._id,
    resourceName: targetUser.username,
    description: `Changed role for ${targetUser.username} from ${oldRole} to ${newRole}`,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    status: 'SUCCESS',
    severity: 'HIGH',
    metadata: {
      oldRole: oldRole,
      newRole: newRole,
      targetEmail: targetUser.email
    }
  });
};

/**
 * Log system configuration change
 */
const logSystemConfigChange = async (req, configKey, oldValue, newValue) => {
  await AuditLog.logAction({
    userId: req.user._id,
    userRole: req.user.role,
    username: req.user.username,
    action: 'SYSTEM_CONFIG',
    resourceType: 'SYSTEM_SETTING',
    resourceName: configKey,
    description: `Changed system setting ${configKey}`,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    status: 'SUCCESS',
    severity: 'MEDIUM',
    metadata: {
      configKey: configKey,
      oldValue: oldValue,
      newValue: newValue
    }
  });
};

/**
 * Log security event
 */
const logSecurityEvent = async (description, severity = 'MEDIUM', metadata = {}) => {
  await AuditLog.logAction({
    userId: null,
    userRole: 'SYSTEM',
    username: 'System',
    action: 'SECURITY_ALERT',
    resourceType: 'SECURITY',
    description: description,
    status: 'WARNING',
    severity: severity,
    isSystemGenerated: true,
    metadata: metadata
  });
};

/**
 * Log system event
 */
const logSystemEvent = async (action, description, severity = 'LOW', metadata = {}) => {
  await AuditLog.logAction({
    userId: null,
    userRole: 'SYSTEM',
    username: 'System',
    action: action,
    resourceType: 'SYSTEM_MONITOR',
    description: description,
    status: 'SUCCESS',
    severity: severity,
    isSystemGenerated: true,
    metadata: metadata
  });
};

/**
 * Middleware to automatically log user actions
 */
const auditMiddleware = (action, resourceType) => {
  return async (req, res, next) => {
    // Store original res.json
    const originalJson = res.json;
    
    // Override res.json to intercept response
    res.json = function(data) {
      // Log the action after response is sent
      setImmediate(async () => {
        try {
          const status = res.statusCode >= 400 ? 'FAILURE' : 'SUCCESS';
          const severity = req.method === 'DELETE' ? 'HIGH' : 'MEDIUM';
          
          await AuditLog.logAction({
            userId: req.user?._id,
            userRole: req.user?.role || 'ANONYMOUS',
            username: req.user?.username || 'Anonymous',
            action: action,
            resourceType: resourceType,
            resourceId: req.params.id || null,
            resourceName: req.params.id || req.originalUrl,
            description: `${action} ${resourceType} - ${req.originalUrl}`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            status: status,
            severity: severity,
            metadata: {
              method: req.method,
              url: req.originalUrl,
              statusCode: res.statusCode,
              body: req.body
            }
          });
        } catch (error) {
          console.error('Audit logging error:', error);
        }
      });
      
      // Call original res.json
      return originalJson.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  logUserLogin,
  logUserLogout,
  logUserAction,
  logRoleAssignment,
  logSystemConfigChange,
  logSecurityEvent,
  logSystemEvent,
  auditMiddleware
};
