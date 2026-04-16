const mongoose = require('mongoose');

// Permission types
const PERMISSIONS = {
  READ: 'READ',
  WRITE: 'WRITE',
  EDIT: 'EDIT',
  APPROVE: 'APPROVE',
  DELETE: 'DELETE',
  MANAGE: 'MANAGE',
  ADMIN: 'ADMIN'
};

// Resource types
const RESOURCES = {
  USERS: 'users',
  STUDENTS: 'students',
  TEACHERS: 'teachers',
  PARENTS: 'parents',
  ACADEMIC_RECORDS: 'academic-records',
  ATTENDANCE: 'attendance',
  TIMETABLES: 'timetables',
  REPORTS: 'reports',
  MESSAGES: 'messages',
  CERTIFICATES: 'certificates',
  SETTINGS: 'settings'
};

const ROLE_METADATA = {
  SystemAdmin: {
    name: 'System Administrator',
    description: 'Technical system management, user accounts, security, backups, and monitoring'
  },
  SchoolAdmin: {
    name: 'School Administrator',
    description: 'School operations, academic administration, and day-to-day management'
  },
  Teacher: {
    name: 'Teacher',
    description: 'Classroom operations, grading, attendance, and student communication'
  },
  Student: {
    name: 'Student',
    description: 'Access to personal academic information and school communication'
  },
  Parent: {
    name: 'Parent',
    description: 'Access to linked child records, progress, and school communication'
  }
};

const permissionSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      unique: true,
      enum: ['SystemAdmin', 'SchoolAdmin', 'Teacher', 'Student', 'Parent']
    },
    permissions: {
      type: Map,
      of: [String],
      default: {}
    }
  },
  { timestamps: true }
);

