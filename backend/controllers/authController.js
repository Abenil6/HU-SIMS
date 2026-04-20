const User = require('../models/User');
const VerificationToken = require('../models/VerificationToken');
const bcrypt = require('bcryptjs');
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendLoginNotificationEmail,
  sendLoginVerificationCode,
  generateToken,
} = require('../utils/emailService');
const { logUserLogin, logUserLogout, logSecurityEvent } = require('../utils/auditLogger');
const { findUserByFlexibleId, normalizeUserId, updateUserByFlexibleId } = require('../utils/userLookup');
const { loadSystemSettings } = require('../utils/systemSettings');
const {
  buildUserResponse,
  createAuthToken,
  createTwoFactorChallenge,
  getLockStatus,
  isPasswordExpired,
  registerFailedLoginAttempt,
  validatePasswordAgainstPolicy,
  verifyTwoFactorChallenge,
} = require('../utils/authSecurity');

const shouldSendLoginEmails = (settings) =>
  Boolean(
    settings?.systemSettings?.enableEmailAlerts &&
      settings?.securitySettings?.loginNotifications
  );

const finalizeSuccessfulLogin = async (req, res, user, settings) => {
  // Use updateOne to avoid DocumentNotFoundError if user was deleted
  await User.updateOne(
    { _id: user._id },
    { 
      $set: { lastLogin: new Date() },
      $unset: { lockUntil: '', failedLoginAttempts: '' }
    }
  );

  await logUserLogin(req, user, 'SUCCESS');

  if (shouldSendLoginEmails(settings)) {
    sendLoginNotificationEmail(user.email, user.firstName).catch(() => {});
  }

  return res.status(200).json({
    success: true,
    message: 'Login successful',
    token: createAuthToken(user, settings),
    user: buildUserResponse(user),
  });
};

/**
 * Login user
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const settings = await loadSystemSettings();

    // 1. Check if user exists
    const user = await User.findOne({ email });

    if (!user) {
      // Log failed login attempt
      await logSecurityEvent(`Failed login attempt for email: ${email}`, 'MEDIUM', { email, ip: req.ip });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // 2. Check account status
    if (user.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'Account is not active. Please contact administrator.'
      });
    }

    if (getLockStatus(user)) {
      return res.status(423).json({
        success: false,
        message: 'Account temporarily locked due to repeated failed login attempts. Please try again later.',
      });
    }

    // 3. Check if user has set up password
    if (!user.password || user.mustSetPassword) {
      return res.status(403).json({
        success: false,
        message: 'Password not set. Please verify your email to set up your password.'
      });
    }

    // 4. Check if email is verified
    if (settings.systemSettings.requireEmailVerification && !user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Email not verified. Please check your email for verification link.'
      });
    }

    if (isPasswordExpired(user, settings)) {
      return res.status(403).json({
        success: false,
        message: 'Password expired. Please reset your password before signing in.',
      });
    }

    // 5. Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      const failedAttempt = await registerFailedLoginAttempt(user, settings);

      // Log failed login attempt
      await logSecurityEvent(`Failed login attempt for user: ${user.username}`, 'MEDIUM', {
        userId: normalizeUserId(user._id),
        email,
        ip: req.ip,
        attempts: failedAttempt.attempts,
        locked: failedAttempt.locked,
      });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (settings.securitySettings.twoFactorAuth && user.role !== 'SystemAdmin') {
      const { code, challengeToken } = createTwoFactorChallenge(user);
      const emailResult = await sendLoginVerificationCode(user.email, code, user.firstName);

      if (!emailResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Unable to send verification code. Please try again.',
        });
      }

      return res.status(200).json({
        success: true,
        requiresTwoFactor: true,
        challengeToken,
        message: 'A verification code has been sent to your email.',
      });
    }

    return finalizeSuccessfulLogin(req, res, user, settings);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

exports.verifyTwoFactorLogin = async (req, res) => {
  try {
    const { challengeToken, code } = req.body;
    const settings = await loadSystemSettings();

    if (!challengeToken || !code) {
      return res.status(400).json({
        success: false,
        message: 'Verification code is required',
      });
    }

    const decoded = verifyTwoFactorChallenge(challengeToken, code);
    const user = await findUserByFlexibleId(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'Account is not active. Please contact administrator.',
      });
    }

    return finalizeSuccessfulLogin(req, res, user, settings);
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message || 'Invalid verification code',
    });
  }
};

/**
 * Verify email and set password (self-service)
 * Called when user clicks verification link and sets their password
 */
exports.verifyEmailAndSetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // 1. Find verification token
    const verification = await VerificationToken.findOne({ token, type: 'email_verification' });

    if (!verification) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // 2. Check if token is expired
    if (verification.expiresAt < new Date()) {
      await VerificationToken.deleteOne({ _id: verification._id });
      return res.status(400).json({
        success: false,
        message: 'Verification token has expired'
      });
    }

    // 3. Check if token is already used
    if (verification.used) {
      return res.status(400).json({
        success: false,
        message: 'Verification token has already been used'
      });
    }

    // 4. Find user
    const user = await findUserByFlexibleId(verification.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // 5. Validate password
    const settings = await loadSystemSettings();
    const passwordErrors = validatePasswordAgainstPolicy(password, settings);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: passwordErrors[0]
      });
    }

    // 6. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 7. Update user
    user.password = hashedPassword;
    user.isVerified = true;
    user.mustSetPassword = false;
    user.status = 'Active';
    user.passwordChangedAt = new Date();
    await user.save();

    // 8. Mark token as used
    verification.used = true;
    await verification.save();

    // 9. Delete old verification tokens
    await VerificationToken.deleteMany({ userId: user._id, type: 'email_verification' });

    res.json({
      success: true,
      message: 'Email verified successfully. You can now log in.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Verification failed',
      error: error.message
    });
  }
};

