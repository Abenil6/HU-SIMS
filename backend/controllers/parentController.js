const User = require('../models/User');
const VerificationToken = require('../models/VerificationToken');
const AcademicRecord = require('../models/AcademicRecord');
const Attendance = require('../models/Attendance');
const Report = require('../models/Report');
const Certificate = require('../models/Certificate');
const Announcement = require('../models/Announcement');
const { sendVerificationEmail, generateToken } = require('../utils/emailService');
const { findUserByFlexibleId, findUserByFlexibleIdWithPopulate } = require('../utils/userLookup');

/**
 * Create parent (Admin function)
 * Parent is created without password - they must verify email and set password
 */
exports.createParent = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      gender,
      occupation,
      relationship
    } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: 'firstName, lastName and email are required'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const username = `${email.split('@')[0]}_${Date.now().toString().slice(-4)}`;

    const parent = new User({
      email,
      username,
      role: 'Parent',
      firstName,
      lastName,
      phone,
      status: 'Pending',
      isVerified: false,
      mustSetPassword: true,
      createdBy: req.user?.id,
      parentProfile: {
        gender,
        occupation,
        relationship
      }
    });

    await parent.save();

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await new VerificationToken({
      userId: parent._id,
      token,
      type: 'email_verification',
      expiresAt
    }).save();

    try {
      await sendVerificationEmail(email, token, firstName);
    } catch (emailError) {
      console.log('Email could not be sent:', emailError.message);
    }

    const parentResponse = await User.findById(parent._id).select('-password');

    res.status(201).json({
      success: true,
      message: 'Parent created successfully. Verification email sent.',
      data: parentResponse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create parent',
      error: error.message
    });
  }
};

/**
 * Get parent by ID (Admin/Teacher)
 */
exports.getParent = async (req, res) => {
  try {
    const { id } = req.params;
    const parent = await User.findOne({ _id: id, role: 'Parent' })
      .select('-password')
      .populate('parentProfile.linkedChildren', 'firstName lastName email studentProfile');

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    res.json({
      success: true,
      data: parent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch parent',
      error: error.message
    });
  }
};

/**
 * Update parent (Admin)
 */
exports.updateParent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};

    const updateData = {};
    ['firstName', 'lastName', 'phone', 'status'].forEach((field) => {
      if (updates[field] !== undefined) updateData[field] = updates[field];
    });

    if (updates.gender !== undefined) {
      updateData['parentProfile.gender'] = updates.gender;
    }
    if (updates.occupation !== undefined) {
      updateData['parentProfile.occupation'] = updates.occupation;
    }
    if (updates.relationship !== undefined) {
      updateData['parentProfile.relationship'] = updates.relationship;
    }

    const parent = await User.findOneAndUpdate(
      { _id: id, role: 'Parent' },
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    res.json({
      success: true,
      message: 'Parent updated successfully',
      data: parent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update parent',
      error: error.message
    });
  }
};

/**
 * Delete parent (Admin)
 */
exports.deleteParent = async (req, res) => {
  try {
    const { id } = req.params;

    const parent = await User.findOne({ _id: id, role: 'Parent' });
    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    if (parent.parentProfile?.linkedChildren?.length > 0) {
      await User.updateMany(
        { _id: { $in: parent.parentProfile.linkedChildren }, role: 'Student' },
        { $pull: { 'studentProfile.linkedParents': parent._id } }
      );
    }

    await User.deleteOne({ _id: id });

    res.json({
      success: true,
      message: 'Parent deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete parent',
      error: error.message
    });
  }
};

/**
 * Link student to parent (Admin)
 */
exports.linkStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'studentId is required'
      });
    }

    const parent = await User.findOne({ _id: id, role: 'Parent' });
    const student = await User.findOne({ _id: studentId, role: 'Student' });

    if (!parent || !student) {
      return res.status(404).json({
        success: false,
        message: 'Parent or student not found'
      });
    }

    if (!parent.parentProfile) parent.parentProfile = {};
    if (!Array.isArray(parent.parentProfile.linkedChildren)) {
      parent.parentProfile.linkedChildren = [];
    }
    if (!student.studentProfile) student.studentProfile = {};
    if (!Array.isArray(student.studentProfile.linkedParents)) {
      student.studentProfile.linkedParents = [];
    }

    const parentHasChild = parent.parentProfile.linkedChildren.some(
      (c) => c.toString() === studentId
    );
    const studentHasParent = student.studentProfile.linkedParents.some(
      (p) => p.toString() === id
    );

    if (!parentHasChild) parent.parentProfile.linkedChildren.push(student._id);
    if (!studentHasParent) student.studentProfile.linkedParents.push(parent._id);

    await parent.save();
    await student.save();

    res.json({
      success: true,
      message: 'Student linked successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to link student',
      error: error.message
    });
  }
};

