const User = require('../models/User');
const VerificationToken = require('../models/VerificationToken');
const AcademicRecord = require('../models/AcademicRecord');
const Attendance = require('../models/Attendance');
const Timetable = require('../models/Timetable');
const Announcement = require('../models/Announcement');
const Report = require('../models/Report');
const { generateToken, sendVerificationEmail } = require('../utils/emailService');
const { findUserByFlexibleId } = require('../utils/userLookup');

/**
 * Create a new teacher (Admin function)
 * Teacher is created without password - they must verify email and set password
 */
exports.createTeacher = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      qualification,
      specialization,
      subjects,
      classes
    } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Generate username from email
    const username = email.split('@')[0] + Date.now().toString(36).slice(-4);

    // Generate a temporary password (will be reset after verification)
    const tempPassword = generateToken().slice(0, 16);

    // Create teacher user with verification required
    const teacher = new User({
      firstName,
      lastName,
      email,
      username,
      password: tempPassword,
      phone,
      role: 'Teacher',
      status: 'Pending',
      isVerified: false,
      mustSetPassword: true,
      createdBy: req.user?.id,
      teacherProfile: {
        qualifications: qualification ? [qualification] : [],
        subjects: subjects || [],
        subject: Array.isArray(subjects) && subjects.length > 0 ? subjects[0] : '',
        classes: classes || []
      }
    });

    await teacher.save();

    // Generate verification token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const verification = new VerificationToken({
      userId: teacher._id,
      token,
      type: 'email_verification',
      expiresAt
    });
    await verification.save();

    // Send verification email (suppress error if email fails)
    try {
      await sendVerificationEmail(email, token, firstName);
    } catch (emailError) {
      console.log('Email could not be sent:', emailError.message);
    }

    // Return teacher without password
    const teacherResponse = await User.findById(teacher._id).select('-password');

    res.status(201).json({
      success: true,
      message: 'Teacher created successfully. Verification email sent.',
      data: teacherResponse,
      isVerified: false
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create teacher',
      error: error.message
    });
  }
};

/**
 * Get all teachers with pagination and filters (Admin function)
 */
exports.getTeachers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, subject, status } = req.query;

    const query = { role: 'Teacher' };

    // Search by name or email
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by subject
    if (subject) {
      query['teacherProfile.subjects'] = subject;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    const teachers = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: teachers,
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
      message: 'Failed to fetch teachers',
      error: error.message
    });
  }
};

/**
 * Update teacher (Admin function)
 */
