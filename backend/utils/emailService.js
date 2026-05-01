const https = require('https');
const isTestEnv = process.env.NODE_ENV === 'test';

/**
 * Send email using Brevo's HTTP API (Bypasses Render's SMTP port blocks)
 */
const sendViaBrevoAPI = (toEmail, subject, htmlContent) => {
  return new Promise((resolve, reject) => {
    if (!process.env.BREVO_API_KEY) {
      return reject(new Error("BREVO_API_KEY is not set in environment variables."));
    }

    // Default sender details based on your previous config
    const senderName = "HU Non-Boarding School";
    const senderEmail = (process.env.SMTP_USER || process.env.BREVO_SENDER_EMAIL || "abeniman740@gmail.com").trim();

    const payload = JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: toEmail }],
      subject: subject,
      htmlContent: htmlContent
    });

    const options = {
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY.trim(),
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data);
            resolve({ success: true, messageId: parsed.messageId });
          } catch(e) {
            resolve({ success: true, messageId: 'unknown' });
          }
        } else {
          reject(new Error(`Brevo API Error (${res.statusCode}): ${data}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.setTimeout(15000, () => {
      req.abort();
      reject(new Error('Brevo API request timed out'));
    });
    
    req.write(payload);
    req.end();
  });
};

/**
 * Verify Configuration
 */
const verifyConnection = async () => {
  if (!process.env.BREVO_API_KEY) {
    console.error('BREVO_API_KEY is missing! Emails will fail.');
    return false;
  }
  console.log('Brevo HTTP API configured successfully (bypassing SMTP).');
  return true;
};

/**
 * Send verification email
 */
const sendVerificationEmail = async (email, token, firstName = 'User') => {
  if (isTestEnv) return { success: true, skipped: true };
  
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
  const subject = 'Verify Your Email - School Management System';
  const html = `
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
    </div>
  `;

  try {
    const result = await sendViaBrevoAPI(email, subject, html);
    console.log('Verification email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Failed to send verification email:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, token, firstName = 'User') => {
  if (isTestEnv) return { success: true, skipped: true };
  
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  const subject = 'Password Reset - School Management System';
  const html = `
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
    </div>
  `;

  try {
    const result = await sendViaBrevoAPI(email, subject, html);
    console.log('Password reset email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Failed to send password reset email:', error.message);
    return { success: false, error: error.message };
  }
};

const sendLoginVerificationCode = async (email, code, firstName = 'User') => {
  if (isTestEnv) return { success: true, skipped: true };
  
  const subject = 'Your Login Verification Code';
  const html = `
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
  `;

  try {
    const result = await sendViaBrevoAPI(email, subject, html);
    console.log('Login verification email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Failed to send login verification email:', error.message);
    return { success: false, error: error.message };
  }
};

const sendLoginNotificationEmail = async (email, firstName = 'User') => {
  if (isTestEnv) return { success: true, skipped: true };
  
  const subject = 'New Login Detected';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a4a3a;">New Login Detected</h2>
      <p>Hi ${firstName},</p>
      <p>Your account was just used to sign in to the School Management System.</p>
      <p>If this was not you, please reset your password immediately and contact an administrator.</p>
    </div>
  `;

  try {
    const result = await sendViaBrevoAPI(email, subject, html);
    console.log('Login notification email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Failed to send login notification email:', error.message);
    return { success: false, error: error.message };
  }
};

const sendAbsenceAlertEmail = async (parent, student, attendance, alert) => {
  if (isTestEnv) return { success: true, skipped: true };

  const studentName = `${student.firstName} ${student.lastName}`;
  const date = new Date(attendance.date).toLocaleDateString();
  const status = attendance.status;
  
  const subject = `Absence Alert - ${studentName}`;
  const html = `
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
    </div>
  `;

  try {
    const result = await sendViaBrevoAPI(parent.email, subject, html);
    console.log(`Absence alert email sent to ${parent.email}:`, result.messageId);
    return result;
  } catch (error) {
    console.error('Failed to send absence alert email:', error.message);
    return { success: false, error: error.message };
  }
};

const sendContactThankYouEmail = async (email, name, subject) => {
  if (isTestEnv) return { success: true, skipped: true };

  const mailSubject = 'Thank you for contacting us - School Management System';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a4a3a;">Thank You for Contacting Us</h2>
      <p>Dear ${name},</p>
      <p>Thank you for reaching out to us. We have received your message regarding:</p>
      <p style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #1a4a3a; margin: 20px 0;">
        <strong>Subject:</strong> ${subject}
      </p>
      <p>Our team will review your message and get back to you within 1-2 business days.</p>
    </div>
  `;

  try {
    const result = await sendViaBrevoAPI(email, mailSubject, html);
    console.log(`Contact thank you email sent to ${email}:`, result.messageId);
    return result;
  } catch (error) {
    console.error('Failed to send contact thank you email:', error.message);
    return { success: false, error: error.message };
  }
};

const generateToken = () => {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendLoginVerificationCode,
  sendLoginNotificationEmail,
  sendAbsenceAlertEmail,
  sendContactThankYouEmail,
  generateToken,
  verifyConnection
};