/**
 * Resend verification email (for users who haven't verified yet)
 */
exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Delete old verification tokens
    await VerificationToken.deleteMany({ userId: user._id, type: 'email_verification' });

    // Generate new token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const verification = new VerificationToken({
      userId: user._id,
      token,
      type: 'email_verification',
      expiresAt
    });
    await verification.save();

    // Send verification email
    await sendVerificationEmail(user.email, token, user.firstName);

    res.json({
      success: true,
      message: 'Verification email sent'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send verification email',
      error: error.message
    });
  }
};

/**
 * Request password reset
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link will be sent.'
      });
    }

    const settings = await loadSystemSettings();

    if (settings.systemSettings.requireEmailVerification && !user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is not verified. Please verify your email first.'
      });
    }

    // Delete old reset tokens
    await VerificationToken.deleteMany({ userId: user._id, type: 'password_reset' });

    // Generate new token (valid for 1 hour)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const resetToken = new VerificationToken({
      userId: user._id,
      token,
      type: 'password_reset',
      expiresAt
    });
    await resetToken.save();

    // Send password reset email
    await sendPasswordResetEmail(user.email, token, user.firstName);

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link will be sent.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to process request',
      error: error.message
    });
  }
};

/**
 * Reset password with token
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const settings = await loadSystemSettings();

    // 1. Find reset token
    const resetToken = await VerificationToken.findOne({ token, type: 'password_reset' });

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // 2. Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      await VerificationToken.deleteOne({ _id: resetToken._id });
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired'
      });
    }

    // 3. Check if token is already used
    if (resetToken.used) {
      return res.status(400).json({
        success: false,
        message: 'Reset token has already been used'
      });
    }

    // 4. Find user
    const user = await findUserByFlexibleId(resetToken.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // 5. Validate password
    const passwordErrors = validatePasswordAgainstPolicy(password, settings);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: passwordErrors[0]
      });
    }

    // 6. Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 7. Update user
    user.password = hashedPassword;
    user.mustSetPassword = false;
    user.passwordChangedAt = new Date();
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    // 8. Mark token as used
    resetToken.used = true;
    await resetToken.save();

    // 9. Delete old reset tokens
    await VerificationToken.deleteMany({ userId: user._id, type: 'password_reset' });

    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: error.message
    });
  }
};

const sanitizeAppearanceSettings = (input = {}) => ({
  darkMode: Boolean(input.darkMode),
  colorTheme: ['green', 'blue', 'purple', 'orange', 'red', 'slate'].includes(String(input.colorTheme))
    ? String(input.colorTheme)
    : 'green',
  fontSize: ['small', 'medium', 'large', 'extraLarge'].includes(String(input.fontSize))
    ? String(input.fontSize)
    : 'medium',
  density: ['compact', 'comfortable', 'spacious'].includes(String(input.density))
    ? String(input.density)
    : 'comfortable',
  borderRadius: ['none', 'small', 'medium', 'large'].includes(String(input.borderRadius))
    ? String(input.borderRadius)
    : 'medium',
  sidebarCollapsed: Boolean(input.sidebarCollapsed),
  showAnimations: Boolean(input.showAnimations),
});

/**
 * Get current user profile
 */
exports.getMe = async (req, res) => {
  try {
    const user = await findUserByFlexibleId(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.password = undefined;

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

/**
 * Update current user profile
 */
exports.updateMe = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, profileImage, signature, appearanceSettings } = req.body;

    const updates = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (profileImage !== undefined) updates.profileImage = profileImage;
    if (signature !== undefined) updates.signature = signature;
    if (appearanceSettings !== undefined) {
      updates.appearanceSettings = sanitizeAppearanceSettings(appearanceSettings);
    }

    const user = await updateUserByFlexibleId(req.user.id, updates);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.password = undefined;

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

exports.updateAppearance = async (req, res) => {
  try {
    const updates = sanitizeAppearanceSettings(req.body || {});
    const existingUser = await findUserByFlexibleId(req.user.id);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await User.updateOne(
      { _id: existingUser._id },
      { $set: { appearanceSettings: updates } }
    );

    const user = await findUserByFlexibleId(existingUser._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found after update',
      });
    }

    user.password = undefined;

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to update appearance: ${error.message}`,
      error: error.message
    });
  }
};

/**
 * Change password (authenticated user)
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const settings = await loadSystemSettings();

    const user = await findUserByFlexibleId(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (!user.password || user.mustSetPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email first to set up your password'
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Validate new password
    const passwordErrors = validatePasswordAgainstPolicy(newPassword, settings);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: passwordErrors[0]
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.passwordChangedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};