/**
 * Unlink student from parent (Admin)
 */
exports.unlinkStudent = async (req, res) => {
  try {
    const { id, studentId } = req.params;

    const parent = await User.findOne({ _id: id, role: 'Parent' });
    const student = await User.findOne({ _id: studentId, role: 'Student' });

    if (!parent || !student) {
      return res.status(404).json({
        success: false,
        message: 'Parent or student not found'
      });
    }

    await User.updateOne(
      { _id: id, role: 'Parent' },
      { $pull: { 'parentProfile.linkedChildren': student._id } }
    );
    await User.updateOne(
      { _id: studentId, role: 'Student' },
      { $pull: { 'studentProfile.linkedParents': parent._id } }
    );

    res.json({
      success: true,
      message: 'Student unlinked successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to unlink student',
      error: error.message
    });
  }
};

/**
 * Get children for a parent by parent ID (Admin/Teacher)
 */
exports.getChildren = async (req, res) => {
  try {
    const { parentId } = req.params;

    const parent = await User.findOne({ _id: parentId, role: 'Parent' })
      .select('-password')
      .populate('parentProfile.linkedChildren', 'firstName lastName email studentProfile');

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    const linkedChildren = parent.parentProfile?.linkedChildren || [];
    const seenChildIds = new Set();
    const children = linkedChildren.filter((child) => {
      const id = child?._id?.toString?.();
      if (!id || seenChildIds.has(id)) return false;
      seenChildIds.add(id);
      return true;
    });

    res.json({
      success: true,
      data: children
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch children',
      error: error.message
    });
  }
};

/**
 * Get parents linked to a student (Admin/Teacher)
 */
exports.getParentByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await User.findOne({ _id: studentId, role: 'Student' })
      .populate('studentProfile.linkedParents', 'firstName lastName email phone parentProfile');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const linkedParents = student.studentProfile?.linkedParents || [];
    const seenParentIds = new Set();
    const parents = linkedParents.filter((parent) => {
      const id = parent?._id?.toString?.();
      if (!id || seenParentIds.has(id)) return false;
      seenParentIds.add(id);
      return true;
    });

    res.json({
      success: true,
      data: parents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch parents by student',
      error: error.message
    });
  }
};

/**
 * Get all parents (for admin/teacher to link with students)
 */
exports.getParents = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    
    const query = { role: 'Parent' };
    
    // Search by name or email
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by status
    if (status) {
      query.status = status;
    }

    const parents = await User.find(query)
      .select('-password')
      .populate('parentProfile.linkedChildren', 'firstName lastName email studentProfile')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    const normalizedParents = parents.map((parent) => {
      const linkedChildren = parent.parentProfile?.linkedChildren || [];
      const seenChildIds = new Set();
      const students = linkedChildren
        .filter((child) => {
          const id = child?._id?.toString?.();
          if (!id || seenChildIds.has(id)) return false;
          seenChildIds.add(id);
          return true;
        })
        .map((child) => ({
          id: child._id,
          studentId: child.studentProfile?.studentId || "",
          name: `${child.firstName || ""} ${child.lastName || ""}`.trim(),
        }));

      return {
        ...parent.toObject(),
        relationship: parent.parentProfile?.relationship || "",
        students,
      };
    });

    res.json({
      success: true,
      data: normalizedParents,
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
      message: 'Failed to fetch parents',
      error: error.message
    });
  }
};

/**
 * Get parent's own profile
 */
