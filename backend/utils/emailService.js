const nodemailer = require('nodemailer');
const isTestEnv = process.env.NODE_ENV === 'test';

// Create transporter (configure with your email service)
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

/**
 * Send verification email
 * @param {string} email - Recipient email
 * @param {string} token - Verification token
 * @param {string} firstName - User's first name
 * @returns {Promise<object>} - Email send result
 */
const sendVerificationEmail = async (email, token, firstName = 'User') => {
  if (isTestEnv) {
    return { success: true, skipped: true, messageId: 'test-email-skipped' };
  }
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: process.env.SMTP_FROM || '"School Management System" <noreply@school.edu>',
    to: email,
    subject: 'Verify Your Email - School Management System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4a90d9;">Welcome to School Management System!</h2>
        <p>Hi ${firstName},</p>
        <p>Your account has been created. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #4a90d9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p style="color: #666; font-size: 12px;">This link will expire in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">If you didn't create an account, please ignore this email.</p>
      </div>
    `
  };

  try {
    const transporter = createTransporter();
    const result = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} token - Reset token
 * @param {string} firstName - User's first name
 * @returns {Promise<object>} - Email send result
 */
const sendPasswordResetEmail = async (email, token, firstName = 'User') => {
  if (isTestEnv) {
    return { success: true, skipped: true, messageId: 'test-email-skipped' };
  }
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  
  const mailOptions = {
    from: process.env.SMTP_FROM || '"School Management System" <noreply@school.edu>',
    to: email,
    subject: 'Password Reset - School Management System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">Password Reset Request</h2>
        <p>Hi ${firstName},</p>
        <p>You requested a password reset. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p style="color: #666; font-size: 12px;">This link will expire in 1 hour.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
      </div>
    `
  };

  try {
    const transporter = createTransporter();
    const result = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return { success: false, error: error.message };
  }
};

const sendLoginVerificationCode = async (email, code, firstName = 'User') => {
  if (isTestEnv) {
    return { success: true, skipped: true, messageId: 'test-email-skipped' };
  }
  const mailOptions = {
    from: process.env.SMTP_FROM || '"School Management System" <noreply@school.edu>',
    to: email,
    subject: 'Your Login Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4a90d9;">Login Verification</h2>
        <p>Hi ${firstName},</p>
        <p>Use this verification code to complete your login:</p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #1a4a3a;">
            ${code}
          </div>
        </div>
        <p style="color: #666; font-size: 12px;">This code expires in 10 minutes.</p>
      </div>
    `,
  };

  try {
    const transporter = createTransporter();
    const result = await transporter.sendMail(mailOptions);
    console.log('Login verification email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Failed to send login verification email:', error);
    return { success: false, error: error.message };
  }
};

const sendLoginNotificationEmail = async (email, firstName = 'User') => {
  if (isTestEnv) {
    return { success: true, skipped: true, messageId: 'test-email-skipped' };
  }
  const mailOptions = {
    from: process.env.SMTP_FROM || '"School Management System" <noreply@school.edu>',
    to: email,
    subject: 'New Login Detected',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a4a3a;">New Login Detected</h2>
        <p>Hi ${firstName},</p>
        <p>Your account was just used to sign in to the School Management System.</p>
        <p>If this was not you, please reset your password immediately and contact an administrator.</p>
      </div>
    `,
  };

  try {
    const transporter = createTransporter();
    const result = await transporter.sendMail(mailOptions);
    console.log('Login notification email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Failed to send login notification email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate a secure verification token
 * @returns {string} Random token
 */
const generateToken = () => {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Send absence alert email to parent
 * @param {object} parent - Parent user object
 * @param {object} student - Student user object
 * @param {object} attendance - Attendance record
 * @param {object} alert - Absence alert record
 * @returns {Promise<object>} - Email send result
 */
const sendAbsenceAlertEmail = async (parent, student, attendance, alert) => {
  if (isTestEnv) {
    return { success: true, skipped: true, messageId: 'test-email-skipped' };
  }

  const studentName = `${student.firstName} ${student.lastName}`;
  const date = new Date(attendance.date).toLocaleDateString();
  const status = attendance.status;
  
  const mailOptions = {
    from: process.env.SMTP_FROM || '"School Management System" <noreply@school.edu>',
    to: parent.email,
    subject: `Absence Alert - ${studentName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">Absence Alert</h2>
        <p>Dear ${parent.firstName} ${parent.lastName},</p>
        <p>This is to inform you that your child <strong>${studentName}</strong> was marked as <strong>${status}</strong> on <strong>${date}</strong>.</p>
        <p><strong>Details:</strong></p>
        <ul>
          <li>Date: ${date}</li>
          <li>Status: ${status}</li>
          <li>Period: ${attendance.period || 'Full Day'}</li>
          <li>Subject: ${attendance.subject || 'N/A'}</li>
          <li>Remarks: ${attendance.remarks || 'None'}</li>
        </ul>
        <p>Please contact the school if you have any questions or if this was an excused absence.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">This is an automated notification from the School Management System.</p>
      </div>
    `
  };

  try {
    const transporter = createTransporter();
    const result = await transporter.sendMail(mailOptions);
    console.log(`Absence alert email sent to ${parent.email}:`, result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Failed to send absence alert email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send thank you email to contact form submitter
 * @param {string} email - Submitter's email
 * @param {string} name - Submitter's name
 * @param {string} subject - Message subject
 * @returns {Promise<object>} - Email send result
 */
const sendContactThankYouEmail = async (email, name, subject) => {
  if (isTestEnv) {
    return { success: true, skipped: true, messageId: 'test-email-skipped' };
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || '"School Management System" <noreply@school.edu>',
    to: email,
    subject: 'Thank you for contacting us - School Management System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a4a3a;">Thank You for Contacting Us</h2>
        <p>Dear ${name},</p>
        <p>Thank you for reaching out to us. We have received your message regarding:</p>
        <p style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #1a4a3a; margin: 20px 0;">
          <strong>Subject:</strong> ${subject}
        </p>
        <p>Our team will review your message and get back to you within 1-2 business days.</p>
        <p>If you have any urgent matters, please contact the school directly by phone.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">This is an automated confirmation email. Please do not reply to this message.</p>
      </div>
    `
  };

  try {
    const transporter = createTransporter();
    const result = await transporter.sendMail(mailOptions);
    console.log(`Contact thank you email sent to ${email}:`, result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Failed to send contact thank you email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendLoginVerificationCode,
  sendLoginNotificationEmail,
  sendAbsenceAlertEmail,
  sendContactThankYouEmail,
  generateToken
};
