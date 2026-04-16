const ExamSchedule = require('../models/ExamSchedule');
const User = require('../models/User');

const ALLOWED_EXAM_TYPES = ['Midterm', 'Final', 'Mock'];
const DEFAULT_ROOMS = [
  'G9 Classroom 1',
  'G9 Classroom 2',
  'G9 Classroom 3',
  'G10 Classroom 1',
  'G10 Classroom 2',
  'G10 Classroom 3',
  'G11 Classroom 1',
  'G11 Classroom 2',
  'G11 Classroom 3',
  'G12 Classroom 1',
  'G12 Classroom 2',
  'G12 Classroom 3'
];
const DEFAULT_TIME_SLOTS = [
  { start: '08:00', end: '10:00', duration: 120 },
  { start: '10:30', end: '12:30', duration: 120 },
  { start: '14:00', end: '16:00', duration: 120 }
];
const normalizeSubjectName = (subject = '') => {
  const normalized = String(subject).trim().toLowerCase();

  if (
    normalized === 'ict' ||
    normalized.includes('information communication technology') ||
    normalized.includes('information technology')
  ) {
    return 'information communication technology (ict)';
  }

  return normalized;
};
const requiresStream = (grade) => Number(grade) >= 11;
const normalizeSectionValue = (grade, section) => {
  const trimmed = String(section || '').trim();
  if (!requiresStream(grade)) {
    return undefined;
  }
  return trimmed || undefined;
};

const timeToMinutes = (time = '') => {
  const [hours = '0', minutes = '0'] = String(time).split(':');
  return Number(hours) * 60 + Number(minutes);
};

const timesOverlap = (startA, endA, startB, endB) =>
  timeToMinutes(startA) < timeToMinutes(endB) &&
  timeToMinutes(startB) < timeToMinutes(endA);

const getDayRange = (dateValue) => {
  const dayStart = new Date(dateValue);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return { dayStart, dayEnd };
};

const getDateKey = (dateValue) => {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().split('T')[0];
};

const buildDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  if (start > end) {
    return null;
  }

  const dates = [];
  const currentDate = new Date(start);
  currentDate.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  while (currentDate <= end) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

const teacherMatchesGradeSection = (teacher, grade, section) => {
  const classes = teacher.teacherProfile?.classes || [];
  const normalizedSection = normalizeSectionValue(grade, section);
  return classes.some((assignedClass) => {
    const assignedGrade = String(assignedClass.grade || '').trim();
    const assignedSection = String(
      assignedClass.section || assignedClass.stream || ''
    ).trim();

    if (assignedGrade !== String(grade)) {
      return false;
    }

    if (!normalizedSection) {
      return true;
    }

    return assignedSection === normalizedSection;
  });
};

const getTeacherSubjects = (teacher) => {
  const nestedSubjects = teacher.teacherProfile?.subjects || [];
  if (nestedSubjects.length > 0) {
    return nestedSubjects;
  }

  return Array.isArray(teacher.subjects) ? teacher.subjects : [];
};

const getTeacherDisplayName = (teacher) =>
  [teacher.firstName, teacher.lastName].filter(Boolean).join(' ').trim();

const isExamScheduleAdmin = (user) =>
  ['SchoolAdmin', 'SystemAdmin'].includes(String(user?.role || ''));