exports.getMyProfile = async (req, res) => {
  try {
    const parent = await findUserByFlexibleId(req.user.id);

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    res.json({
      success: true,
      data: parent
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
 * Get parent's linked children
 */
exports.getMyChildren = async (req, res) => {
  try {
    const parent = await findUserByFlexibleIdWithPopulate(req.user.id, 'parentProfile.linkedChildren');

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    const linkedChildren = parent.parentProfile?.linkedChildren || [];
    const seenChildIds = new Set();
    const children = linkedChildren
      .filter((child) => {
        const id = child?._id?.toString?.();
        if (!id || seenChildIds.has(id)) return false;
        seenChildIds.add(id);
        return true;
      })
      .map((child) => ({
        ...child.toObject(),
        id: child._id,
        studentId: child.studentProfile?.studentId || "",
      }));

    res.json({
      success: true,
      data: {
        children
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch children',
      error: error.message
    });
  }
};

/**
 * Get link requests sent by parent
 */
exports.getMyLinkRequests = async (req, res) => {
  try {
    const parent = await findUserByFlexibleId(req.user.id);

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    res.json({
      success: true,
      data: {
        pendingRequests: parent.parentProfile?.childLinkRequests || []
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch link requests',
      error: error.message
    });
  }
};

/**
 * Get a single child's information
 */
exports.getChild = async (req, res) => {
  try {
    const { childId } = req.params;

    // Verify parent has access to this child
    const parent = await findUserByFlexibleId(req.user.id);
    const childIds = parent.parentProfile?.linkedChildren?.map(c => c.toString()) || [];

    if (!childIds.includes(childId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this student'
      });
    }

    const child = await User.findById(childId).select('-password');

    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: child
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch child information',
      error: error.message
    });
  }
};

/**
 * Get child linked to parent - grades
 */
exports.getChildGrades = async (req, res) => {
  try {
    const { childId } = req.params;
    const { academicYear, semester } = req.query;

    // Verify parent has access to this child
    const parent = await findUserByFlexibleId(req.user.id);
    const childIds = parent.parentProfile?.linkedChildren?.map(c => c.toString()) || [];

    if (!childIds.includes(childId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this student'
      });
    }

    const child = await User.findById(childId);
    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const query = { student: childId };
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = semester;

    const records = await AcademicRecord.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        student: {
          id: child._id,
          name: `${child.firstName} ${child.lastName}`,
          grade: child.studentProfile?.grade
        },
        grades: records
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grades',
      error: error.message
    });
  }
};

/**
 * Get child's average marks with ranking (no GPA)
 */
exports.getChildAverage = async (req, res) => {
  try {
    const { childId } = req.params;
    const { academicYear, semester } = req.query;

    // Verify parent has access
    const parent = await findUserByFlexibleId(req.user.id);
    const childIds = parent.parentProfile?.linkedChildren?.map(c => c.toString()) || [];

    if (!childIds.includes(childId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this student'
      });
    }

    const child = await User.findById(childId);
    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const query = { student: childId, status: 'Approved' };
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = semester;

    const records = await AcademicRecord.find(query);

    if (records.length === 0) {
      return res.json({
        success: true,
        data: {
          averageMarks: 0,
          totalSubjects: 0,
          totalMarks: 0,
          rank: null,
          totalStudents: 0
        }
      });
    }

    let totalMarks = 0;
    records.forEach(record => {
      totalMarks += record.totalMarks || 0;
    });

    const averageMarks = records.length > 0 ? (totalMarks / records.length).toFixed(2) : 0;

    // Calculate rank within class/section
    const studentGrade = child.studentProfile?.grade;
    const studentStream = child.studentProfile?.stream || child.studentProfile?.section;

    let rank = null;
    let totalStudents = 0;

    if (studentGrade) {
      // Get all students in the same grade
      const classStudents = await User.find({
        role: 'Student',
        'studentProfile.grade': studentGrade
      });

      totalStudents = classStudents.length;

      // Calculate average for each student
      const studentAverages = await Promise.all(
        classStudents.map(async (student) => {
          const studentRecords = await AcademicRecord.find({
            student: student._id,
            academicYear: academicYear || '2025-2026',
            semester: semester || '1',
            status: 'Approved'
          });

          if (studentRecords.length === 0) return null;

          const total = studentRecords.reduce((sum, r) => sum + (r.totalMarks || 0), 0);
          return {
            studentId: student._id,
            average: total / studentRecords.length
          };
        })
      );

      // Filter out nulls and sort by average (descending)
      const validAverages = studentAverages.filter(a => a !== null && a.average > 0);
      validAverages.sort((a, b) => b.average - a.average);

      // Find rank
      const currentRank = validAverages.findIndex(a => a.studentId.toString() === childId);
      if (currentRank !== -1) {
        rank = currentRank + 1;
      }
      totalStudents = validAverages.length;
    }

    res.json({
      success: true,
      data: {
        student: {
          id: child._id,
          name: `${child.firstName} ${child.lastName}`,
          grade: studentGrade,
          stream: studentStream
        },
        averageMarks,
        totalSubjects: records.length,
        totalMarks: Math.round(totalMarks),
        rank,
        totalStudents
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to calculate average marks',
      error: error.message
    });
  }
};

