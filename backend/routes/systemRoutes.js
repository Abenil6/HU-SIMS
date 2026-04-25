const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const Permission = require('../models/Permission');
const User = require('../models/User');
const mongoose = require('mongoose');
const os = require('os');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { protect, authorize, checkIpWhitelist } = require('../middleware/authMiddleware');
const { logSystemConfigChange } = require('../utils/auditLogger');
const { loadSystemSettings, saveSystemSettings } = require('../utils/systemSettings');
const { ACTIONS, RESOURCE_KEYS, ROLE_METADATA, defaultPermissions } = require('../models/Permission');

/**
 * @swagger
 * /system/public-stats:
 *   get:
 *     summary: Get public school statistics
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Public school statistics
 */
router.get('/public-stats', async (req, res) => {
  try {
    // Get real-time statistics
    const [
      studentCount,
      teacherCount
    ] = await Promise.all([
      User.countDocuments({ role: 'Student' }),
      User.countDocuments({ role: 'Teacher' })
    ]);

    // Years of excellence - calculated from school founding date
    const schoolFoundedYear = 2021; // Adjust based on actual founding year
    const currentYear = new Date().getFullYear();
    const yearsOfExcellence = currentYear - schoolFoundedYear;

    // Get actual classes count by aggregating unique grade/section/stream combinations from students
    const classCount = await User.aggregate([
      { 
        $match: { 
          role: 'Student',
          $or: [
            { grade: { $exists: true, $ne: null, $ne: '' } },
            { 'studentProfile.grade': { $exists: true, $ne: null, $ne: '' } }
          ]
        } 
      },
      {
        $project: {
          grade: { $ifNull: ['$grade', '$studentProfile.grade'] },
          section: { $ifNull: ['$section', '$studentProfile.section'] },
          stream: { $ifNull: ['$stream', '$studentProfile.stream'] }
        }
      },
      {
        $group: { 
          _id: { 
            grade: '$grade',
            section: '$section',
            stream: '$stream'
          } 
        }
      },
      { $count: 'totalClasses' }
    ]).then(result => result[0]?.totalClasses || 0);

    res.json({
      students: studentCount,
      teachers: teacherCount,
      yearsOfExcellence: yearsOfExcellence,
      classes: classCount
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

// Apply protection to all routes
router.use(protect);

// Shared settings access for SystemAdmin + SchoolAdmin
router.get('/settings', authorize('SystemAdmin', 'SchoolAdmin'), async (req, res) => {
  try {
    const settings = await loadSystemSettings();
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching system settings',
      error: error.message,
    });
  }
});

router.post('/settings', authorize('SystemAdmin', 'SchoolAdmin'), async (req, res) => {
  try {
    const previous = await loadSystemSettings();
    const saved = await saveSystemSettings(req.body || {});

    await logSystemConfigChange(req, 'system_settings', previous, saved);

    res.json({
      success: true,
      message: 'System settings saved successfully',
      data: saved,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error saving system settings',
      error: error.message,
    });
  }
});

// Only SystemAdmin can access these routes
router.use(authorize('SystemAdmin'));

// Apply IP whitelist check for SystemAdmin routes
router.use(checkIpWhitelist);

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const BACKUP_CONFIG_PATH = path.join(BACKUP_DIR, 'backup-config.json');
const BACKUP_FILE_PREFIX = 'backup-';
const BACKUP_FILE_SUFFIX = '.json';
const DEFAULT_BACKUP_CONFIG = {
  autoBackup: false,
  backupFrequency: 'daily',
  retainBackups: 7
};

const getClientIp = (req) =>
  req.headers['x-forwarded-for']?.toString()?.split(',')[0]?.trim() ||
  req.socket?.remoteAddress ||
  '';

const ensureBackupDir = async () => {
  await fsp.mkdir(BACKUP_DIR, { recursive: true });
};

const sanitizeBackupFilename = (name = '') => {
  const safe = path.basename(String(name));
  if (!safe.startsWith(BACKUP_FILE_PREFIX) || !safe.endsWith(BACKUP_FILE_SUFFIX)) {
    return null;
  }
  if (safe.includes('/') || safe.includes('\\')) return null;
  return safe;
};

const getBackupFiles = async () => {
  await ensureBackupDir();
  const entries = await fsp.readdir(BACKUP_DIR, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const filename = entry.name;
    if (!filename.startsWith(BACKUP_FILE_PREFIX) || !filename.endsWith(BACKUP_FILE_SUFFIX)) continue;
    const fullPath = path.join(BACKUP_DIR, filename);
    const stat = await fsp.stat(fullPath);
    files.push({
      filename,
      fullPath,
      sizeBytes: stat.size,
      createdAt: stat.mtime
    });
  }

  files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return files;
};

const formatSize = (sizeBytes = 0) => {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  const kb = sizeBytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
};

const loadBackupConfig = async () => {
  try {
    await ensureBackupDir();
    const raw = await fsp.readFile(BACKUP_CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      autoBackup: Boolean(parsed.autoBackup),
      backupFrequency: ['hourly', 'daily', 'weekly', 'monthly'].includes(parsed.backupFrequency)
        ? parsed.backupFrequency
        : DEFAULT_BACKUP_CONFIG.backupFrequency,
      retainBackups: Number.isFinite(parsed.retainBackups)
        ? Math.max(1, Math.min(100, Number(parsed.retainBackups)))
        : DEFAULT_BACKUP_CONFIG.retainBackups
    };
  } catch {
    return { ...DEFAULT_BACKUP_CONFIG };
  }
};

const saveBackupConfig = async (config) => {
  await ensureBackupDir();
  await fsp.writeFile(BACKUP_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
};

const calcNextBackup = (lastDate, frequency = 'daily') => {
  const next = lastDate ? new Date(lastDate) : new Date();
  if (frequency === 'hourly') next.setHours(next.getHours() + 1);
  else if (frequency === 'weekly') next.setDate(next.getDate() + 7);
  else if (frequency === 'monthly') next.setMonth(next.getMonth() + 1);
  else next.setDate(next.getDate() + 1);
  return next;
};

const logBackupAudit = async (req, action, description, status = 'SUCCESS', metadata = {}) => {
  await AuditLog.logAction({
    userId: req.user?._id,
    userRole: req.user?.role || 'SystemAdmin',
    username: req.user?.username || req.user?.email || 'systemadmin',
    action,
    resourceType: 'BACKUP',
    resourceName: metadata.filename || 'backup',
    description,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'] || '',
    severity: status === 'FAILURE' ? 'HIGH' : 'LOW',
    status,
    metadata
  });
};

const createBackupFile = async (req) => {
  await ensureBackupDir();

  const db = mongoose.connection.db;
  const startedAt = Date.now();
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const collectionNames = collections
    .map((c) => c.name)
    .filter((name) => !name.startsWith('system.'));

  const backupCollections = {};
  let totalDocuments = 0;
  for (const name of collectionNames) {
    const docs = await db.collection(name).find({}).toArray();
    backupCollections[name] = docs;
    totalDocuments += docs.length;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${BACKUP_FILE_PREFIX}${timestamp}${BACKUP_FILE_SUFFIX}`;
  const fullPath = path.join(BACKUP_DIR, filename);
  const payload = {
    meta: {
      version: 1,
      createdAt: new Date().toISOString(),
      dbName: db.databaseName,
      createdBy: req.user?.email || req.user?.username || 'systemadmin',
      collectionCount: collectionNames.length,
      totalDocuments
    },
    collections: backupCollections
  };

  await fsp.writeFile(fullPath, JSON.stringify(payload), 'utf8');
  const stat = await fsp.stat(fullPath);
  const durationMs = Date.now() - startedAt;

  return {
    filename,
    fullPath,
    sizeBytes: stat.size,
    durationMs,
    collectionCount: collectionNames.length,
    totalDocuments
  };
};

const applyRetention = async () => {
  const config = await loadBackupConfig();
  const files = await getBackupFiles();
  const keep = Math.max(1, Number(config.retainBackups || 7));
  const toDelete = files.slice(keep);

  for (const item of toDelete) {
    await fsp.unlink(item.fullPath);
  }

  return toDelete.length;
};

const restoreFromBackupFile = async (fullPath) => {
  const startedAt = Date.now();
  const raw = await fsp.readFile(fullPath, 'utf8');
  const parsed = JSON.parse(raw);
  const collections = parsed?.collections;
  if (!collections || typeof collections !== 'object') {
    throw new Error('Invalid backup format: missing collections');
  }

  const db = mongoose.connection.db;
  const collectionNames = Object.keys(collections);
  let restoredCollections = 0;
  let restoredDocuments = 0;

  for (const name of collectionNames) {
    if (name.startsWith('system.')) continue;
    const docs = Array.isArray(collections[name]) ? collections[name] : [];
    const col = db.collection(name);
    await col.deleteMany({});
    if (docs.length > 0) {
      await col.insertMany(docs, { ordered: false });
    }
    restoredCollections += 1;
    restoredDocuments += docs.length;
  }

  return {
    restoredCollections,
    restoredDocuments,
    durationMs: Date.now() - startedAt
  };
};

/**
 * @swagger
 * /api/system/audit-logs:
 *   get:
 *     summary: Get audit logs with filtering and pagination
 *     tags: [System Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: resourceType
 *         schema:
 *           type: string
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SUCCESS, FAILURE, WARNING]
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Paginated audit logs
 */
router.get('/audit-logs', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      resourceType,
      severity,
      status,
      userId,
      startDate,
      endDate,
      search
    } = req.query;

    // Build query
    const query = {};
    
    if (action) query.action = action;
    if (resourceType) query.resourceType = resourceType;
    if (severity) query.severity = severity;
    if (status) query.status = status;
    if (userId) query.userId = userId;
    
    // Date range filter
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    // Search in description and username
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { resourceName: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('userId', 'username email')
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(limit),
        total: total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching audit logs',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/system/user-activity/{userId}:
 *   get:
 *     summary: Get activity for a specific user
 *     tags: [System Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: User activity logs
 */
router.get('/user-activity/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 100 } = req.query;
    
    const activity = await AuditLog.find({ userId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('userId', 'username email')
      .lean();
    
    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user activity',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/system/export-audit-logs:
 *   post:
 *     summary: Export audit logs (CSV format)
 *     tags: [System Administration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               action:
 *                 type: string
 *               resourceType:
 *                 type: string
 *               severity:
 *                 type: string
 *     responses:
 *       200:
 *         description: CSV file download
 */
router.get('/roles-permissions', async (req, res) => {
  try {
    const roles = await Permission.getPermissionMatrix();

    res.json({
      success: true,
      data: {
        roles,
        availableActions: ACTIONS,
        availableResources: RESOURCE_KEYS,
        roleMetadata: ROLE_METADATA,
        defaultPermissions
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to load role permissions',
      error: error.message
    });
  }
});

router.put('/roles-permissions/:role', async (req, res) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body || {};

    const existingPermissions = await Permission.getRolePermissions(role);
    const updated = await Permission.updateRolePermissions(role, permissions || {});

    await logSystemConfigChange(req, `permissions:${role}`, existingPermissions, updated.permissions);

    res.json({
      success: true,
      message: `${role} permissions updated successfully`,
      data: updated
    });
  } catch (error) {
    const invalidRole = error.message === 'Invalid role';

    res.status(invalidRole ? 400 : 500).json({
      success: false,
      message: invalidRole ? 'Invalid role supplied' : 'Failed to update role permissions',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/system/stats:
 *   get:
 *     summary: Get real system statistics and metrics
 *     tags: [System Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [1h, 24h, 7d, 30d]
 *           default: 24h
 *     responses:
 *       200:
 *         description: System statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    
    // Calculate time range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '1h':
        startDate.setHours(now.getHours() - 1);
        break;
      case '24h':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
    }
    
    // Get real statistics
    const [
      totalUsers,
      activeUsers,
      totalLogs,
      successLogs,
      failureLogs,
      criticalLogs,
      usersByRole,
      recentAlerts,
      backupLogs
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: { $in: ['Active', 'active'] } }),
      AuditLog.countDocuments({ timestamp: { $gte: startDate } }),
      AuditLog.countDocuments({ timestamp: { $gte: startDate }, status: 'SUCCESS' }),
      AuditLog.countDocuments({ timestamp: { $gte: startDate }, status: 'FAILURE' }),
      AuditLog.countDocuments({ timestamp: { $gte: startDate }, severity: 'CRITICAL' }),
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
            active: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['Active', 'active']] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),
      AuditLog.find({ 
        timestamp: { $gte: startDate }, 
        severity: { $in: ['HIGH', 'CRITICAL'] }
      }).sort({ timestamp: -1 }).limit(10).lean(),
      AuditLog.find({
        action: { $regex: 'backup|restore', $options: 'i' }
      }).sort({ timestamp: -1 }).limit(5).lean()
    ]);

    // Get live system health metrics
    const dbStats = await mongoose.connection.db.stats();
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal || 1;
    const usedMemory = memoryUsage.heapUsed || 0;
    const memoryPercent = Math.min(
      100,
      Math.max(0, Math.round((usedMemory / totalMemory) * 100))
    );

    const cpuCount = os.cpus()?.length || 1;
    const oneMinLoad = os.loadavg?.()[0] || 0;
    const cpuPercent = Math.min(
      100,
      Math.max(0, Math.round((oneMinLoad / cpuCount) * 100))
    );

    const dataSize = Number(dbStats?.dataSize || 0);
    const storageSize = Number(dbStats?.storageSize || 0);
    const storagePercent = storageSize > 0
      ? Math.min(100, Math.max(0, Math.round((dataSize / storageSize) * 100)))
      : 0;

    const latestBackup = backupLogs[0];
    const backupStatusLabel = latestBackup
      ? `${latestBackup.status || 'SUCCESS'} (${new Date(latestBackup.timestamp).toLocaleString()})`
      : 'No backup logs found';

    const systemHealth = {
      apiServer: {
        status: `Online (${Math.round(process.uptime())}s uptime)`,
        percent: 100
      },
      database: {
        status: `Healthy (${dbStats.collections || 0} collections)`,
        percent: 98
      },
      storage: {
        status: `${storagePercent}% Used`,
        percent: storagePercent
      },
      memory: {
        status: `${memoryPercent}% Used`,
        percent: memoryPercent
      },
      cpu: {
        status: `${cpuPercent}% Load`,
        percent: cpuPercent
      },
      backup: {
        status: backupStatusLabel,
        percent: latestBackup ? 100 : 0
      }
    };
    
    res.json({
      success: true,
      data: {
        systemStats: {
          totalUsers,
          activeUsers,
          totalLogs,
          successCount: successLogs,
          failureCount: failureLogs,
          criticalCount: criticalLogs,
          uniqueUserCount: totalUsers
        },
        userStats: usersByRole,
        securityAlerts: recentAlerts,
        systemHealth,
        timeRange
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching system statistics',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/system/security-alerts:
 *   get:
 *     summary: Get real security alerts and critical events
 *     tags: [System Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Security alerts
 */
router.get('/security-alerts', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    const alerts = await AuditLog.find({
      severity: { $in: ['HIGH', 'CRITICAL'] }
    })
    .sort({ timestamp: -1 })
    .limit(parseInt(limit))
    .populate('userId', 'username email')
    .lean();
    
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching security alerts',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/system/health:
 *   get:
 *     summary: Get system health metrics
 *     tags: [System Administration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System health metrics
 */
router.get('/health', async (req, res) => {
  try {
    // Get MongoDB connection stats
    const mongoose = require('mongoose');
    const dbStats = await mongoose.connection.db.stats();
    
    // Get system metrics
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const memoryPercent = Math.round((usedMemory / totalMemory) * 100);
    
    const systemHealth = {
      apiServer: { 
        status: "Online", 
        percent: 100,
        uptime: process.uptime(),
        version: process.version
      },
      database: { 
        status: "Healthy", 
        percent: 98,
        collections: dbStats.collections,
        dataSize: Math.round(dbStats.dataSize / 1024 / 1024) + "MB"
      },
      storage: { 
        status: "45% Used", 
        percent: 45,
        freeSpace: "2.3GB"
      },
      memory: { 
        status: `${memoryPercent}% Used`, 
        percent: memoryPercent,
        used: Math.round(usedMemory / 1024 / 1024) + "MB",
        total: Math.round(totalMemory / 1024 / 1024) + "MB"
      },
      cpu: { 
        status: "35% Used", 
        percent: 35,
        loadAverage: require('os').loadavg()[0].toFixed(2)
      },
      backup: { 
        status: "Completed", 
        percent: 100,
        lastBackup: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        nextBackup: new Date(Date.now() + 16 * 60 * 60 * 1000).toISOString()
      }
    };
    
    res.json({
      success: true,
      data: systemHealth
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching system health',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/system/backups:
 *   get:
 *     summary: Get backup status and history
 *     tags: [System Administration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup information
 */
router.get('/backups', async (req, res) => {
  try {
    const [config, files, backupLogs] = await Promise.all([
      loadBackupConfig(),
      getBackupFiles(),
      AuditLog.find({
        action: { $in: ['BACKUP_CREATED', 'BACKUP_RESTORED'] },
        timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }).sort({ timestamp: -1 }).limit(30).lean()
    ]);

    const latestBackup = files[0];
    const backupStatus = {
      autoBackup: config.autoBackup,
      backupFrequency: config.backupFrequency,
      retainBackups: config.retainBackups,
      lastBackup: latestBackup ? latestBackup.createdAt : null,
      nextBackup: calcNextBackup(latestBackup?.createdAt, config.backupFrequency),
      latestBackupFile: latestBackup
        ? {
            filename: latestBackup.filename,
            sizeBytes: latestBackup.sizeBytes,
            size: formatSize(latestBackup.sizeBytes),
            createdAt: latestBackup.createdAt
          }
        : null,
      recentBackups: files.slice(0, 20).map((f) => ({
        filename: f.filename,
        timestamp: f.createdAt,
        sizeBytes: f.sizeBytes,
        size: formatSize(f.sizeBytes),
        status: 'SUCCESS'
      })),
      recentActivity: backupLogs.slice(0, 20).map((log) => ({
        timestamp: log.timestamp,
        action: log.action,
        status: log.status,
        filename: log.metadata?.filename || null,
        sizeBytes: log.metadata?.sizeBytes || null,
        size: log.metadata?.sizeBytes ? formatSize(log.metadata.sizeBytes) : null,
        durationMs: log.metadata?.durationMs || null,
        restoredCollections: log.metadata?.restoredCollections || null
      }))
    };

    res.json({
      success: true,
      data: backupStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching backup information',
      error: error.message
    });
  }
});

router.post('/backups/config', async (req, res) => {
  try {
    const { autoBackup, backupFrequency, retainBackups } = req.body || {};
    const config = {
      autoBackup: Boolean(autoBackup),
      backupFrequency: ['hourly', 'daily', 'weekly', 'monthly'].includes(backupFrequency)
        ? backupFrequency
        : 'daily',
      retainBackups: Math.max(1, Math.min(100, Number(retainBackups || 7)))
    };
    await saveBackupConfig(config);
    res.json({ success: true, message: 'Backup configuration saved', data: config });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error saving backup configuration',
      error: error.message
    });
  }
});

router.post('/backups/run', async (req, res) => {
  try {
    const details = await createBackupFile(req);
    const deletedCount = await applyRetention();

    await logBackupAudit(
      req,
      'BACKUP_CREATED',
      `Backup created: ${details.filename}`,
      'SUCCESS',
      {
        filename: details.filename,
        sizeBytes: details.sizeBytes,
        durationMs: details.durationMs,
        collectionCount: details.collectionCount,
        totalDocuments: details.totalDocuments,
        retentionDeleted: deletedCount
      }
    );

    res.status(201).json({
      success: true,
      message: 'Backup created successfully',
      data: {
        filename: details.filename,
        sizeBytes: details.sizeBytes,
        size: formatSize(details.sizeBytes),
        durationMs: details.durationMs,
        collectionCount: details.collectionCount,
        totalDocuments: details.totalDocuments
      }
    });
  } catch (error) {
    await logBackupAudit(
      req,
      'BACKUP_CREATED',
      `Backup creation failed: ${error.message}`,
      'FAILURE',
      { error: error.message }
    );
    res.status(500).json({
      success: false,
      message: 'Error creating backup',
      error: error.message
    });
  }
});

router.get('/backups/download/:filename', async (req, res) => {
  try {
    const filename = sanitizeBackupFilename(req.params.filename);
    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Invalid backup filename'
      });
    }

    const fullPath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: 'Backup file not found'
      });
    }

    res.download(fullPath, filename);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error downloading backup',
      error: error.message
    });
  }
});

router.post('/backups/restore', async (req, res) => {
  try {
    const { filename, confirm } = req.body || {};
    if (confirm !== 'RESTORE') {
      return res.status(400).json({
        success: false,
        message: 'Restore confirmation required. Set confirm=RESTORE'
      });
    }

    const safeFilename = sanitizeBackupFilename(filename);
    if (!safeFilename) {
      return res.status(400).json({
        success: false,
        message: 'Invalid backup filename'
      });
    }

    const fullPath = path.join(BACKUP_DIR, safeFilename);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: 'Backup file not found'
      });
    }

    const result = await restoreFromBackupFile(fullPath);

    await logBackupAudit(
      req,
      'BACKUP_RESTORED',
      `Backup restored: ${safeFilename}`,
      'SUCCESS',
      {
        filename: safeFilename,
        restoredCollections: result.restoredCollections,
        restoredDocuments: result.restoredDocuments,
        durationMs: result.durationMs
      }
    );

    res.json({
      success: true,
      message: 'Backup restored successfully',
      data: {
        filename: safeFilename,
        ...result
      }
    });
  } catch (error) {
    await logBackupAudit(
      req,
      'BACKUP_RESTORED',
      `Backup restore failed: ${error.message}`,
      'FAILURE',
      { filename: req.body?.filename || null, error: error.message }
    );
    res.status(500).json({
      success: false,
      message: 'Error restoring backup',
      error: error.message
    });
  }
});

router.post('/export-audit-logs', async (req, res) => {
  try {
    const { startDate, endDate, action, resourceType, severity } = req.body;
    
    // Build query
    const query = {};
    if (action) query.action = action;
    if (resourceType) query.resourceType = resourceType;
    if (severity) query.severity = severity;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .populate('userId', 'username email')
      .lean();
    
    // Convert to CSV
    const csvHeaders = [
      'Timestamp', 'Username', 'User Role', 'Action', 'Resource Type',
      'Resource Name', 'Description', 'IP Address', 'Severity', 'Status'
    ];
    
    const csvRows = logs.map(log => [
      log.timestamp,
      log.username,
      log.userRole,
      log.action,
      log.resourceType,
      log.resourceName || '',
      log.description,
      log.ipAddress || '',
      log.severity,
      log.status
    ]);
    
    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error exporting audit logs',
      error: error.message
    });
  }
});

module.exports = router;