// Predefined role permissions
const defaultPermissions = {
  SystemAdmin: {
    // Technical/System responsibilities only
    [RESOURCES.USERS]: Object.values(PERMISSIONS), // User account creation and role assignment
    [RESOURCES.STUDENTS]: [PERMISSIONS.READ, PERMISSIONS.WRITE, PERMISSIONS.EDIT], // Account management only
    [RESOURCES.TEACHERS]: [PERMISSIONS.READ, PERMISSIONS.WRITE, PERMISSIONS.EDIT], // Account management only
    [RESOURCES.PARENTS]: [PERMISSIONS.READ, PERMISSIONS.WRITE, PERMISSIONS.EDIT], // Account management only
    [RESOURCES.MESSAGES]: [PERMISSIONS.READ, PERMISSIONS.WRITE],
    [RESOURCES.SETTINGS]: Object.values(PERMISSIONS), // System configuration and settings management
    // REMOVED: School-related operational tasks
    // [RESOURCES.ACADEMIC_RECORDS]: Object.values(PERMISSIONS),
    // [RESOURCES.ATTENDANCE]: Object.values(PERMISSIONS),
    // [RESOURCES.TIMETABLES]: Object.values(PERMISSIONS),
    // [RESOURCES.REPORTS]: Object.values(PERMISSIONS),
    // [RESOURCES.MESSAGES]: Object.values(PERMISSIONS),
    // [RESOURCES.CERTIFICATES]: Object.values(PERMISSIONS),
  },
  SchoolAdmin: {
    [RESOURCES.USERS]: [PERMISSIONS.READ, PERMISSIONS.WRITE, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    [RESOURCES.STUDENTS]: Object.values(PERMISSIONS),
    [RESOURCES.TEACHERS]: [PERMISSIONS.READ, PERMISSIONS.WRITE, PERMISSIONS.EDIT],
    [RESOURCES.PARENTS]: Object.values(PERMISSIONS),
    [RESOURCES.ACADEMIC_RECORDS]: Object.values(PERMISSIONS),
    [RESOURCES.ATTENDANCE]: Object.values(PERMISSIONS),
    [RESOURCES.TIMETABLES]: Object.values(PERMISSIONS),
    [RESOURCES.REPORTS]: [PERMISSIONS.READ, PERMISSIONS.WRITE, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    [RESOURCES.MESSAGES]: [PERMISSIONS.READ, PERMISSIONS.WRITE],
    [RESOURCES.CERTIFICATES]: [PERMISSIONS.READ, PERMISSIONS.WRITE, PERMISSIONS.APPROVE],
    [RESOURCES.SETTINGS]: [PERMISSIONS.READ, PERMISSIONS.EDIT]
  },
  Teacher: {
    [RESOURCES.USERS]: [PERMISSIONS.READ],
    [RESOURCES.STUDENTS]: [PERMISSIONS.READ],
    [RESOURCES.TEACHERS]: [PERMISSIONS.READ],
    [RESOURCES.PARENTS]: [PERMISSIONS.READ],
    [RESOURCES.ACADEMIC_RECORDS]: [PERMISSIONS.READ, PERMISSIONS.WRITE, PERMISSIONS.EDIT],
    [RESOURCES.ATTENDANCE]: [PERMISSIONS.READ, PERMISSIONS.WRITE, PERMISSIONS.EDIT],
    [RESOURCES.TIMETABLES]: [PERMISSIONS.READ],
    [RESOURCES.REPORTS]: [PERMISSIONS.READ, PERMISSIONS.WRITE],
    [RESOURCES.MESSAGES]: [PERMISSIONS.READ, PERMISSIONS.WRITE],
    [RESOURCES.CERTIFICATES]: [PERMISSIONS.READ]
  },
  Student: {
    [RESOURCES.USERS]: [],
    [RESOURCES.STUDENTS]: [PERMISSIONS.READ],
    [RESOURCES.TEACHERS]: [PERMISSIONS.READ],
    [RESOURCES.PARENTS]: [],
    [RESOURCES.ACADEMIC_RECORDS]: [PERMISSIONS.READ],
    [RESOURCES.ATTENDANCE]: [PERMISSIONS.READ],
    [RESOURCES.TIMETABLES]: [PERMISSIONS.READ],
    [RESOURCES.REPORTS]: [PERMISSIONS.READ],
    [RESOURCES.MESSAGES]: [PERMISSIONS.READ, PERMISSIONS.WRITE],
    [RESOURCES.CERTIFICATES]: [PERMISSIONS.READ]
  },
  Parent: {
    [RESOURCES.USERS]: [],
    [RESOURCES.STUDENTS]: [PERMISSIONS.READ],  // Only linked children
    [RESOURCES.TEACHERS]: [PERMISSIONS.READ],
    [RESOURCES.PARENTS]: [PERMISSIONS.READ],
    [RESOURCES.ACADEMIC_RECORDS]: [PERMISSIONS.READ],  // Only linked children's records
    [RESOURCES.ATTENDANCE]: [PERMISSIONS.READ],  // Only linked children's attendance
    [RESOURCES.TIMETABLES]: [PERMISSIONS.READ],
    [RESOURCES.REPORTS]: [PERMISSIONS.READ],  // Only linked children's reports
    [RESOURCES.MESSAGES]: [PERMISSIONS.READ, PERMISSIONS.WRITE],
    [RESOURCES.CERTIFICATES]: [PERMISSIONS.READ]  // Only linked children's certificates
  }
};

const ACTIONS = Object.values(PERMISSIONS);
const RESOURCE_KEYS = Object.values(RESOURCES);

const sanitizePermissionsMap = (permissions = {}) => {
  const normalized = {};

  for (const resource of RESOURCE_KEYS) {
    const rawActions = Array.isArray(permissions?.[resource]) ? permissions[resource] : [];
    const uniqueActions = [...new Set(rawActions.filter((action) => ACTIONS.includes(action)))];

    if (uniqueActions.length > 0) {
      normalized[resource] = uniqueActions;
    }
  }

  return normalized;
};

const normalizePermissionsObject = (permissions = {}) => {
  if (permissions instanceof Map) {
    return Object.fromEntries(permissions);
  }

  if (Array.isArray(permissions)) {
    return Object.fromEntries(permissions);
  }

  return permissions;
};

/**
 * Initialize default permissions for all roles
 */
permissionSchema.statics.initializeDefaultPermissions = async function() {
  for (const [role, permissions] of Object.entries(defaultPermissions)) {
    await this.findOneAndUpdate(
      { role },
      { role, permissions: sanitizePermissionsMap(permissions) },
      { upsert: true, new: true }
    );
  }
};

/**
 * Check if a role has a specific permission on a resource
 */
permissionSchema.statics.hasPermission = async function(role, resource, action) {
  const permission = await this.findOne({ role });
  if (!permission) {
    const fallbackPermissions = sanitizePermissionsMap(defaultPermissions[role] || {});
    return (fallbackPermissions[resource] || []).includes(action) ||
      (fallbackPermissions[resource] || []).includes(PERMISSIONS.ADMIN);
  }
  
  const normalizedPermissions = normalizePermissionsObject(permission.permissions || {});
  const resourcePermissions = normalizedPermissions[resource];
  if (!resourcePermissions) return false;
  
  return resourcePermissions.includes(action) || resourcePermissions.includes(PERMISSIONS.ADMIN);
};

/**
 * Get all permissions for a role
 */
permissionSchema.statics.getRolePermissions = async function(role) {
  const permission = await this.findOne({ role });
  if (!permission) return sanitizePermissionsMap(defaultPermissions[role] || {});
  return sanitizePermissionsMap(normalizePermissionsObject(permission.permissions || {}));
};

permissionSchema.statics.getPermissionMatrix = async function() {
  await this.initializeDefaultPermissions();

  const [permissions, userCounts] = await Promise.all([
    this.find({ role: { $in: Object.keys(ROLE_METADATA) } }).lean(),
    mongoose.model('User').aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const permissionByRole = new Map(
    permissions.map((entry) => [
      entry.role,
      sanitizePermissionsMap(normalizePermissionsObject(entry.permissions || {}))
    ])
  );
  const countByRole = new Map(userCounts.map((entry) => [entry._id, entry.count]));

  return Object.keys(ROLE_METADATA).map((role) => ({
    role,
    name: ROLE_METADATA[role].name,
    description: ROLE_METADATA[role].description,
    userCount: countByRole.get(role) || 0,
    permissions: permissionByRole.get(role) || sanitizePermissionsMap(defaultPermissions[role])
  }));
};

permissionSchema.statics.updateRolePermissions = async function(role, permissions) {
  if (!ROLE_METADATA[role]) {
    throw new Error('Invalid role');
  }

  const sanitizedPermissions = sanitizePermissionsMap(permissions);

  const updated = await this.findOneAndUpdate(
    { role },
    { role, permissions: sanitizedPermissions },
    { upsert: true, new: true, runValidators: true }
  );

  return {
    role: updated.role,
    permissions: sanitizePermissionsMap(normalizePermissionsObject(updated.permissions || {}))
  };
};

/**
 * Check if user can access specific student's data (for Parents)
 */
permissionSchema.statics.canAccessStudentData = async function(parentId, studentId) {
  const parent = await mongoose.model('User').findById(parentId);
  if (!parent || parent.role !== 'Parent') return false;
  
  // Check if student is linked to this parent
  return parent.parentProfile?.linkedChildren?.includes(studentId);
};

const Permission = mongoose.model('Permission', permissionSchema);

module.exports = Permission;
module.exports.PERMISSIONS = PERMISSIONS;
module.exports.RESOURCES = RESOURCES;
module.exports.defaultPermissions = defaultPermissions;
module.exports.ROLE_METADATA = ROLE_METADATA;
module.exports.ACTIONS = ACTIONS;
module.exports.RESOURCE_KEYS = RESOURCE_KEYS;
module.exports.sanitizePermissionsMap = sanitizePermissionsMap;
module.exports.normalizePermissionsObject = normalizePermissionsObject;
