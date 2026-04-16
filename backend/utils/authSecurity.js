const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateToken } = require('./emailService');
const { normalizeUserId } = require('./userLookup');

const TWO_FACTOR_EXPIRY = '10m';
const LOGIN_LOCK_MINUTES = 30;

const hashTwoFactorCode = (code) =>
  crypto
    .createHash('sha256')
    .update(`${code}:${process.env.JWT_SECRET}`)
    .digest('hex');

const createTwoFactorChallenge = (user) => {
  const code = `${Math.floor(100000 + Math.random() * 900000)}`;
  const challengeToken = jwt.sign(
    {
      type: 'login_2fa',
      userId: normalizeUserId(user._id),
      role: user.role,
      email: user.email,
      codeHash: hashTwoFactorCode(code),
    },
    process.env.JWT_SECRET,
    { expiresIn: TWO_FACTOR_EXPIRY }
  );

  return { code, challengeToken };
};

const verifyTwoFactorChallenge = (challengeToken, code) => {
  const decoded = jwt.verify(challengeToken, process.env.JWT_SECRET);
  if (decoded.type !== 'login_2fa') {
    throw new Error('Invalid two-factor challenge');
  }

  if (hashTwoFactorCode(String(code || '').trim()) !== decoded.codeHash) {
    throw new Error('Invalid verification code');
  }

  return decoded;
};

const getJwtExpiry = (settings) => {
  const sessionTimeout = Number(settings?.systemSettings?.sessionTimeout || 30);
  return `${Math.max(5, Math.min(1440, sessionTimeout))}m`;
};

const validatePasswordAgainstPolicy = (password, settings) => {
  const errors = [];
  const policy = settings?.securitySettings || {};
  const minPasswordLength = Number(policy.minPasswordLength || 8);
  const value = String(password || '');

  if (!value || value.length < minPasswordLength) {
    errors.push(`Password must be at least ${minPasswordLength} characters long`);
  }
  if (policy.requireNumber && !/\d/.test(value)) {
    errors.push('Password must include at least one number');
  }
  if (policy.requireSpecialChar && !/[^\w\s]/.test(value)) {
    errors.push('Password must include at least one special character');
  }

  return errors;
};

const isPasswordExpired = (user, settings) => {
  const maxAgeDays = Number(settings?.securitySettings?.passwordExpiry || 90);
  if (!maxAgeDays || maxAgeDays <= 0) return false;

  const changedAt = user.passwordChangedAt || user.updatedAt || user.createdAt;
  if (!changedAt) return false;

  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  return new Date(changedAt).getTime() < cutoff;
};

const getLockStatus = (user) => {
  if (!user?.lockUntil) return false;
  return new Date(user.lockUntil).getTime() > Date.now();
};

const registerFailedLoginAttempt = async (user, settings) => {
  const maxLoginAttempts = Number(settings?.systemSettings?.maxLoginAttempts || 5);
  const lockUntilDate = new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000);

  // Use in-memory count to avoid the aggregation-pipeline syntax that
  // Mongoose 9 / MongoDB driver 6 requires { updatePipeline: true } for.
  const newAttempts = (Number(user.failedLoginAttempts) || 0) + 1;
  const shouldLock = newAttempts >= maxLoginAttempts;

  const setData = {
    failedLoginAttempts: shouldLock ? 0 : newAttempts,
  };
  if (shouldLock) {
    setData.lockUntil = lockUntilDate;
  }

  await User.updateOne({ _id: user._id }, { $set: setData });

  return {
    attempts: shouldLock ? maxLoginAttempts : newAttempts,
    locked: shouldLock,
  };
};

const createAuthToken = (user, settings) =>
  jwt.sign(
    {
      id: normalizeUserId(user._id),
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: getJwtExpiry(settings),
    }
  );

const buildUserResponse = (user) => ({
  _id: normalizeUserId(user._id),
  id: normalizeUserId(user._id),
  email: user.email,
  username: user.username,
  role: user.role,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  profileImage: user.profileImage,
  appearanceSettings: user.appearanceSettings,
  studentId: user.studentProfile?.studentId || undefined,
  grade: user.studentProfile?.grade || undefined,
  stream: user.studentProfile?.stream || user.studentProfile?.section || undefined,
});

module.exports = {
  buildUserResponse,
  createAuthToken,
  createTwoFactorChallenge,
  generateToken,
  getLockStatus,
  isPasswordExpired,
  registerFailedLoginAttempt,
  validatePasswordAgainstPolicy,
  verifyTwoFactorChallenge,
};