exports.updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const mongoose = require('mongoose');
    console.log('[updateTeacher] id received:', id, 'type:', typeof id);

    // IMPORTANT: In this database, _id values are stored as plain String (not ObjectId).
    // Mongoose's schema declares _id as ObjectId and auto-casts all _id queries,
    // so standard User.findOne({ _id }) and User.findById() both fail to match String _ids.
    // We bypass Mongoose casting using the raw MongoDB collection driver for the lookup.
    const col = mongoose.connection.db.collection('users');
    let rawTeacher = null;

    // 1. Try matching by _id (string) with role = Teacher
    rawTeacher = await col.findOne({ _id: String(id), role: 'Teacher' });
    console.log('[updateTeacher] raw findOne by _id+role:', rawTeacher ? rawTeacher._id : null);

    // 2. Try matching by ObjectId (in case ID is stored as ObjectId)
    if (!rawTeacher && mongoose.Types.ObjectId.isValid(id)) {
      rawTeacher = await col.findOne({ _id: new mongoose.Types.ObjectId(id), role: 'Teacher' });
      console.log('[updateTeacher] raw findOne by ObjectId+role:', rawTeacher ? rawTeacher._id : null);
    }

    // 2. Fall back to email or username
    if (!rawTeacher) {
      rawTeacher = await col.findOne({
        role: 'Teacher',
        $or: [{ email: id }, { username: id }]
      });
      console.log('[updateTeacher] raw findOne by email/username:', rawTeacher ? rawTeacher._id : null);
    }

    if (!rawTeacher) {
      // Diagnostics: check if any user has this _id (try both string and ObjectId)
      let anyUser = await col.findOne({ _id: String(id) }, { projection: { role: 1, firstName: 1, lastName: 1 } });
      console.log('[updateTeacher] anyUser fallback (string):', anyUser);
      
      if (!anyUser && mongoose.Types.ObjectId.isValid(id)) {
        anyUser = await col.findOne({ _id: new mongoose.Types.ObjectId(id) }, { projection: { role: 1, firstName: 1, lastName: 1 } });
        console.log('[updateTeacher] anyUser fallback (ObjectId):', anyUser);
      }
      
      // Additional diagnostics: list all teacher IDs in database
      const allTeachers = await col.find({ role: 'Teacher' }, { projection: { _id: 1, firstName: 1, lastName: 1, email: 1 } }).limit(5).toArray();
      console.log('[updateTeacher] Sample teachers in DB:', allTeachers.map(t => ({ _id: t._id, name: `${t.firstName} ${t.lastName}`, email: t.email })));
      
      const msg = anyUser
        ? `User found but role is '${anyUser.role}' — expected 'Teacher'`
        : `Teacher not found (id: ${id})`;
      return res.status(404).json({
        success: false,
        message: msg
      });
    }

    // Wrap rawTeacher in a lightweight object we can use below
    // Use the actual _id value from the document (could be string or ObjectId)
    const teacherId = rawTeacher._id;

    // Build update object
    const updateData = {};

    // Root-level user fields
    const rootFields = ['firstName', 'lastName', 'phone', 'status', 'gender'];
    rootFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    // Address
    if (updates.address && typeof updates.address === 'object') {
      if (updates.address.street !== undefined) updateData['address.street'] = updates.address.street;
      if (updates.address.city !== undefined) updateData['address.city'] = updates.address.city;
      if (updates.address.region !== undefined) updateData['address.region'] = updates.address.region;
    }

    // teacherProfile.subjects (array)
    if (updates.subjects !== undefined) {
      updateData['teacherProfile.subjects'] = Array.isArray(updates.subjects)
        ? updates.subjects
        : String(updates.subjects).split(',').map(s => s.trim()).filter(Boolean);
    }

    // teacherProfile.subject (singular — first of selected subjects)
    if (updates.subject !== undefined) {
      updateData['teacherProfile.subject'] = updates.subject;
    } else if (updates.subjects && Array.isArray(updates.subjects) && updates.subjects.length > 0) {
      // Auto-derive singular subject from the first element of subjects array
      updateData['teacherProfile.subject'] = updates.subjects[0];
    }

    // teacherProfile.qualifications
    if (updates.qualification !== undefined) {
      const qualification = String(updates.qualification || '').trim();
      updateData['teacherProfile.qualifications'] = qualification ? [qualification] : [];
    }

    // teacherProfile.specialization
    if (updates.specialization !== undefined) {
      updateData['teacherProfile.specialization'] = updates.specialization;
    }

    // teacherProfile.classes
    if (updates.classes !== undefined) {
      updateData['teacherProfile.classes'] = Array.isArray(updates.classes) ? updates.classes : [];
    }

    // Allow nested teacherProfile payload too
    if (updates.teacherProfile && typeof updates.teacherProfile === 'object') {
      const tp = updates.teacherProfile;
      if (tp.subjects !== undefined) updateData['teacherProfile.subjects'] = tp.subjects;
      if (tp.subject !== undefined) updateData['teacherProfile.subject'] = tp.subject;
      if (tp.qualifications !== undefined) updateData['teacherProfile.qualifications'] = tp.qualifications;
      if (tp.classes !== undefined) updateData['teacherProfile.classes'] = tp.classes;
      if (tp.specialization !== undefined) updateData['teacherProfile.specialization'] = tp.specialization;
    }

    const updated = await col.findOneAndUpdate(
      { _id: teacherId },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    if (!updated) {
      return res.status(500).json({ success: false, message: 'Update failed — document not returned' });
    }
    // Remove password before sending back
    delete updated.password;

    res.json({
      success: true,
      message: 'Teacher updated successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update teacher',
      error: error.message
    });
  }
};


/**
 * Delete teacher (Admin function)
 */
exports.deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID provided'
      });
    }

    const teacher = await User.findById(id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    if (teacher.role !== 'Teacher') {
      return res.status(400).json({
        success: false,
        message: 'User is not a teacher'
      });
    }

    await AcademicRecord.deleteMany({ teacher: id });
    await Attendance.deleteMany({ teacher: id });
    await Report.deleteMany({ generatedBy: id });
    await Announcement.deleteMany({ createdBy: id });

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Teacher deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete teacher',
      error: error.message
    });
  }
};

/**
 * Get teacher's own profile
 */