/**
 * Get child's attendance
 */
exports.getChildAttendance = async (req, res) => {
  try {
    const { childId } = req.params;
    const { month, year, status } = req.query;

    // Verify parent has access
    const parent = await findUserByFlexibleId(req.user.id);
    const childIds = parent.parentProfile?.linkedChildren?.map(c => c.toString()) || [];

    if (!childIds.includes(childId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this student'
      });
    }

    const query = { student: childId };
    if (month) {
      const startDate = new Date(year || new Date().getFullYear(), month - 1, 1);
      const endDate = new Date(year || new Date().getFullYear(), month, 0);
      query.date = { $gte: startDate, $lte: endDate };
    }
    if (status) query.status = status;

    const attendance = await Attendance.find(query).sort({ date: -1 });

    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'Present').length;
    const absent = attendance.filter(a => a.status === 'Absent').length;
    const late = attendance.filter(a => a.status === 'Late').length;
    const excused = attendance.filter(a => a.status === 'Excused').length;

    res.json({
      success: true,
      data: {
        records: attendance,
        summary: {
          total,
          present,
          absent,
          late,
          excused,
          attendanceRate: total > 0 ? ((present / total) * 100).toFixed(2) : 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance',
      error: error.message
    });
  }
};

/**
 * Get child's certificates
 */
exports.getChildCertificates = async (req, res) => {
  try {
    const { childId } = req.params;

    // Verify parent has access
    const parent = await findUserByFlexibleId(req.user.id);
    const childIds = parent.parentProfile?.linkedChildren?.map(c => c.toString()) || [];

    if (!childIds.includes(childId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this student'
      });
    }

    const certificates = await Certificate.find({ student: childId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: certificates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certificates',
      error: error.message
    });
  }
};

/**
 * Get child's reports
 */
exports.getChildReports = async (req, res) => {
  try {
    const { childId } = req.params;
    const { type } = req.query;

    // Verify parent has access
    const parent = await findUserByFlexibleId(req.user.id);
    const childIds = parent.parentProfile?.linkedChildren?.map(c => c.toString()) || [];

    if (!childIds.includes(childId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this student'
      });
    }

    const query = { student: childId };
    if (type) query.reportType = type;

    const reports = await Report.find(query)
      .populate('generatedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: error.message
    });
  }
};

/**
 * Get announcements for parents
 */
exports.getMyAnnouncements = async (req, res) => {
  try {
    const now = new Date();

    const announcements = await Announcement.find({
      published: true,
      targetRoles: 'Parent',
      $or: [
        { publishStartDate: { $exists: false } },
        { publishStartDate: { $lte: now } }
      ]
    })
      .populate('createdBy', 'firstName lastName')
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

/**
 * Send message to teacher
 */
exports.sendMessageToTeacher = async (req, res) => {
  try {
    const { teacherId, subject, message, childId } = req.body;

    const Message = require('../models/Message');

    // Verify parent has access to this child
    const parent = await findUserByFlexibleId(req.user.id);
    const childIds = parent.parentProfile?.linkedChildren?.map(c => c.toString()) || [];

    if (childId && !childIds.includes(childId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this student'
      });
    }

    const newMessage = new Message({
      senderId: req.user.id,
      senderRole: 'Parent',
      recipientId: teacherId,
      recipientRole: 'Teacher',
      subject,
      content: message,
      relatedStudentId: childId || null,
      type: 'direct'
    });

    await newMessage.save();

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: newMessage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};
