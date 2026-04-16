const AbsenceAlert = require('../models/AbsenceAlert');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { PERMISSIONS, RESOURCES } = require('../models/Permission');
const { loadSystemSettings } = require('../utils/systemSettings');

/**
 * Check if notifications are enabled in system settings
 */
const areNotificationsEnabled = async () => {
  const settings = await loadSystemSettings();
  return settings?.systemSettings?.enableNotifications === true;
};

/**
 * Create absence alert from attendance record
 */
exports.createAbsenceAlert = async (req, res) => {
  try {
    // Check if notifications are enabled
    if (!await areNotificationsEnabled()) {
      return res.status(403).json({
        success: false,
        message: 'Notifications are disabled by system administrator'
      });
    }

    const { attendanceId } = req.params;

    // Get attendance record
    const attendance = await Attendance.findById(attendanceId)
      .populate('student', 'firstName lastName studentProfile');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    // Only create alert for absent students
    if (attendance.status !== 'Absent') {
      return res.status(400).json({
        success: false,
        message: 'Alert can only be created for absent students'
      });
    }

    // Create alert
    const alert = await AbsenceAlert.createFromAttendance(attendance, req.user);

    res.status(201).json({
      success: true,
      message: 'Absence alert created successfully',
      data: alert
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create absence alert',
      error: error.message
    });
  }
};

/**
 * Get all absence alerts (Admin/Teacher)
 */
exports.getAbsenceAlerts = async (req, res) => {
  try {
    const { academicYear, grade, section, status, page = 1, limit = 20 } = req.query;

    const query = {};

    // Filter by academic year
    if (academicYear) query.academicYear = academicYear;
    if (grade) query.grade = grade;
    if (section) query.section = section;
    if (status) query.status = status;

    const alerts = await AbsenceAlert.find(query)
      .populate('student', 'firstName lastName studentProfile')
      .populate('teacher', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await AbsenceAlert.countDocuments(query);

    res.json({
      success: true,
      data: alerts,
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
      message: 'Failed to fetch absence alerts',
      error: error.message
    });
  }
};

/**
 * Get parent alerts
 */
exports.getParentAlerts = async (req, res) => {
  try {
    const alerts = await AbsenceAlert.getParentAlerts(req.user.id);

    const unreadCount = alerts.filter(a => {
      const parentAlert = a.parents.find(p => p.parent.toString() === req.user.id);
      return parentAlert && parentAlert.status === 'Pending';
    }).length;

    res.json({
      success: true,
      data: alerts,
      unreadCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: error.message
    });
  }
};

/**
 * Get student alerts
 */
exports.getStudentAlerts = async (req, res) => {
  try {
    const alerts = await AbsenceAlert.getStudentAlerts(req.user.id);

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: error.message
    });
  }
};

/**
 * Mark alert as read by parent
 */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await AbsenceAlert.findById(id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Update parent status
    const parentAlert = alert.parents.find(
      p => p.parent.toString() === req.user.id
    );

    if (parentAlert) {
      parentAlert.status = 'Read';
      parentAlert.readAt = new Date();
      await alert.save();
    }

    // Update notification status if all parents have read
    const allRead = alert.parents.every(p => p.status === 'Read');
    if (allRead) {
      alert.notificationStatus = 'Read';
    }

    res.json({
      success: true,
      message: 'Alert marked as read',
      data: alert
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark alert as read',
      error: error.message
    });
  }
};

/**
 * Parent respond to alert
 */
exports.respondToAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { response, responseNote } = req.body;

    console.log('Responding to alert:', id, 'for user:', req.user.id);
    console.log('Response data:', { response, responseNote });

    const alert = await AbsenceAlert.findById(id);

    if (!alert) {
      console.error('Alert not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Update parent response
    const parentAlert = alert.parents.find(
      p => p.parent.toString() === req.user.id
    );

    if (!parentAlert) {
      console.error('Parent not found in alert parents array');
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to respond to this alert'
      });
    }

    parentAlert.status = 'Read';
    parentAlert.readAt = new Date();

    alert.parentResponse = {
      responded: true,
      response,
      responseDate: new Date(),
      responseNote
    };

    await alert.save();
    console.log('Response saved successfully');

    res.json({
      success: true,
      message: 'Response submitted successfully',
      data: alert
    });
  } catch (error) {
    console.error('Failed to submit response:', error.message);
    console.error('Error details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit response',
      error: error.message
    });
  }
};