exports.getMyProfile = async (req, res) => {
  try {
    const teacher = await findUserByFlexibleId(req.user.id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    res.json({
      success: true,
      data: teacher
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
 * Get teacher's assigned classes
 */
exports.getMyClasses = async (req, res) => {
  try {
    const teacher = await findUserByFlexibleId(req.user.id);

    if (!teacher || !teacher.teacherProfile) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    // Find classes where this teacher is assigned
    const classes = await Timetable.find({
      'periods.teacher': req.user.id
    }).select('class.grade class.section');

    // Get unique classes
    const uniqueClasses = [];
    const seen = new Set();

    classes.forEach(timetable => {
      const key = `${timetable.class.grade}-${timetable.class.section}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueClasses.push({
          grade: timetable.class.grade,
          section: timetable.class.section
        });
      }
    });

    res.json({
      success: true,
      data: {
        profile: teacher.teacherProfile,
        assignedClasses: uniqueClasses
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch classes',
      error: error.message
    });
  }
};

/**
 * Get students assigned to the teacher
 */
exports.getMyStudents = async (req, res) => {
  try {
    // Get classes assigned to the teacher from Timetable
    const timetables = await Timetable.find({
      'periods.teacher': req.user.id
    }).select('class.grade class.section class.stream');

    // Extract unique class combinations
    const assignedClasses = [];
    const seen = new Set();

    timetables.forEach(timetable => {
      const key = `${timetable.class.grade}-${timetable.class.section || ''}-${timetable.class.stream || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        assignedClasses.push({
          grade: timetable.class.grade,
          section: timetable.class.section,
          stream: timetable.class.stream
        });
      }
    });

    // Get students in these classes
    const studentQueries = assignedClasses.map(cls => ({
      'studentProfile.grade': cls.grade,
      $or: [
        { 'studentProfile.section': cls.section || { $exists: false } },
        { 'studentProfile.stream': cls.stream || { $exists: false } }
      ]
    }));

    const students = await User.find({
      role: 'Student',
      $or: studentQueries
    }).select('firstName lastName email username studentProfile.grade studentProfile.section studentProfile.stream');

    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned students',
      error: error.message
    });
  }
};

/**
 * Get students in a class
 */
exports.getClassStudents = async (req, res) => {
  try {
    const { grade, section } = req.params;

    const students = await User.find({
      role: 'Student',
      'studentProfile.grade': grade,
      'studentProfile.section': section
    }).select('firstName lastName email studentProfile');

    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
      error: error.message
    });
  }
};

/**
 * Get teacher's schedule
 */
exports.getMySchedule = async (req, res) => {
  try {
    const { week } = req.query;

    const query = { 'periods.teacher': req.user.id };
    if (week) query.week = week;

    const timetables = await Timetable.find(query)
      .populate('class.grade section')
      .populate('periods.subject', 'name code');

    // Organize by day
    const schedule = {};
    timetables.forEach(timetable => {
      timetable.periods.forEach(period => {
        if (period.teacher && period.teacher.toString() === req.user.id) {
          const day = period.day || 'Monday';
          if (!schedule[day]) schedule[day] = [];
          schedule[day].push({
            period: period.periodNumber,
            subject: period.subject,
            class: timetable.class,
            startTime: period.startTime,
            endTime: period.endTime,
            room: period.room
          });
        }
      });
    });

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedule',
      error: error.message
    });
  }
};

/**
 * Add grade for a student (Draft status)
 */
exports.addGrade = async (req, res) => {
  try {
    const {
      studentId,
      subject,
      academicYear,
      semester,
      grade,
      assessmentType,
      maxGrade,
      comments
    } = req.body;

    const academicRecord = new AcademicRecord({
      studentId,
      subject,
      academicYear: academicYear || '2025-2026',
      semester: semester || '1',
      grade,
      assessmentType: assessmentType || 'Assignment',
      maxGrade: maxGrade || 100,
      comments,
      teacherId: req.user.id,
      status: 'Draft'
    });

    await academicRecord.save();

    res.status(201).json({
      success: true,
      message: 'Grade added successfully',
      data: academicRecord
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add grade',
      error: error.message
    });
  }
};

/**
 * Bulk add grades for a class
 */
exports.bulkAddGrades = async (req, res) => {
  try {
    const {
      grade: classGrade,
      section,
      subject,
      academicYear,
      semester,
      grades // Array of { studentId, grade, assessmentType }
    } = req.body;

    const records = grades.map(g => ({
      studentId: g.studentId,
      subject,
      academicYear: academicYear || '2025-2026',
      semester: semester || '1',
      grade: g.grade,
      assessmentType: g.assessmentType || 'Assignment',
      maxGrade: g.maxGrade || 100,
      teacherId: req.user.id,
      status: 'Draft'
    }));

    const createdRecords = await AcademicRecord.insertMany(records);

    res.status(201).json({
      success: true,
      message: 'Grades added successfully',
      data: createdRecords
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add grades',
      error: error.message
    });
  }
};

