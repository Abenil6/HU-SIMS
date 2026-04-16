const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const AbsenceAlert = require('../models/AbsenceAlert');
const Message = require('../models/Message');
const crypto = require('crypto');
const { normalizeUserResponse } = require('../utils/userResponse');
const { findUserByFlexibleId } = require('../utils/userLookup');
const { sendAbsenceAlertEmail } = require('../utils/emailService');

const normalizeGradeValue = (value) =>
  String(value || '')
    .replace(/^Grade\s+/i, '')
    .trim();

const normalizeClassScopeValue = (value) => String(value || '').trim();
const normalizeClassScopeCompareValue = (value) => normalizeClassScopeValue(value).toLowerCase();
const gradeRequiresStream = (grade) => {
  const gradeNumber = Number.parseInt(normalizeGradeValue(grade), 10);
  return gradeNumber === 11 || gradeNumber === 12;
};

const getTeacherAssignments = (teacher) =>
  Array.isArray(teacher?.teacherProfile?.classes) ? teacher.teacherProfile.classes : [];

const teacherAssignmentMatchesStudent = (assignment = {}, student = {}) => {
  const studentProfile = student?.studentProfile || {};
  const studentGrade = normalizeGradeValue(studentProfile.grade || student.grade);
  const studentScope = normalizeClassScopeCompareValue(
    studentProfile.stream || studentProfile.section || student.stream,
  );
  const assignmentGrade = normalizeGradeValue(assignment.grade);
  const assignmentScope = normalizeClassScopeCompareValue(assignment.stream || assignment.section);

  if (!studentGrade || !assignmentGrade || studentGrade !== assignmentGrade) {
    return false;
  }

  if (!gradeRequiresStream(assignmentGrade)) {
    return true;
  }

  if (!assignmentScope || !studentScope) {
    return true;
  }

  return studentScope === assignmentScope;
};

const teacherAssignedToClass = (teacher, classGrade, classStream) => {
  const normalizedGrade = normalizeGradeValue(classGrade);
  const normalizedStream = normalizeClassScopeCompareValue(classStream);

  return getTeacherAssignments(teacher).some((assignment) => {
    const assignmentGrade = normalizeGradeValue(assignment.grade);
    const assignmentScope = normalizeClassScopeCompareValue(assignment.stream || assignment.section);

    if (!assignmentGrade || assignmentGrade !== normalizedGrade) {
      return false;
    }

    if (!gradeRequiresStream(normalizedGrade)) {
      return true;
    }

    if (!normalizedStream) {
      return false;
    }

    return assignmentScope === normalizedStream;
  });
};

const getTeacherScopedStudents = async (teacher) => {
  const assignments = getTeacherAssignments(teacher);
  if (!assignments.length) {
    return [];
  }

  const students = await User.find({ role: 'Student' }).select('_id studentProfile grade stream');
  return students.filter((student) =>
    assignments.some((assignment) => teacherAssignmentMatchesStudent(assignment, student)),
  );
};
const isAttendanceAdmin = (role) => ['SchoolAdmin', 'SystemAdmin'].includes(String(role || ''));

const parseAttendanceDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());

  const dateString = String(value).trim();
  const dateOnlyMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(dateString);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getAttendanceDayRange = (value) => {
  const parsedDate = parseAttendanceDate(value);
  if (!parsedDate) return null;

  const dayStart = new Date(parsedDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(parsedDate);
  dayEnd.setHours(23, 59, 59, 999);

  return {
    attendanceDate: parsedDate,
    dayStart,
    dayEnd,
  };
};

/**
 * Mark attendance for a single student
 */
exports.markAttendance = async (req, res) => {
  try {
    const { student, date, status, period, subject, remarks, checkInTime } = req.body;

    // Verify student exists
    const studentUser = await User.findOne({ _id: student, role: 'Student' });
    if (!studentUser) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (req.user.role === 'Teacher') {
      const teacher = await findUserByFlexibleId(req.user.id);
      const authorized = getTeacherAssignments(teacher).some((assignment) =>
        teacherAssignmentMatchesStudent(assignment, studentUser),
      );

      if (!authorized) {
        return res.status(403).json({
          success: false,
          message: 'You can only mark attendance for students in your assigned classes'
        });
      }
    }

    const dateRange = getAttendanceDayRange(date);
    if (!dateRange) {
      return res.status(400).json({
        success: false,
        message: 'A valid date is required'
      });
    }
    const { attendanceDate, dayStart, dayEnd } = dateRange;

    // Check if attendance already exists
    const existing = await Attendance.findOne({
      student,
      date: { $gte: dayStart, $lte: dayEnd }
    });

    if (existing) {
      existing.status = status;
      existing.remarks = remarks;
      existing.checkInTime = checkInTime || existing.checkInTime;
      await existing.save();

      return res.json({
        success: true,
        message: 'Attendance updated',
        data: existing
      });
    }

    const attendance = new Attendance({
      student,
      teacher: req.user.id,
      date: attendanceDate,
      status,
      period,
      subject,
      remarks,
      checkInTime,
      synced: true
    });

    await attendance.save();

    // Auto-create absence alert if status is Absent or Late
    if (status === 'Absent' || status === 'Late') {
      try {
        const teacher = await findUserByFlexibleId(req.user.id);
        const alert = await AbsenceAlert.createFromAttendance(attendance, teacher);
        
        // Send email and in-app notifications to parents
        if (alert && alert.parents && alert.parents.length > 0) {
          const student = await User.findById(attendance.student);
          const studentName = `${student.firstName} ${student.lastName}`;
          const dateStr = new Date(attendance.date).toLocaleDateString();
          
          for (const parentAlert of alert.parents) {
            const parent = await User.findById(parentAlert.parent);
            if (parent) {
              // Send email notification
              if (parent.email) {
                await sendAbsenceAlertEmail(parent, student, attendance, alert);
              }
              
              // Send in-app notification
              await Message.create({
                sender: teacher._id,
                recipients: [parent._id],
                messageType: 'System',
                category: 'Attendance',
                subject: `Absence Alert - ${studentName}`,
                content: `Your child ${studentName} was marked as ${status} on ${dateStr}. Period: ${attendance.period || 'Full Day'}, Subject: ${attendance.subject || 'N/A'}.`,
                priority: 'High',
                isActive: true
              });
            }
          }
        }
      } catch (alertError) {
        // Log error but don't fail the attendance marking
        console.error('Failed to create absence alert:', alertError.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Attendance marked',
      data: attendance
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
 * Bulk mark attendance (for entire class)
 */
exports.bulkMarkAttendance = async (req, res) => {
  try {
    const { date, period, subject, classGrade, classStream, records } = req.body;
    const dateRange = getAttendanceDayRange(date);
    if (!dateRange) {
      return res.status(400).json({
        success: false,
        message: 'A valid date is required for bulk attendance'
      });
    }
    const { attendanceDate, dayStart, dayEnd } = dateRange;

    const normalizedGrade = String(classGrade || '').replace(/^Grade\s+/i, '').trim();
    const normalizedStream = String(classStream || '').trim();

    if (!normalizedGrade) {
      return res.status(400).json({
        success: false,
        message: 'classGrade is required for bulk attendance'
      });
    }

    if (req.user.role === 'Teacher') {
      const teacher = await findUserByFlexibleId(req.user.id);
      if (!teacherAssignedToClass(teacher, normalizedGrade, normalizedStream)) {
        return res.status(403).json({
          success: false,
          message: 'You can only take attendance for your assigned classes'
        });
      }
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'records are required for bulk attendance'
      });
    }

    const classQuery = {
      role: 'Student',
      'studentProfile.grade': normalizedGrade,
    };

    const gradeNumber = Number.parseInt(normalizedGrade, 10);
    if (Number.isFinite(gradeNumber) && gradeNumber >= 11) {
      if (!normalizedStream) {
        return res.status(400).json({
          success: false,
          message: 'classStream is required for Grade 11 and Grade 12 attendance'
        });
      }
      classQuery['studentProfile.stream'] = normalizedStream;
    }

    const classStudents = await User.find(classQuery).select('_id');
    const classStudentIds = classStudents.map((student) => student._id);

    if (classStudentIds.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No students found for Grade ${normalizedGrade}${normalizedStream ? ` ${normalizedStream}` : ''}`
      });
    }

    const classStudentIdSet = new Set(classStudentIds.map((studentId) => String(studentId)));
    const invalidStudentRecord = records.find((record) => !classStudentIdSet.has(String(record.student)));

    if (invalidStudentRecord) {
      return res.status(400).json({
        success: false,
        message: 'One or more selected students do not belong to the chosen class'
      });
    }

    const existingClassAttendance = await Attendance.findOne({
      student: { $in: classStudentIds },
      date: { $gte: dayStart, $lte: dayEnd },
    }).select('_id');

    if (existingClassAttendance) {
      return res.status(409).json({
        success: false,
        message: `Attendance already submitted for Grade ${normalizedGrade}${normalizedStream ? ` ${normalizedStream}` : ''} on ${dayStart.toISOString().split('T')[0]}`
      });
    }

    const attendanceData = records.map(record => ({
      student: record.student,
      teacher: req.user.id,
      date: attendanceDate,
      status: record.status,
      period,
      subject,
      remarks: record.remarks,
      synced: true
    }));

    const results = await Attendance.markAttendance(attendanceData);

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark bulk attendance',
      error: error.message
    });
  }
};

/**
 * Sync offline attendance records
 */
exports.syncOfflineAttendance = async (req, res) => {
  try {
    const { offlineRecords } = req.body;

    // Add offlineId if not present
    const recordsWithId = offlineRecords.map(record => ({
      ...record,
      offlineId: record.offlineId || crypto.randomUUID(),
      synced: true
    }));

    const results = await Attendance.syncOfflineRecords(recordsWithId);

    res.json({
      success: true,
      message: 'Offline records synced',
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to sync offline records',
      error: error.message
    });
  }
};

/**
 * Get attendance records
 */
exports.getAttendanceRecords = async (req, res) => {
  try {
    const { student, date, period, startDate, endDate, academicYear, page = 1, limit = 50 } = req.query;

    const query = {};

    // Students can only see their own attendance
    // Parents can only see their children's attendance
    // Teachers can see attendance for students in their assigned classes
    if (req.user.role === 'Student') {
      query.student = req.user.id;
    } else if (req.user.role === 'Parent') {
      const parent = await findUserByFlexibleId(req.user.id);
      const childIds = parent.parentProfile?.linkedChildren?.map(c => c.toString()) || [];
      query.student = { $in: childIds };
    } else if (req.user.role === 'Teacher') {
      const teacher = await findUserByFlexibleId(req.user.id);
      const scopedStudents = await getTeacherScopedStudents(teacher);
      query.student = { $in: scopedStudents.map((studentDoc) => String(studentDoc._id)) };
    }

    if (student) {
      if (req.user.role === 'Student' && String(student) !== String(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own attendance records'
        });
      }

      if (req.user.role === 'Parent') {
        const parent = await findUserByFlexibleId(req.user.id);
        const childIds = parent.parentProfile?.linkedChildren?.map(c => c.toString()) || [];
        if (!childIds.includes(String(student))) {
          return res.status(403).json({
            success: false,
            message: 'You can only view attendance for your linked students'
          });
        }
        query.student = String(student);
      } else if (req.user.role === 'Teacher') {
        const scopedStudents = Array.isArray(query.student?.$in) ? query.student.$in.map(String) : [];
        if (!scopedStudents.includes(String(student))) {
          return res.status(403).json({
            success: false,
            message: 'You can only view attendance for students in your assigned classes'
          });
        }
        query.student = String(student);
      } else {
        query.student = String(student);
      }
    }
    if (date) {
      const dateRange = getAttendanceDayRange(date);
      if (!dateRange) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date filter'
        });
      }
      const { dayStart, dayEnd } = dateRange;
      query.date = { $gte: dayStart, $lte: dayEnd };
    }
    if (startDate || endDate) {
      query.date = query.date || {};
      if (startDate) {
        const start = parseAttendanceDate(startDate);
        if (!start) {
          return res.status(400).json({
            success: false,
            message: 'Invalid startDate filter'
          });
        }
        start.setHours(0, 0, 0, 0);
        query.date.$gte = start;
      }
      if (endDate) {
        const end = parseAttendanceDate(endDate);
        if (!end) {
          return res.status(400).json({
            success: false,
            message: 'Invalid endDate filter'
          });
        }
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }
    if (period) query.period = parseInt(period);
    if (academicYear && !date) {
      const startDate = new Date(academicYear, 0, 1);
      const endDate = new Date(academicYear, 11, 31, 23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);

    const rawRecords = await Attendance.find(query)
      .populate('student', 'firstName lastName email studentProfile')
      .populate('teacher', 'firstName lastName')
      .sort({ date: -1, createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .lean();

    const records = rawRecords.map((record) => ({
      ...record,
      student: normalizeUserResponse(record.student || null),
      teacher: normalizeUserResponse(record.teacher || null),
    }));

    const total = await Attendance.countDocuments(query);

    res.json({
      success: true,
      data: records,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit)
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
 * Get student attendance summary
 */
exports.getStudentAttendanceSummary = async (req, res) => {
  try {
    const { studentId, academicYear } = req.query;

    // Determine student ID
    let targetStudentId = studentId;
    if (!targetStudentId) {
      if (req.user.role === 'Student') {
        targetStudentId = req.user.id;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Student ID is required'
        });
      }
    }

    // Check access
    if (req.user.role === 'Student' && targetStudentId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const startDate = new Date(academicYear, 0, 1);
    const endDate = new Date(academicYear, 11, 31, 23, 59, 59);

    const summary = await Attendance.aggregate([
      {
        $match: {
          student: String(targetStudentId),
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalPresent: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          totalAbsent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
          totalLate: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          totalExcused: { $sum: { $cond: [{ $eq: ['$status', 'Excused'] }, 1, 0] } },
          totalDays: { $sum: 1 }
        }
      }
    ]);

    const data = summary[0] || {
      totalPresent: 0,
      totalAbsent: 0,
      totalLate: 0,
      totalExcused: 0,
      totalDays: 0
    };

    data.attendancePercentage = data.totalDays > 0
      ? ((data.totalPresent / data.totalDays) * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get student summary',
      error: error.message
    });
  }
};

/**
 * Get school-wide attendance summary (Admin)
 */
exports.getSchoolAttendanceSummary = async (req, res) => {
  try {
    // Use last 30 days as default window for a meaningful rate
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);

    const summary = await Attendance.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: null,
          totalPresent: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          totalLate:    { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          totalAbsent:  { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
          totalExcused: { $sum: { $cond: [{ $eq: ['$status', 'Excused'] }, 1, 0] } },
          total: { $sum: 1 }
        }
      }
    ]);

    const data = summary[0] || {
      totalPresent: 0, totalLate: 0, totalAbsent: 0, totalExcused: 0, total: 0
    };

    // Present + Late both count as attended
    const attended = data.totalPresent + data.totalLate;
    data.attendanceRate = data.total > 0
      ? Math.round((attended / data.total) * 100)
      : 0;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get school attendance summary',
      error: error.message
    });
  }
};

/**
 * Get School Admin attendance dashboard data (real aggregated data)
 */
exports.getSchoolAdminAttendanceDashboard = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      grade = 'all',
      status = 'all',
      search = '',
      page = 1,
      limit = 100,
    } = req.query;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
    const skip = (parsedPage - 1) * parsedLimit;

    const queryStartDate = startDate ? new Date(startDate) : new Date();
    const queryEndDate = endDate ? new Date(endDate) : new Date();
    if (!startDate) queryStartDate.setDate(queryStartDate.getDate() - 29);
    queryStartDate.setHours(0, 0, 0, 0);
    queryEndDate.setHours(23, 59, 59, 999);

    const attendanceMatch = {
      date: { $gte: queryStartDate, $lte: queryEndDate },
    };
    if (status && status !== 'all') {
      attendanceMatch.status = status;
    }

    const normalizedGrade = String(grade || '').replace(/^Grade\s+/i, '').trim();
    const studentFilters = [];
    if (normalizedGrade && normalizedGrade !== 'all') {
      studentFilters.push({
        $or: [
          { 'studentInfo.studentProfile.grade': normalizedGrade },
          { 'studentInfo.studentProfile.grade': `Grade ${normalizedGrade}` },
        ],
      });
    }

    const trimmedSearch = String(search || '').trim();
    if (trimmedSearch) {
      const safeSearch = trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(safeSearch, 'i');
      studentFilters.push({
        $or: [
          { 'studentInfo.firstName': { $regex: searchRegex } },
          { 'studentInfo.lastName': { $regex: searchRegex } },
          { 'studentInfo.studentProfile.studentId': { $regex: searchRegex } },
        ],
      });
    }

    const studentMatchStage = studentFilters.length ? [{ $match: { $and: studentFilters } }] : [];

    const basePipeline = [
      { $match: attendanceMatch },
      {
        $lookup: {
          from: 'users',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo',
        },
      },
      { $unwind: '$studentInfo' },
      ...studentMatchStage,
    ];

    const [tableRows, countRows, statusRows, gradeRows, dailyRows] = await Promise.all([
      Attendance.aggregate([
        ...basePipeline,
        {
          $lookup: {
            from: 'users',
            localField: 'teacher',
            foreignField: '_id',
            as: 'teacherInfo',
          },
        },
        { $unwind: { path: '$teacherInfo', preserveNullAndEmptyArrays: true } },
        { $sort: { date: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: parsedLimit },
        {
          $project: {
            _id: 1,
            date: 1,
            status: 1,
            studentName: {
              $trim: {
                input: { $concat: ['$studentInfo.firstName', ' ', '$studentInfo.lastName'] },
              },
            },
            studentId: '$studentInfo.studentProfile.studentId',
            grade: '$studentInfo.studentProfile.grade',
            stream: '$studentInfo.studentProfile.stream',
            teacherName: {
              $trim: {
                input: { $concat: ['$teacherInfo.firstName', ' ', '$teacherInfo.lastName'] },
              },
            },
          },
        },
      ]),
      Attendance.aggregate([...basePipeline, { $count: 'total' }]),
      Attendance.aggregate([
        ...basePipeline,
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      Attendance.aggregate([
        ...basePipeline,
        {
          $group: {
            _id: '$studentInfo.studentProfile.grade',
            total: { $sum: 1 },
            present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
            late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          },
        },
      ]),
      Attendance.aggregate([
        ...basePipeline,
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' },
              day: { $dayOfMonth: '$date' },
            },
            total: { $sum: 1 },
            present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
            late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),
    ]);

    const total = countRows[0]?.total || 0;
    const rows = tableRows.map((row) => ({
      id: row._id,
      date: row.date,
      status: row.status,
      fullName: row.studentName || 'Unknown Student',
      studentId: row.studentId || '-',
      grade: String(row.grade || '').replace(/^Grade\s+/i, '').trim(),
      stream: row.stream || '',
      teacherName: row.teacherName || '-',
    }));

    const statusDistribution = {
      Present: 0,
      Late: 0,
      Absent: 0,
      Excused: 0,
    };
    statusRows.forEach((entry) => {
      if (statusDistribution[entry._id] !== undefined) {
        statusDistribution[entry._id] = entry.count;
      }
    });

    const grades = ['9', '10', '11', '12'];
    const gradeRateLookup = new Map();
    gradeRows.forEach((entry) => {
      const normalized = String(entry._id || '').replace(/^Grade\s+/i, '').trim();
      if (!normalized) return;
      const current = gradeRateLookup.get(normalized) || { total: 0, attended: 0 };
      current.total += entry.total || 0;
      current.attended += (entry.present || 0) + (entry.late || 0);
      gradeRateLookup.set(normalized, current);
    });
    const gradeRates = grades.map((g) => {
      const values = gradeRateLookup.get(g) || { total: 0, attended: 0 };
      return {
        grade: g,
        total: values.total,
        rate: values.total > 0 ? Math.round((values.attended / values.total) * 100) : 0,
      };
    });

    const dailyTrend = dailyRows.slice(-7).map((entry) => {
      const date = new Date(entry._id.year, entry._id.month - 1, entry._id.day);
      const totalForDay = entry.total || 0;
      const attended = (entry.present || 0) + (entry.late || 0);
      return {
        date: date.toISOString().split('T')[0],
        rate: totalForDay > 0 ? Math.round((attended / totalForDay) * 100) : 0,
      };
    });

    const present = statusDistribution.Present;
    const late = statusDistribution.Late;
    const absent = statusDistribution.Absent;
    const excused = statusDistribution.Excused;
    const totalRecords = present + late + absent + excused;
    const attendanceRate = totalRecords > 0
      ? Math.round(((present + late) / totalRecords) * 100)
      : 0;
    const uniqueStudents = new Set(rows.map((r) => r.studentId)).size;

    res.json({
      success: true,
      data: {
        filters: {
          startDate: queryStartDate.toISOString().split('T')[0],
          endDate: queryEndDate.toISOString().split('T')[0],
          grade: normalizedGrade || 'all',
          status,
          search: trimmedSearch,
        },
        summary: {
          totalRecords,
          present,
          late,
          absent,
          excused,
          attendanceRate,
          uniqueStudents,
        },
        statusDistribution,
        gradeRates,
        dailyTrend,
        table: {
          rows,
          pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            pages: Math.ceil(total / parsedLimit),
          },
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get school admin attendance dashboard data',
      error: error.message,
    });
  }
};

/**
 * Get attendance analytics for all classes (Admin)
 */
exports.getClassesAttendanceAnalytics = async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 120);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const classStats = await Attendance.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      {
        $lookup: {
          from: 'users',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      { $unwind: '$studentInfo' },
      {
        $project: {
          status: 1,
          grade: '$studentInfo.studentProfile.grade',
          stream: '$studentInfo.studentProfile.stream'
        }
      },
      {
        $group: {
          _id: {
            grade: '$grade',
            stream: '$stream'
          },
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
          excused: { $sum: { $cond: [{ $eq: ['$status', 'Excused'] }, 1, 0] } },
        }
      }
    ]);

    const classes = classStats
      .map((entry) => {
        const grade = String(entry?._id?.grade || '').replace(/^Grade\s+/i, '').trim();
        const stream = String(entry?._id?.stream || '').trim();
        if (!grade) return null;

        const attendanceRate = entry.total > 0
          ? Math.round(((entry.present + entry.late) / entry.total) * 100)
          : 0;

        return {
          classLabel: stream ? `Grade ${grade} - ${stream}` : `Grade ${grade}`,
          grade,
          stream: stream || '',
          total: entry.total || 0,
          present: entry.present || 0,
          late: entry.late || 0,
          absent: entry.absent || 0,
          excused: entry.excused || 0,
          attendanceRate,
          absentRate: entry.total > 0 ? Math.round(((entry.absent || 0) / entry.total) * 100) : 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const gradeDiff = Number(a.grade) - Number(b.grade);
        if (gradeDiff !== 0) return gradeDiff;
        return a.stream.localeCompare(b.stream);
      });

    const dailyStats = await Attendance.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            day: { $dayOfMonth: '$date' }
          },
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
          excused: { $sum: { $cond: [{ $eq: ['$status', 'Excused'] }, 1, 0] } },
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    const dailyTrend = dailyStats.map((entry) => {
      const date = new Date(entry._id.year, entry._id.month - 1, entry._id.day);
      const total = entry.total || 0;
      const attendanceRate = total > 0
        ? Math.round((((entry.present || 0) + (entry.late || 0)) / total) * 100)
        : 0;

      return {
        date: date.toISOString().split('T')[0],
        total,
        present: entry.present || 0,
        late: entry.late || 0,
        absent: entry.absent || 0,
        excused: entry.excused || 0,
        attendanceRate,
      };
    });

    const totals = classes.reduce(
      (acc, item) => {
        acc.total += item.total;
        acc.present += item.present;
        acc.late += item.late;
        acc.absent += item.absent;
        acc.excused += item.excused;
        return acc;
      },
      { total: 0, present: 0, late: 0, absent: 0, excused: 0 }
    );

    const overallRate = totals.total > 0
      ? Math.round(((totals.present + totals.late) / totals.total) * 100)
      : 0;

    const lowClasses = [...classes]
      .sort((a, b) => a.attendanceRate - b.attendanceRate)
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        window: {
          days,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        },
        overview: {
          attendanceRate: overallRate,
          totalRecords: totals.total,
          totalClasses: classes.length,
          lowAttendanceClasses: lowClasses.length,
        },
        classes,
        dailyTrend,
        lowClasses,
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get classes attendance analytics',
      error: error.message
    });
  }
};

/**
 * Get class attendance summary
 */
exports.getClassAttendanceSummary = async (req, res) => {
  try {
    const { className, academicYear, month } = req.query;

    if (!className || !academicYear || !month) {
      return res.status(400).json({
        success: false,
        message: 'Class, academic year, and month are required'
      });
    }

    const summary = await Attendance.getClassSummary(className, academicYear, parseInt(month));

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get class summary',
      error: error.message
    });
  }
};

/**
 * Get daily attendance report
 */
exports.getDailyReport = async (req, res) => {
  try {
    const { date, className } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const report = await Attendance.getDailyReport(date, className);

    // Format response
    const formatted = {
      date,
      className,
      summary: {},
      total: 0
    };

    report.forEach(item => {
      formatted.summary[item._id] = item.count;
      formatted.total += item.count;
    });

    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get daily report',
      error: error.message
    });
  }
};

/**
 * Get unsynced offline records (for clients to sync)
 */
exports.getUnsyncedRecords = async (req, res) => {
  try {
    const unsynced = await Attendance.find({ synced: false })
      .populate('student', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      data: unsynced
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get unsynced records',
      error: error.message
    });
  }
};

/**
 * Update attendance record
 */
exports.updateAttendance = async (req, res) => {
  try {
    const { status, remarks, checkInTime } = req.body;

    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    // Only the teacher who marked it or admin can update
    if (!isAttendanceAdmin(req.user.role) && attendance.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this record'
      });
    }

    if (status) attendance.status = status;
    if (remarks !== undefined) attendance.remarks = remarks;
    if (checkInTime) attendance.checkInTime = checkInTime;

    await attendance.save();

    res.json({
      success: true,
      message: 'Attendance updated',
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update attendance',
      error: error.message
    });
  }
};

/**
 * Delete attendance record
 */
exports.deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    if (!isAttendanceAdmin(req.user.role) && attendance.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this record'
      });
    }

    await Attendance.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Attendance deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete attendance',
      error: error.message
    });
  }
};
