const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Permission = require('../models/Permission');
const { PERMISSIONS, RESOURCES } = require('../models/Permission');
const { findUserByFlexibleId, normalizeUserId } = require('../utils/userLookup');
const { loadSystemSettings } = require('../utils/systemSettings');

/**
 * Get client IP from request
 */
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.toString()?.split(',')[0]?.trim() ||
    req.headers['x-real-ip']?.toString() ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    '';
};

/**
 * Check if IP matches CIDR pattern or exact match
 */
const isIpAllowed = (clientIp, whitelist) => {
  if (!Array.isArray(whitelist) || whitelist.length === 0) {
    return true; // No whitelist = allow all
  }

  if (!clientIp) return false;

  const normalizedClientIp = clientIp.replace(/^::ffff:/, '');

  return whitelist.some(allowedIp => {
    const ip = allowedIp.trim();
    if (!ip) return false;

    // Exact match
    if (ip === normalizedClientIp) return true;

    // CIDR notation (e.g., 192.168.1.0/24)
    if (ip.includes('/')) {
      const [rangeIp, prefix] = ip.split('/');
      const prefixLength = parseInt(prefix, 10);
      if (isNaN(prefixLength)) return false;

      // Simple IPv4 CIDR check
      if (normalizedClientIp.includes('.') && rangeIp.includes('.')) {
        const clientParts = normalizedClientIp.split('.').map(Number);
        const rangeParts = rangeIp.split('.').map(Number);

        const clientNum = (clientParts[0] << 24) + (clientParts[1] << 16) +
                         (clientParts[2] << 8) + clientParts[3];
        const rangeNum = (rangeParts[0] << 24) + (rangeParts[1] << 16) +
                        (rangeParts[2] << 8) + rangeParts[3];

        const mask = -1 << (32 - prefixLength);
        return (clientNum & mask) === (rangeNum & mask);
      }
    }

    // Wildcard match (e.g., 192.168.1.*)
    if (ip.includes('*')) {
      const pattern = ip.replace(/\*/g, '\\d+');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(normalizedClientIp);
    }

    return false;
  });
};

/**
 * IP Whitelist middleware
 */
const checkIpWhitelist = async (req, res, next) => {
  try {
    const settings = await loadSystemSettings();
    const whitelist = settings?.securitySettings?.ipWhitelist || [];

    // Skip if no whitelist configured
    if (whitelist.length === 0) {
      return next();
    }

    const clientIp = getClientIp(req);

    if (!isIpAllowed(clientIp, whitelist)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Your IP address is not whitelisted',
        ip: clientIp
      });
    }

    next();
  } catch (error) {
    console.error('IP whitelist check error:', error);
    // Fail open (allow) on error to prevent lockouts
    next();
  }
};
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await findUserByFlexibleId(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is active
    if (user.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'Account is not active'
      });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Email not verified'
      });
    }

    const userData = typeof user.toObject === 'function' ? user.toObject() : { ...user };
    delete userData.password;

    req.user = {
      ...userData,
      _id: normalizeUserId(userData._id || decoded.id),
      id: normalizeUserId(userData._id || decoded.id),
    };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

/**
 * Authorize by role - only allow specific roles
 */
const authorize = (...roles) => {
  const normalizedRoles = roles.flat();
  return (req, res, next) => {
    if (!normalizedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

/**
 * Check permission - verify user has specific permission on a resource
 * Usage: checkPermission('READ', 'users')
 */
const checkPermission = (action, resource) => {
  return async (req, res, next) => {
    try {
      const hasPermission = await Permission.hasPermission(req.user.role, resource, action);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Permission denied: ${action} on ${resource}`
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error checking permissions',
        error: error.message
      });
    }
  };
};

/**
 * Check if user can perform action on specific record
 * For example, teacher can only edit grades they created
 */
const checkRecordOwnership = (model, field = 'createdBy') => {
  return async (req, res, next) => {
    try {
      const record = await model.findById(req.params.id);
      
      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Record not found'
        });
      }

      // SystemAdmin can access all records they have permissions for
      if (req.user.role === 'SystemAdmin') {
        req.record = record;
        return next();
      }

      // Check if user owns the record
      const ownerId = record[field];
      
      if (ownerId && ownerId.toString() !== req.user.id) {
        // For teachers, also check if they teach the student's class
        if (req.user.role === 'Teacher') {
          // Additional logic can be added here
        }
        
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this record'
        });
      }

      req.record = record;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error checking record ownership',
        error: error.message
      });
    }
  };
};

/**
 * Check if user can perform action on a student
 * Teachers can only access students in their classes
 */
const checkStudentAccess = async (req, res, next) => {
  try {
    // SystemAdmin has access to student account management only
    if (req.user.role === 'SystemAdmin') {
      return next();
    }

    const Student = require('../models/User');
    const studentId = req.params.studentId || req.body.studentId;

    if (!studentId) {
      return next();
    }

    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (req.user.role === 'Teacher') {
      // Check if teacher teaches this student's class
      // This would need implementation based on your class/teacher relationship
      // For now, we'll allow access
    }

    if (req.user.role === 'Parent') {
      // Check if this is their child
      if (!req.user.studentIds.includes(studentId)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this student'
        });
      }
    }

    if (req.user.role === 'Student') {
      // Student can only access their own record
      if (studentId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this student'
        });
      }
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking student access',
      error: error.message
    });
  }
};

module.exports = {
  protect,
  authorize,
  checkPermission,
  checkRecordOwnership,
  checkStudentAccess,
  checkIpWhitelist,
  getClientIp,
  isIpAllowed,
  PERMISSIONS,
  RESOURCES
};