/**
 * Get teacher's grades
 */
exports.getMyGrades = async (req, res) => {
  try {
    const { status, classGrade, section } = req.query;

    const query = { teacherId: req.user.id };
    if (status) query.status = status;

    const records = await AcademicRecord.find(query)
      .populate('studentId', 'firstName lastName email')
      .populate('subject', 'name code')
      .sort({ createdAt: -1 });

    // Filter by class if provided
    let filteredRecords = records;
    if (classGrade) {
      filteredRecords = records.filter(r => {
        const student = r.studentId;
        return student && student.studentProfile &&
          student.studentProfile.grade === classGrade &&
          (!section || student.studentProfile.section === section);
      });
    }

    res.json({
      success: true,
      data: filteredRecords
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
 * Mark attendance for a class
 */
exports.markAttendance = async (req, res) => {
  try {
    const {
      grade,
      section,
      date,
      records // Array of { studentId, status, comments }
    } = req.body;

    const attendanceRecords = records.map(r => ({
      studentId: r.studentId,
      teacherId: req.user.id,
      date: date || new Date(),
      status: r.status,
      comments: r.comments,
      class: { grade, section }
    }));

    // Delete existing records for this date/class
    await Attendance.deleteMany({
      teacherId: req.user.id,
      date: {
        $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
        $lte: new Date(new Date(date).setHours(23, 59, 59, 999))
      },
      'class.grade': grade,
      'class.section': section
    });

    const createdRecords = await Attendance.insertMany(attendanceRecords);

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      data: createdRecords
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark attendance',
      error: error.message
    });
  }
};

/**
 * Get teacher's attendance records
 */
exports.getMyAttendance = async (req, res) => {
  try {
    const { date, classGrade, section } = req.query;

    const query = { teacherId: req.user.id };
    if (date) {
      query.date = {
        $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
        $lte: new Date(new Date(date).setHours(23, 59, 59, 999))
      };
    }
    if (classGrade) query['class.grade'] = classGrade;
    if (section) query['class.section'] = section;

    const records = await Attendance.find(query)
      .populate('studentId', 'firstName lastName')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: records
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
 * Generate class progress report
 */
exports.generateClassReport = async (req, res) => {
  try {
    const { grade, section, academicYear, semester } = req.body;

    // Get all students in class
    const students = await User.find({
      role: 'Student',
      'studentProfile.grade': grade,
      'studentProfile.section': section
    });

    // Get marks for all students
    const marksRecords = await AcademicRecord.find({
      studentId: { $in: students.map(s => s._id) },
      academicYear: academicYear || '2025-2026',
      semester: semester || '1',
      status: 'Approved'
    });

    // Calculate class statistics
    const totalMarksArr = marksRecords.map(r => r.totalMarks);
    const avgMarks = totalMarksArr.length > 0
      ? (totalMarksArr.reduce((a, b) => a + b, 0) / totalMarksArr.length).toFixed(2)
      : 0;

    // Generate report
    const report = new Report({
      type: 'class_progress',
      academicYear: academicYear || '2025-2026',
      semester: semester || '1',
      class: { grade, section },
      generatedBy: req.user.id,
      data: {
        students: students.length,
        totalRecords: marksRecords.length,
        averageMarks: avgMarks,
        highestMarks: Math.max(...totalMarksArr) || 0,
        lowestMarks: Math.min(...totalMarksArr) || 0
      }
    });

    await report.save();

    res.status(201).json({
      success: true,
      message: 'Report generated successfully',
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message
    });
  }
};

/**
 * Get announcements for teachers
 */
exports.getMyAnnouncements = async (req, res) => {
  try {
    const now = new Date();

    const announcements = await Announcement.find({
      published: true,
      targetRoles: 'Teacher',
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
 * Get pending approvals (grades waiting for approval)
 */
exports.getPendingApprovals = async (req, res) => {
  try {
    const pendingGrades = await AcademicRecord.find({
      status: 'Pending'
    })
      .populate('studentId', 'firstName lastName email studentProfile')
      .populate('subject', 'name code')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: pendingGrades
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending approvals',
      error: error.message
    });
  }
};