/**
 * Send notification to parents
 */
exports.sendNotification = async (req, res) => {
  try {
    // Check if notifications are enabled
    if (!await areNotificationsEnabled()) {
      return res.status(403).json({
        success: false,
        message: 'Notifications are disabled by system administrator'
      });
    }

    const { id } = req.params;
    const { method } = req.body; // SMS, Email, Push

    const alert = await AbsenceAlert.findById(id)
      .populate('student', 'firstName lastName studentProfile')
      .populate('parents.parent', 'email phone');

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // In production, integrate with SMS/Email service
    // For now, just update the status
    alert.notificationStatus = 'Sent';
    alert.notificationSentAt = new Date();
    alert.notificationMethod = method || 'InApp';

    // Update parent statuses
    alert.parents.forEach(p => {
      p.status = 'Sent';
      p.sentAt = new Date();
    });

    await alert.save();

    // TODO: Integrate with actual notification service
    // await sendSMS(alert.parents.parent.phone, message);
    // await sendEmail(alert.parents.parent.email, subject, message);

    res.json({
      success: true,
      message: 'Notification sent successfully',
      data: alert
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
};

/**
 * Resolve alert
 */
exports.resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await AbsenceAlert.findById(id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    alert.status = 'Resolved';
    alert.resolvedAt = new Date();
    alert.resolvedBy = req.user.id;

    await alert.save();

    res.json({
      success: true,
      message: 'Alert resolved',
      data: alert
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to resolve alert',
      error: error.message
    });
  }
};

/**
 * Get absence alert statistics
 */
exports.getAlertStats = async (req, res) => {
  try {
    const { academicYear } = req.query;

    const query = {};
    if (academicYear) query.academicYear = academicYear;

    const totalAlerts = await AbsenceAlert.countDocuments(query);
    const unresolvedAlerts = await AbsenceAlert.countDocuments({ ...query, status: 'Active' });
    const sentNotifications = await AbsenceAlert.countDocuments({ ...query, notificationStatus: 'Sent' });

    // Get alerts by grade
    const alertsByGrade = await AbsenceAlert.aggregate([
      { $match: query },
      { $group: { _id: '$grade', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Get alerts by type
    const alertsByType = await AbsenceAlert.aggregate([
      { $match: query },
      { $group: { _id: '$alertType', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        totalAlerts,
        unresolvedAlerts,
        sentNotifications,
        alertsByGrade,
        alertsByType
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

/**
 * Auto-create alerts for all absent students in attendance
 */
exports.batchCreateAlerts = async (req, res) => {
  try {
    // Check if notifications are enabled
    if (!await areNotificationsEnabled()) {
      return res.status(403).json({
        success: false,
        message: 'Notifications are disabled by system administrator'
      });
    }

    const { academicYear, date, grade, section } = req.body;

    // Find all absent students for the given criteria
    const attendanceQuery = {
      academicYear,
      date: new Date(date),
      status: 'Absent'
    };

    if (grade) attendanceQuery.grade = grade;
    if (section) attendanceQuery.section = section;

    const absentRecords = await Attendance.find(attendanceQuery)
      .populate('student', 'firstName lastName studentProfile');

    const alerts = [];
    const errors = [];

    for (const record of absentRecords) {
      try {
        const alert = await AbsenceAlert.createFromAttendance(record, req.user);
        alerts.push(alert);
      } catch (err) {
        errors.push({ student: record.student?.firstName, error: err.message });
      }
    }

    res.status(201).json({
      success: true,
      message: `Created ${alerts.length} absence alerts`,
      data: {
        created: alerts.length,
        errors: errors.length,
        errorDetails: errors
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to batch create alerts',
      error: error.message
    });
  }
};