const getScheduleSeedData = async ({ grade, section }) => {
  const allTeachers = await User.find({
    role: 'Teacher',
    status: 'Active'
  }).select('_id firstName lastName teacherProfile subjects');

  const eligibleTeachers = allTeachers.filter((teacher) =>
    teacherMatchesGradeSection(teacher, grade, section)
  );

  const subjectTeacherPairs = eligibleTeachers.flatMap((teacher) =>
    getTeacherSubjects(teacher)
      .map((subject) => String(subject || '').trim())
      .filter(Boolean)
      .map((subject) => ({
        subject,
        teacher,
        invigilator: getTeacherDisplayName(teacher)
      }))
  );

  const uniquePairs = [];
  const seen = new Set();

  subjectTeacherPairs.forEach((pair) => {
    const key = `${normalizeSubjectName(pair.subject)}::${pair.invigilator.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniquePairs.push(pair);
    }
  });

  return {
    teachers: allTeachers,
    assignedTeachers: eligibleTeachers,
    subjectTeacherPairs: uniquePairs
  };
};

const validateSubjectForClass = async ({ grade, section, subject }) => {
  if (!grade || !subject) {
    return null;
  }

  const normalizedSection = normalizeSectionValue(grade, section);
  const { subjectTeacherPairs } = await getScheduleSeedData({ grade, section: normalizedSection });

  if (subjectTeacherPairs.length === 0) {
    return null;
  }

  const allowedSubjects = new Set(
    subjectTeacherPairs.map((pair) => normalizeSubjectName(pair.subject))
  );

  if (!allowedSubjects.has(normalizeSubjectName(subject))) {
    return `Subject "${subject}" is not assigned to Grade ${grade}${normalizedSection ? ` ${normalizedSection}` : ''}`;
  }

  return null;
};

const validateScheduleConstraints = async ({
  examId,
  grade,
  section,
  date,
  startTime,
  endTime,
  room,
  invigilator
}) => {
  if (!date || !startTime || !endTime) {
    return null;
  }

  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    return 'End time must be after start time';
  }

  const normalizedSection = normalizeSectionValue(grade, section);
  const { dayStart, dayEnd } = getDayRange(date);
  const exclusion = examId ? { _id: { $ne: examId } } : {};
  const classScopeQuery = normalizedSection
    ? { grade, section: normalizedSection }
    : {
        grade,
        $or: [{ section: { $exists: false } }, { section: null }, { section: '' }]
      };

  const dailyExamCount = await ExamSchedule.countDocuments({
    ...exclusion,
    ...classScopeQuery,
    date: { $gte: dayStart, $lt: dayEnd }
  });

  if (dailyExamCount >= 2) {
    return 'A grade/stream can only have 2 exams per day';
  }

  const sameClassSchedules = await ExamSchedule.find({
    ...exclusion,
    ...classScopeQuery,
    date: { $gte: dayStart, $lt: dayEnd }
  }).select('startTime endTime subject examName');

  const overlappingClassExam = sameClassSchedules.find((schedule) =>
    timesOverlap(startTime, endTime, schedule.startTime, schedule.endTime)
  );

  if (overlappingClassExam) {
    return `Grade ${grade}${normalizedSection ? ` ${normalizedSection}` : ''} already has an exam scheduled at that time`;
  }

  if (!room && !invigilator) {
    return null;
  }

  const conflictQuery = {
    ...exclusion,
    date: { $gte: dayStart, $lt: dayEnd },
    $or: []
  };

  if (room) {
    conflictQuery.$or.push({ room });
  }

  if (invigilator) {
    conflictQuery.$or.push({ invigilator });
  }

  const candidates = await ExamSchedule.find(conflictQuery).select(
    'room invigilator startTime endTime subject examName'
  );

  const conflictingSchedule = candidates.find((schedule) => {
    if (!timesOverlap(startTime, endTime, schedule.startTime, schedule.endTime)) {
      return false;
    }

    if (room && schedule.room === room) {
      return true;
    }

    if (invigilator && schedule.invigilator === invigilator) {
      return true;
    }

    return false;
  });

  if (!conflictingSchedule) {
    return null;
  }

  if (room && conflictingSchedule.room === room) {
    return `Room "${room}" is already assigned at that time`;
  }

  if (invigilator && conflictingSchedule.invigilator === invigilator) {
    return `Invigilator "${invigilator}" is already assigned at that time`;
  }

  return 'Exam schedule conflicts with an existing record';
};

/**
 * Create a new exam schedule
 */
exports.createExamSchedule = async (req, res) => {
  try {
    if (!isExamScheduleAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Only school administrators can create exam schedules'
      });
    }

    const {
      examName,
      examType,
      subject,
      grade,
      section,
      academicYear,
      semester,
      date,
      startTime,
      endTime,
      duration,
      room,
      invigilator,
      instructions,
      notes,
      maxMarks
    } = req.body;

    const normalizedSection = normalizeSectionValue(grade, section);
    const normalizedExamType = examType || 'Midterm';
    const normalizedExamName = examName || `${normalizedExamType} - ${subject}`;

    if (!room || !invigilator) {
      return res.status(400).json({
        success: false,
        message: 'Room and invigilator are required'
      });
    }

    if (!ALLOWED_EXAM_TYPES.includes(normalizedExamType)) {
      return res.status(400).json({
        success: false,
        message: 'Exam type must be Midterm, Final, or Mock'
      });
    }

    const subjectValidationError = await validateSubjectForClass({
      grade,
      section: normalizedSection,
      subject
    });

    if (subjectValidationError) {
      return res.status(400).json({
        success: false,
        message: subjectValidationError
      });
    }

    const constraintError = await validateScheduleConstraints({
      grade,
      section: normalizedSection,
      date,
      startTime,
      endTime,
      room,
      invigilator
    });

    if (constraintError) {
      return res.status(400).json({
        success: false,
        message: constraintError
      });
    }

    const examSchedule = new ExamSchedule({
      examName: normalizedExamName,
      examType: normalizedExamType,
      subject,
      grade,
      section: normalizedSection,
      academicYear,
      semester,
      date,
      startTime,
      endTime,
      duration,
      room,
      invigilator,
      instructions,
      notes,
      maxMarks,
      createdBy: req.user.id
    });

    await examSchedule.save();

    res.status(201).json({
      success: true,
      message: 'Exam schedule created successfully',
      data: examSchedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create exam schedule',
      error: error.message
    });
  }
};

/**
 * Get all exam schedules
 */
exports.getExamSchedules = async (req, res) => {
  try {
    const {
      academicYear,
      semester,
      grade,
      section,
      subject,
      examType,
      status,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};

    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = semester;
    if (grade) query.grade = parseInt(grade);
    if (section && requiresStream(grade)) query.section = normalizeSectionValue(grade, section);
    if (subject) query.subject = subject;
    if (examType) query.examType = examType;
    if (status) query.status = status;

    if (req.user.role === 'Teacher') {
      const adminCreators = await User.find({ role: 'SchoolAdmin' }).select('_id');
      query.createdBy = { $in: adminCreators.map((admin) => admin._id) };
    }

    const schedules = await ExamSchedule.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ date: 1, startTime: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ExamSchedule.countDocuments(query);

    res.json({
      success: true,
      data: schedules,
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
      message: 'Failed to fetch exam schedules',
      error: error.message
    });
  }
};

/**
 * Get exam schedule by ID
 */
exports.getExamScheduleById = async (req, res) => {
  try {
    const schedule = await ExamSchedule.findById(req.params.id)
      .populate('createdBy', 'firstName lastName');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Exam schedule not found'
      });
    }

    if (req.user.role === 'Teacher') {
      const creator = await User.findById(schedule.createdBy?._id || schedule.createdBy).select('role');
      if (!creator || creator.role !== 'SchoolAdmin') {
        return res.status(403).json({
          success: false,
          message: 'Teachers can only view exam schedules created by school administrators'
        });
      }
    }

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exam schedule',
      error: error.message
    });
  }
};

/**
 * Update exam schedule
 */
exports.updateExamSchedule = async (req, res) => {
  try {
    if (!isExamScheduleAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Only school administrators can update exam schedules'
      });
    }

    const schedule = await ExamSchedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Exam schedule not found'
      });
    }

    const allowedUpdates = [
      'examName', 'examType', 'subject', 'grade', 'section',
      'academicYear', 'semester', 'date', 'startTime', 'endTime',
      'duration', 'room', 'invigilator', 'instructions', 'notes', 'maxMarks', 'status'
    ];

    if (
      req.body.examType !== undefined &&
      !ALLOWED_EXAM_TYPES.includes(req.body.examType)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Exam type must be Midterm, Final, or Mock'
      });
    }

    const nextSubject = req.body.subject ?? schedule.subject;
    const nextExamType = req.body.examType ?? schedule.examType;

    const nextGrade = req.body.grade ?? schedule.grade;
    const nextSchedule = {
      grade: nextGrade,
      section: normalizeSectionValue(nextGrade, req.body.section ?? schedule.section),
      date: req.body.date ?? schedule.date,
      startTime: req.body.startTime ?? schedule.startTime,
      endTime: req.body.endTime ?? schedule.endTime,
      room: req.body.room ?? schedule.room,
      invigilator: req.body.invigilator ?? schedule.invigilator
    };

    if (!nextSchedule.room || !nextSchedule.invigilator) {
      return res.status(400).json({
        success: false,
        message: 'Room and invigilator are required'
      });
    }

    const subjectValidationError = await validateSubjectForClass({
      grade: nextSchedule.grade,
      section: nextSchedule.section,
      subject: nextSubject
    });

    if (subjectValidationError) {
      return res.status(400).json({
        success: false,
        message: subjectValidationError
      });
    }

    const constraintError = await validateScheduleConstraints({
      examId: schedule._id,
      ...nextSchedule
    });

    if (constraintError) {
      return res.status(400).json({
        success: false,
        message: constraintError
      });
    }

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        schedule[field] = req.body[field];
      }
    });

    if (req.body.subject !== undefined || req.body.examType !== undefined || req.body.examName === undefined) {
      schedule.examName = req.body.examName ?? `${nextExamType} - ${nextSubject}`;
    }

    await schedule.save();

    res.json({
      success: true,
      message: 'Exam schedule updated successfully',
      data: schedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update exam schedule',
      error: error.message
    });
  }
};

/**
 * Delete exam schedule
 */
exports.deleteExamSchedule = async (req, res) => {
  try {
    if (!isExamScheduleAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Only school administrators can delete exam schedules'
      });
    }

    const schedule = await ExamSchedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Exam schedule not found'
      });
    }

    if (schedule.status === 'In Progress' || schedule.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete exam schedules that are in progress or completed'
      });
    }

    await ExamSchedule.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Exam schedule deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete exam schedule',
      error: error.message
    });
  }
};

/**
 * Get upcoming exams for a student
 */
exports.getStudentUpcomingExams = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear, semester } = req.query;

    // Get student's grade and section from User model
    const User = require('../models/User');
    const student = await User.findById(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const query = {
      grade: student.grade,
      section: student.section,
      status: 'Scheduled',
      date: { $gte: new Date() }
    };

    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = semester;

    const schedules = await ExamSchedule.find(query)
      .sort({ date: 1, startTime: 1 })
      .limit(10);

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming exams',
      error: error.message
    });
  }
};

/**
 * Get exam schedule by date range
 */
exports.getExamsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate, academicYear, semester } = req.query;

    const query = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = semester;

    const schedules = await ExamSchedule.find(query)
      .sort({ date: 1, startTime: 1 });

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exams by date range',
      error: error.message
    });
  }
};

/**
 * Auto-generate exam schedule
 */
exports.autoGenerateSchedule = async (req, res) => {
  try {
    if (!isExamScheduleAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Only school administrators can generate exam schedules'
      });
    }

    const {
      grade,
      section,
      academicYear,
      semester,
      examType,
      startDate,
      endDate
    } = req.body;
    const normalizedSection = normalizeSectionValue(grade, section);

    // Validate input
    if (
      !grade ||
      (requiresStream(grade) && !normalizedSection) ||
      !academicYear ||
      !semester ||
      !examType ||
      !startDate ||
      !endDate
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    if (!ALLOWED_EXAM_TYPES.includes(examType)) {
      return res.status(400).json({
        success: false,
        message: 'Exam type must be Midterm, Final, or Mock'
      });
    }

    const { teachers, subjectTeacherPairs } = await getScheduleSeedData({ grade, section: normalizedSection });

    if (teachers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active teachers found for invigilation'
      });
    }

    if (subjectTeacherPairs.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No subjects found for teachers in Grade ${grade}${normalizedSection ? ` ${normalizedSection}` : ''}`
      });
    }

    const dates = buildDateRange(startDate, endDate);

    if (!dates || dates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date range'
      });
    }

    const createdSchedules = [];
    let pairIndex = 0;
    let invigilatorIndex = 0;

    for (const date of dates) {
      let examsScheduledForDate = 0;

      for (const slot of DEFAULT_TIME_SLOTS) {
        if (examsScheduledForDate >= 2 || pairIndex >= subjectTeacherPairs.length) {
          break;
        }

        const { subject } = subjectTeacherPairs[pairIndex];
        let createdForSlot = false;

        for (let teacherOffset = 0; teacherOffset < teachers.length; teacherOffset += 1) {
          const invigilatorTeacher = teachers[(invigilatorIndex + teacherOffset) % teachers.length];
          const invigilator = getTeacherDisplayName(invigilatorTeacher);

          if (!invigilator) {
            continue;
          }

          const gradePrefix = `G${grade}`;
          const gradeRooms = DEFAULT_ROOMS.filter((room) => room.startsWith(gradePrefix));

          for (const room of gradeRooms) {
          const constraintError = await validateScheduleConstraints({
            grade,
            section: normalizedSection,
            date,
            startTime: slot.start,
            endTime: slot.end,
            room,
            invigilator
          });

          if (constraintError) {
            continue;
          }

          const examSchedule = new ExamSchedule({
            examName: `${examType} - ${subject}`,
            examType,
            subject,
            grade,
            section: normalizedSection,
            academicYear,
            semester,
            date,
            startTime: slot.start,
            endTime: slot.end,
            duration: slot.duration,
            room,
            invigilator,
            notes: `Auto-generated from teacher subject assignment for Grade ${grade}${normalizedSection ? ` ${normalizedSection}` : ''}`,
            maxMarks: examType === 'Final' ? 40 : 20,
            createdBy: req.user.id,
            status: 'Scheduled'
          });

          await examSchedule.save();
          createdSchedules.push(examSchedule);
          pairIndex += 1;
          invigilatorIndex = (invigilatorIndex + teacherOffset + 1) % teachers.length;
          examsScheduledForDate += 1;
          createdForSlot = true;
          break;
        }

          if (createdForSlot) {
            break;
          }
        }

        if (!createdForSlot) {
          continue;
        }
      }

      if (pairIndex >= subjectTeacherPairs.length) {
        break;
      }
    }

    if (createdSchedules.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No schedules could be generated within the selected date range and constraints'
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully generated ${createdSchedules.length} exam schedules`,
      data: createdSchedules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to auto-generate exam schedule',
      error: error.message
    });
  }
};

/**
 * Regenerate/Optimize exam schedule
 */
exports.regenerateSchedule = async (req, res) => {
  try {
    if (!isExamScheduleAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Only school administrators can regenerate exam schedules'
      });
    }

    const {
      grade,
      section,
      academicYear,
      semester,
      examType,
      startDate,
      endDate
    } = req.body;
    const normalizedSection = normalizeSectionValue(grade, section);

    // Validate input
    if (
      !grade ||
      (requiresStream(grade) && !normalizedSection) ||
      !academicYear ||
      !semester ||
      !examType ||
      !startDate ||
      !endDate
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    if (!ALLOWED_EXAM_TYPES.includes(examType)) {
      return res.status(400).json({
        success: false,
        message: 'Exam type must be Midterm, Final, or Mock'
      });
    }

    const dates = buildDateRange(startDate, endDate);

    if (!dates || dates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date range'
      });
    }

    const rangeStart = new Date(dates[0]);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(dates[dates.length - 1]);
    rangeEnd.setHours(23, 59, 59, 999);

    // Delete only the currently targeted plan window before rebuilding it.
    const deleteQuery = {
      grade,
      academicYear,
      semester,
      examType,
      date: {
        $gte: rangeStart,
        $lte: rangeEnd
      }
    };

    if (normalizedSection) {
      deleteQuery.section = normalizedSection;
    } else {
      deleteQuery.$or = [{ section: { $exists: false } }, { section: null }, { section: '' }];
    }

    await ExamSchedule.deleteMany(deleteQuery);

    // Auto-generate new schedules
    req.body = {
      grade,
      section: normalizedSection,
      academicYear,
      semester,
      examType,
      startDate,
      endDate
    };
    return exports.autoGenerateSchedule(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate exam schedule',
      error: error.message
    });
  }
};
