const Announcement = require('../models/Announcement');
const User = require('../models/User');
const AcademicRecord = require('../models/AcademicRecord');
const Attendance = require('../models/Attendance');
const mongoose = require('mongoose');

const normalizeId = (value) => String(value?._id || value?.id || value || '');

const canUserSeeAnnouncement = (announcement, user, now = new Date()) => {
  if (!announcement || !user) return false;

  if (user.role === 'SchoolAdmin') {
    return true;
  }

  if (!announcement.published) return false;

  if (announcement.publishStartDate && new Date(announcement.publishStartDate) > now) {
    return false;
  }

  if (announcement.publishEndDate && new Date(announcement.publishEndDate) < now) {
    return false;
  }

  const targetRoles = Array.isArray(announcement.targetRoles) ? announcement.targetRoles : [];
  if (!targetRoles.includes(user.role)) {
    return false;
  }

  if (user.role === 'Student' && user.studentProfile?.grade) {
    const targetGrades = Array.isArray(announcement.targetGrades)
      ? announcement.targetGrades
      : [];
    if (targetGrades.length && !targetGrades.includes('All')) {
      const studentGrade = String(user.studentProfile.grade).replace(/^Grade\s+/i, '').trim();
      if (!targetGrades.includes(studentGrade) && !targetGrades.includes(user.studentProfile.grade)) {
        return false;
      }
    }
  }

  return true;
};

/**
 * Get published announcements for the public landing page (no auth required)
 */
exports.getPublicAnnouncements = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const now = new Date();

    const announcements = await Announcement.find({
      published: true,
      $and: [
        {
          $or: [
            { publishStartDate: { $exists: false } },
            { publishStartDate: { $lte: now } }
          ]
        },
        {
          $or: [
            { publishEndDate: { $exists: false } },
            { publishEndDate: { $gte: now } }
          ]
        }
      ]
    })
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements',
      error: error.message
    });
  }
};

/**
 * Create a new announcement
 */
exports.createAnnouncement = async (req, res) => {
  try {
    const {
      title,
      content,
      type,
      priority,
      targetRoles,
      targetGrades,
      targetSections,
      publishStartDate,
      publishEndDate
    } = req.body;

    const announcement = new Announcement({
      title,
      content,
      type: type || 'General',
      priority: priority || 'Normal',
      targetRoles: targetRoles || ['SystemAdmin', 'SchoolAdmin', 'Teacher', 'Student', 'Parent'],
      targetGrades: targetGrades || ['All'],
      targetSections,
      publishStartDate,
      publishEndDate,
      createdBy: req.user.id,
      published: true
    });

    await announcement.save();

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: announcement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create announcement',
      error: error.message
    });
  }
};

/**
 * Get all announcements (with filters)
 */
exports.getAnnouncements = async (req, res) => {
  try {
    const {
      type,
      priority,
      published,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};

    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (published !== undefined) query.published = published === 'true';

    const announcements = await Announcement.find(query)
      .populate('createdBy', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Announcement.countDocuments(query);

    res.json({
      success: true,
      data: announcements,
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
      message: 'Failed to fetch announcements',
      error: error.message
    });
  }
};

/**
 * Get announcements visible to current user
 * Filters based on user role and grade (for students)
 */
exports.getMyAnnouncements = async (req, res) => {
  try {
    const user = req.user || await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const now = new Date();

    // Build query
    const query = {
      published: true,
      $or: [
        { publishStartDate: { $exists: false } },
        { publishStartDate: { $lte: now } }
      ]
    };

    // Filter by target roles
    query.targetRoles = { $in: [user.role] };

    // For students, filter by grade
    if (user.role === 'Student' && user.studentProfile?.grade) {
      query.$and = [
        {
          $or: [
            { targetGrades: 'All' },
            { targetGrades: user.studentProfile.grade }
          ]
        }
      ];
    }

    // Filter by date range
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { publishEndDate: { $exists: false } },
        { publishEndDate: { $gte: now } }
      ]
    });

    const announcements = await Announcement.find(query)
      .populate('createdBy', 'firstName lastName email role')
      .sort({ priority: -1, createdAt: -1 });

    res.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements',
      error: error.message
    });
  }
};

