const ContactMessage = require('../models/ContactMessage');
const User = require('../models/User');
const { sendVerificationEmail, sendContactThankYouEmail } = require('../utils/emailService');

/**
 * Submit a contact form message (public endpoint - no auth required)
 */
exports.submitContactForm = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address'
      });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters'
      });
    }

    if (subject.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Subject must be at least 3 characters'
      });
    }

    if (message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Message must be at least 10 characters'
      });
    }

    // Create contact message
    const contactMessage = new ContactMessage({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });

    await contactMessage.save();

    // Send email notification to administrators
    try {
      await sendContactNotificationEmail(contactMessage);
      contactMessage.emailSent = true;
      contactMessage.emailSentAt = new Date();
      await contactMessage.save();
    } catch (emailError) {
      console.error('Failed to send contact notification email:', emailError);
      // Don't fail the request if email fails, just log it
    }

    // Send thank you email to the submitter
    try {
      await sendContactThankYouEmail(contactMessage.email, contactMessage.name, contactMessage.subject);
    } catch (thankYouEmailError) {
      console.error('Failed to send thank you email:', thankYouEmailError);
      // Don't fail the request if email fails, just log it
    }

    res.status(201).json({
      success: true,
      message: 'Message submitted successfully'
    });
  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit message',
      error: error.message
    });
  }
};

/**
 * Get all contact messages (admin only)
 */
exports.getAllContactMessages = async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const messages = await ContactMessage.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ContactMessage.countDocuments(query);

    res.json({
      success: true,
      data: messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact messages',
      error: error.message
    });
  }
};

/**
 * Get a single contact message by ID (admin only)
 */
exports.getContactMessageById = async (req, res) => {
  try {
    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact message',
      error: error.message
    });
  }
};

/**
 * Update contact message status (admin only)
 */
exports.updateContactMessageStatus = async (req, res) => {
  try {
    const { status, priority } = req.body;

    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    if (status) message.status = status;
    if (priority) message.priority = priority;

    await message.save();

    res.json({
      success: true,
      message: 'Contact message updated successfully',
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update contact message',
      error: error.message
    });
  }
};

/**
 * Respond to a contact message (admin only)
 */
exports.respondToContactMessage = async (req, res) => {
  try {
    const { response } = req.body;

    if (!response || response.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Response must be at least 5 characters'
      });
    }

    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    message.adminResponse = response.trim();
    message.respondedBy = req.user.id;
    message.respondedAt = new Date();
    message.status = 'Replied';

    await message.save();

    // Send response email to the contact form submitter
    try {
      await sendContactResponseEmail(message);
    } catch (emailError) {
      console.error('Failed to send contact response email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Response sent successfully',
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send response',
      error: error.message
    });
  }
};

/**
 * Delete a contact message (admin only)
 */
exports.deleteContactMessage = async (req, res) => {
  try {
    const message = await ContactMessage.findByIdAndDelete(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    res.json({
      success: true,
      message: 'Contact message deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete contact message',
      error: error.message
    });
  }
};

/**
 * Get contact message statistics (admin only)
 */
exports.getContactStats = async (req, res) => {
  try {
    const stats = {
      total: await ContactMessage.countDocuments(),
      new: await ContactMessage.countDocuments({ status: 'New' }),
      read: await ContactMessage.countDocuments({ status: 'Read' }),
      replied: await ContactMessage.countDocuments({ status: 'Replied' }),
      archived: await ContactMessage.countDocuments({ status: 'Archived' }),
      byPriority: {
        low: await ContactMessage.countDocuments({ priority: 'Low' }),
        medium: await ContactMessage.countDocuments({ priority: 'Medium' }),
        high: await ContactMessage.countDocuments({ priority: 'High' }),
        urgent: await ContactMessage.countDocuments({ priority: 'Urgent' })
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact statistics',
      error: error.message
    });
  }
};

/**
 * Helper function to send notification email to administrators
 */
async function sendContactNotificationEmail(contactMessage) {
  const nodemailer = require('nodemailer');
  const isTestEnv = process.env.NODE_ENV === 'test';

  if (isTestEnv) {
    return { success: true, skipped: true };
  }

  // Get all admin users
  const admins = await User.find({
    role: { $in: ['SystemAdmin', 'SchoolAdmin'] },
    status: 'Active'
  });

  if (admins.length === 0) {
    console.log('No active admins found to notify');
    return { success: true, skipped: true, reason: 'No admins' };
  }

  const adminEmails = admins.map(admin => admin.email).join(', ');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const mailOptions = {
    from: process.env.SMTP_FROM || '"School Management System" <noreply@school.edu>',
    to: adminEmails,
    subject: `New Contact Form Submission: ${contactMessage.subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a4a3a;">New Contact Form Submission</h2>
        <p>A new message has been submitted through the contact form:</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>From:</strong> ${contactMessage.name}</p>
          <p><strong>Email:</strong> ${contactMessage.email}</p>
          <p><strong>Subject:</strong> ${contactMessage.subject}</p>
          <p><strong>Priority:</strong> ${contactMessage.priority}</p>
          <p><strong>Date:</strong> ${new Date(contactMessage.createdAt).toLocaleString()}</p>
        </div>
        
        <div style="background-color: #fafafa; padding: 20px; border-left: 4px solid #1a4a3a; margin: 20px 0;">
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${contactMessage.message}</p>
        </div>
        
        <p>Please log in to the admin dashboard to view and respond to this message.</p>
      </div>
    `
  };

  const result = await transporter.sendMail(mailOptions);
  console.log('Contact notification email sent:', result.messageId);
  return { success: true, messageId: result.messageId };
}

/**
 * Helper function to send response email to contact form submitter
 */
async function sendContactResponseEmail(contactMessage) {
  const nodemailer = require('nodemailer');
  const isTestEnv = process.env.NODE_ENV === 'test';

  if (isTestEnv) {
    return { success: true, skipped: true };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const mailOptions = {
    from: process.env.SMTP_FROM || '"School Management System" <noreply@school.edu>',
    to: contactMessage.email,
    subject: `Re: ${contactMessage.subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a4a3a;">Response to Your Inquiry</h2>
        <p>Dear ${contactMessage.name},</p>
        <p>Thank you for contacting us. We have reviewed your message and our response is below:</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Your original message:</strong></p>
          <p style="white-space: pre-wrap; font-style: italic;">${contactMessage.message}</p>
        </div>
        
        <div style="background-color: #fafafa; padding: 20px; border-left: 4px solid #1a4a3a; margin: 20px 0;">
          <p><strong>Our response:</strong></p>
          <p style="white-space: pre-wrap;">${contactMessage.adminResponse}</p>
        </div>
        
        <p>If you have any further questions, please don't hesitate to contact us again.</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">This is an automated message from the School Management System.</p>
      </div>
    `
  };

  const result = await transporter.sendMail(mailOptions);
  console.log('Contact response email sent:', result.messageId);
  return { success: true, messageId: result.messageId };
}
