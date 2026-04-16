const fs = require('fs/promises');
const path = require('path');

const SETTINGS_DIR = path.join(__dirname, '..', 'config');
const SETTINGS_PATH = path.join(SETTINGS_DIR, 'system-settings.json');

const DEFAULT_SETTINGS = {
  systemSettings: {
    siteName: 'Haramaya University Non-Boarding Secondary School',
    siteDescription: 'Student Information Management System',
    schoolAddress: 'Ethiopia',
    academicYear: '2025-2026',
    semester: '1st Semester',
    contactEmail: 'admin@school.edu',
    contactPhone: '+251-XX-XXX-XXXX',
    timezone: 'Africa/Addis_Ababa',
    dateFormat: 'YYYY-MM-DD',
    requireEmailVerification: true,
    maxLoginAttempts: 5,
    sessionTimeout: 30,
    enableNotifications: true,
    enableEmailAlerts: true,
  },
  notificationSettings: {
    emailNotifications: true,
    smsNotifications: false,
    absenceAlerts: true,
    gradeNotifications: true,
    announcementNotifications: true,
    messageNotifications: true,
  },
  securitySettings: {
    twoFactorAuth: false,
    passwordExpiry: 90,
    minPasswordLength: 8,
    requireSpecialChar: true,
    requireNumber: true,
    ipWhitelist: [],
    loginNotifications: true,
  },
};

const ensureSettingsDir = async () => {
  await fs.mkdir(SETTINGS_DIR, { recursive: true });
};

const sanitizeSettings = (input = {}) => {
  const source = {
    systemSettings: {
      ...DEFAULT_SETTINGS.systemSettings,
      ...(input.systemSettings || {}),
    },
    notificationSettings: {
      ...DEFAULT_SETTINGS.notificationSettings,
      ...(input.notificationSettings || {}),
    },
    securitySettings: {
      ...DEFAULT_SETTINGS.securitySettings,
      ...(input.securitySettings || {}),
    },
  };

  return {
    systemSettings: {
      siteName: String(source.systemSettings.siteName || DEFAULT_SETTINGS.systemSettings.siteName),
      siteDescription: String(
        source.systemSettings.siteDescription || DEFAULT_SETTINGS.systemSettings.siteDescription
      ),
      schoolAddress: String(
        source.systemSettings.schoolAddress || DEFAULT_SETTINGS.systemSettings.schoolAddress
      ),
      academicYear: String(
        source.systemSettings.academicYear || DEFAULT_SETTINGS.systemSettings.academicYear
      ),
      semester: String(
        source.systemSettings.semester || DEFAULT_SETTINGS.systemSettings.semester
      ),
      contactEmail: String(
        source.systemSettings.contactEmail || DEFAULT_SETTINGS.systemSettings.contactEmail
      ),
      contactPhone: String(
        source.systemSettings.contactPhone || DEFAULT_SETTINGS.systemSettings.contactPhone
      ),
      timezone: String(source.systemSettings.timezone || DEFAULT_SETTINGS.systemSettings.timezone),
      dateFormat: String(source.systemSettings.dateFormat || DEFAULT_SETTINGS.systemSettings.dateFormat),
      requireEmailVerification: Boolean(source.systemSettings.requireEmailVerification),
      maxLoginAttempts: Math.max(1, Math.min(20, Number(source.systemSettings.maxLoginAttempts || 5))),
      sessionTimeout: Math.max(5, Math.min(1440, Number(source.systemSettings.sessionTimeout || 30))),
      enableNotifications: Boolean(source.systemSettings.enableNotifications),
      enableEmailAlerts: Boolean(source.systemSettings.enableEmailAlerts),
    },
    notificationSettings: {
      emailNotifications: Boolean(source.notificationSettings.emailNotifications),
      smsNotifications: Boolean(source.notificationSettings.smsNotifications),
      absenceAlerts: Boolean(source.notificationSettings.absenceAlerts),
      gradeNotifications: Boolean(source.notificationSettings.gradeNotifications),
      announcementNotifications: Boolean(source.notificationSettings.announcementNotifications),
      messageNotifications: Boolean(source.notificationSettings.messageNotifications),
    },
    securitySettings: {
      twoFactorAuth: Boolean(source.securitySettings.twoFactorAuth),
      passwordExpiry: Math.max(1, Math.min(365, Number(source.securitySettings.passwordExpiry || 90))),
      minPasswordLength: Math.max(
        6,
        Math.min(64, Number(source.securitySettings.minPasswordLength || 8))
      ),
      requireSpecialChar: Boolean(source.securitySettings.requireSpecialChar),
      requireNumber: Boolean(source.securitySettings.requireNumber),
      ipWhitelist: Array.isArray(source.securitySettings.ipWhitelist)
        ? source.securitySettings.ipWhitelist
            .map((value) => String(value || '').trim())
            .filter(Boolean)
        : [],
      loginNotifications: Boolean(source.securitySettings.loginNotifications),
    },
  };
};

const loadSystemSettings = async () => {
  try {
    await ensureSettingsDir();
    const raw = await fs.readFile(SETTINGS_PATH, 'utf8');
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return sanitizeSettings(DEFAULT_SETTINGS);
  }
};

const saveSystemSettings = async (settings) => {
  const existing = await loadSystemSettings();
  const sanitized = sanitizeSettings({
    ...existing,
    ...(settings || {}),
    systemSettings: {
      ...existing.systemSettings,
      ...((settings || {}).systemSettings || {}),
    },
    notificationSettings: {
      ...existing.notificationSettings,
      ...((settings || {}).notificationSettings || {}),
    },
    securitySettings: {
      ...existing.securitySettings,
      ...((settings || {}).securitySettings || {}),
    },
  });
  await ensureSettingsDir();
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(sanitized, null, 2), 'utf8');
  return sanitized;
};

module.exports = {
  DEFAULT_SETTINGS,
  loadSystemSettings,
  saveSystemSettings,
  sanitizeSettings,
};