exports.getAnnouncementById = async (req, res) => {
  try {
    const user = req.user || await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const announcement = await Announcement.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email role');

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    if (!canUserSeeAnnouncement(announcement, user)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this announcement'
      });
    }

    res.json({
      success: true,
      data: announcement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcement',
      error: error.message
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const user = req.user || await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    if (!canUserSeeAnnouncement(announcement, user)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this announcement'
      });
    }

    if (!announcement.readBy.some((entry) => normalizeId(entry.user) === String(req.user.id))) {
      announcement.readBy.push({ user: req.user.id, readAt: new Date() });
      await announcement.save();
    }

    res.json({
      success: true,
      message: 'Announcement marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark announcement as read',
      error: error.message
    });
  }
};

/**
 * Update announcement
 */
exports.updateAnnouncement = async (req, res) => {
  try {
    const {
      title,
      content,
      type,
      priority,
      targetRoles,
      targetGrades,
      targetSections,
      published,
      publishStartDate,
      publishEndDate
    } = req.body;

    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Update fields
    if (title) announcement.title = title;
    if (content) announcement.content = content;
    if (type) announcement.type = type;
    if (priority) announcement.priority = priority;
    if (targetRoles) announcement.targetRoles = targetRoles;
    if (targetGrades) announcement.targetGrades = targetGrades;
    if (targetSections !== undefined) announcement.targetSections = targetSections;
    if (published !== undefined) announcement.published = published;
    if (publishStartDate) announcement.publishStartDate = publishStartDate;
    if (publishEndDate) announcement.publishEndDate = publishEndDate;

    await announcement.save();

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      data: announcement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update announcement',
      error: error.message
    });
  }
};

/**
 * Delete announcement
 */
exports.deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete announcement',
      error: error.message
    });
  }
};

/**
 * Toggle announcement published status
 */
exports.togglePublish = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    announcement.published = !announcement.published;
    await announcement.save();

    res.json({
      success: true,
      message: announcement.published ? 'Announcement published' : 'Announcement unpublished',
      data: announcement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to toggle announcement status',
      error: error.message
    });
  }
};

/**
 * Get system dashboard statistics
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const userRole = req.user.role;

    // Base stats - available to all admins
    const stats = {
      users: {
        total: 0,
        byRole: {}
      },
      students: {
        total: 0,
        byGrade: {}
      },
      announcements: {
        total: 0,
        published: 0
      }
    };

    // User counts by role
    const roleCounts = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    roleCounts.forEach(role => {
      stats.users.byRole[role._id] = role.count;
      stats.users.total += role.count;
    });

    // Student counts by grade (for secondary school: 9-12)
    const gradeCounts = await User.aggregate([
      { $match: { role: 'Student' } },
      {
        $group: {
          _id: '$studentProfile.grade',
          count: { $sum: 1 }
        }
      }
    ]);

    gradeCounts.forEach(grade => {
      if (grade._id) {
        stats.students.byGrade[grade._id] = grade.count;
        stats.students.total += grade.count;
      }
    });

    // Announcement counts
    stats.announcements.total = await Announcement.countDocuments();
    stats.announcements.published = await Announcement.countDocuments({ published: true });

    // Additional stats based on role
    if (['SystemAdmin', 'SchoolAdmin'].includes(userRole)) {
      // Active users in last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      stats.activeToday = await User.countDocuments({
        lastLogin: { $gte: yesterday }
      });

      // Pending accounts
      stats.pendingAccounts = await User.countDocuments({
        status: 'Pending'
      });

      // Recent registrations (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      stats.newThisWeek = await User.countDocuments({
        createdAt: { $gte: weekAgo }
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

/**
 * Get recent activity for dashboard
 */
exports.getRecentActivity = async (req, res) => {
  try {
    const userRole = req.user.role;
    const limit = parseInt(req.query.limit) || 10;

    const recentActivity = [];

    // Recent announcements
    const recentAnnouncements = await Announcement.find({ published: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('createdBy', 'firstName lastName');

    recentAnnouncements.forEach(announcement => {
      recentActivity.push({
        type: 'announcement',
        action: 'created',
        description: `New announcement: ${announcement.title}`,
        user: announcement.createdBy,
        timestamp: announcement.createdAt
      });
    });

    // Recent user registrations (for admins)
    if (['SystemAdmin', 'SchoolAdmin'].includes(userRole)) {
      const recentUsers = await User.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('firstName lastName email role createdAt');

      recentUsers.forEach(user => {
        recentActivity.push({
          type: 'user',
          action: 'registered',
          description: `New user registered: ${user.firstName} ${user.lastName}`,
          user: {
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          },
          timestamp: user.createdAt
        });
      });
    }

    // Sort by timestamp descending
    recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      data: recentActivity.slice(0, limit)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activity',
      error: error.message
    });
  }
};
