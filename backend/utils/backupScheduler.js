const fsp = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');
const { loadSystemSettings } = require('./systemSettings');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const BACKUP_CONFIG_PATH = path.join(BACKUP_DIR, 'backup-config.json');
const BACKUP_FILE_PREFIX = 'backup-';
const BACKUP_FILE_SUFFIX = '.json';
const CHECK_INTERVAL = 60 * 1000; // Check every minute

let schedulerRunning = false;
let lastBackupTime = null;

/**
 * Load backup configuration
 */
const loadBackupConfig = async () => {
  try {
    const raw = await fsp.readFile(BACKUP_CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      autoBackup: Boolean(parsed.autoBackup),
      backupFrequency: ['hourly', 'daily', 'weekly', 'monthly'].includes(parsed.backupFrequency)
        ? parsed.backupFrequency
        : 'daily',
      retainBackups: Math.max(1, Math.min(100, Number(parsed.retainBackups || 7)))
    };
  } catch {
    return { autoBackup: false, backupFrequency: 'daily', retainBackups: 7 };
  }
};

/**
 * Get next backup time based on frequency
 */
const getNextBackupTime = (lastTime, frequency) => {
  const last = lastTime ? new Date(lastTime) : new Date(0);
  const now = new Date();
  let next = new Date(last);

  switch (frequency) {
    case 'hourly':
      next.setHours(next.getHours() + 1);
      break;
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
  }

  return next;
};

/**
 * Check if backup is due
 */
const isBackupDue = (lastTime, frequency) => {
  const nextTime = getNextBackupTime(lastTime, frequency);
  return new Date() >= nextTime;
};

/**
 * Ensure backup directory exists
 */
const ensureBackupDir = async () => {
  await fsp.mkdir(BACKUP_DIR, { recursive: true });
};

/**
 * Create backup file
 */
const createBackup = async () => {
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
      createdBy: 'auto-scheduler',
      collectionCount: collectionNames.length,
      totalDocuments
    },
    collections: backupCollections
  };

  await fsp.writeFile(fullPath, JSON.stringify(payload), 'utf8');
  const stat = await fsp.stat(fullPath);

  return {
    filename,
    sizeBytes: stat.size,
    durationMs: Date.now() - startedAt,
    collectionCount: collectionNames.length,
    totalDocuments
  };
};

/**
 * Get backup files sorted by creation time (newest first)
 */
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
    files.push({ filename, fullPath, createdAt: stat.mtime });
  }

  files.sort((a, b) => b.createdAt - a.createdAt);
  return files;
};

/**
 * Apply retention policy
 */
const applyRetention = async (retainCount) => {
  const files = await getBackupFiles();
  const toDelete = files.slice(retainCount);

  for (const item of toDelete) {
    try {
      await fsp.unlink(item.fullPath);
    } catch (err) {
      console.error('Failed to delete old backup:', err.message);
    }
  }

  return toDelete.length;
};

/**
 * Log backup audit
 */
const logBackupAudit = async (action, description, status, metadata = {}) => {
  try {
    await AuditLog.logAction({
      userId: null,
      userRole: 'System',
      username: 'auto-scheduler',
      action,
      resourceType: 'BACKUP',
      resourceName: metadata.filename || 'backup',
      description,
      ipAddress: '127.0.0.1',
      userAgent: 'backup-scheduler',
      severity: status === 'FAILURE' ? 'HIGH' : 'LOW',
      status,
      metadata
    });
  } catch (err) {
    console.error('Failed to log backup audit:', err.message);
  }
};

/**
 * Run auto backup if due
 */
const runAutoBackup = async () => {
  const config = await loadBackupConfig();

  if (!config.autoBackup) {
    return { ran: false, reason: 'Auto backup disabled' };
  }

  const files = await getBackupFiles();
  const lastBackup = files[0]?.createdAt || null;

  if (!isBackupDue(lastBackup, config.backupFrequency)) {
    return { ran: false, reason: 'Not due yet' };
  }

  try {
    const result = await createBackup();
    await applyRetention(config.retainBackups);

    await logBackupAudit(
      'BACKUP_CREATED',
      `Auto backup created: ${result.filename}`,
      'SUCCESS',
      {
        filename: result.filename,
        sizeBytes: result.sizeBytes,
        durationMs: result.durationMs,
        collectionCount: result.collectionCount,
        totalDocuments: result.totalDocuments
      }
    );

    lastBackupTime = new Date();
    console.log(`[Backup Scheduler] Auto backup completed: ${result.filename}`);
    return { ran: true, result };
  } catch (error) {
    await logBackupAudit(
      'BACKUP_CREATED',
      `Auto backup failed: ${error.message}`,
      'FAILURE',
      { error: error.message }
    );
    console.error('[Backup Scheduler] Auto backup failed:', error.message);
    return { ran: false, reason: error.message };
  }
};

/**
 * Start the backup scheduler
 */
const startBackupScheduler = () => {
  if (schedulerRunning) {
    console.log('[Backup Scheduler] Already running');
    return;
  }

  schedulerRunning = true;
  console.log('[Backup Scheduler] Started - checking every minute');

  // Initial check after 10 seconds
  setTimeout(async () => {
    await runAutoBackup();
  }, 10000);

  // Periodic checks
  const intervalId = setInterval(async () => {
    if (!schedulerRunning) {
      clearInterval(intervalId);
      return;
    }
    await runAutoBackup();
  }, CHECK_INTERVAL);

  return intervalId;
};

/**
 * Stop the backup scheduler
 */
const stopBackupScheduler = () => {
  schedulerRunning = false;
  console.log('[Backup Scheduler] Stopped');
};

module.exports = {
  startBackupScheduler,
  stopBackupScheduler,
  runAutoBackup,
  isBackupDue,
  getNextBackupTime,
  loadBackupConfig
};
