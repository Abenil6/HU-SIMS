const User = require('../models/User');
const AcademicRecord = require('../models/AcademicRecord');
const Timetable = require('../models/Timetable');
const Message = require('../models/Message');
const mongoose = require('mongoose');

const resolveStudentGradeLevel = (studentUser) =>
  String(studentUser?.studentProfile?.grade || studentUser?.grade || '').trim();

const normalizeGradeValue = (value) =>
  String(value || '')
    .replace(/^Grade\s+/i, '')
    .trim();

const normalizeClassScopeValue = (value) => String(value || '').trim();

const normalizeSubjectValue = (value) => String(value || '').trim().toLowerCase();
const isAcademicAdmin = (role) => ['SchoolAdmin', 'SystemAdmin'].includes(String(role || ''));

const getTeacherSubjects = (teacherUser) => {
  const profileSubjects = Array.isArray(teacherUser?.teacherProfile?.subjects)
    ? teacherUser.teacherProfile.subjects
    : [];
  const singularSubject = teacherUser?.teacherProfile?.subject
    ? [teacherUser.teacherProfile.subject]
    : [];

  return [...new Set(
    [...profileSubjects, ...singularSubject]
      .map((subject) => String(subject || '').trim())
      .filter(Boolean),
  )];
};

const isTeacherAuthorizedForSubject = (teacherUser, subject) => {
  const role = teacherUser?.role || '';
  if (role === 'SchoolAdmin' || role === 'SystemAdmin') return true;

  const allowedSubjects = getTeacherSubjects(teacherUser);
  if (!allowedSubjects.length) return false;

  return allowedSubjects.some(
    (assignedSubject) => normalizeSubjectValue(assignedSubject) === normalizeSubjectValue(subject),
  );
};

/**
 * Resolve a student document from either a MongoDB ObjectId string or a
 * custom studentId string (e.g. "STU004").
 * Queries in this order:
 *   1. studentProfile.studentId  (custom string ID)
 *   2. _id                       (only when value is a valid ObjectId)
 */
async function findStudentByFlexibleId(studentId) {
  // 1. Try custom studentId field first
  let student = await User.findOne({
    role: 'Student',
    'studentProfile.studentId': studentId
  });
  if (student) return student;

  // 2. Try username (some systems use it as an identifier)
  student = await User.findOne({ role: 'Student', username: studentId });
  if (student) return student;

  // 3. Only try _id cast when the value looks like a valid ObjectId
  if (mongoose.Types.ObjectId.isValid(studentId)) {
    student = await User.findOne({ _id: studentId, role: 'Student' });
  }
  return student || null;
}

/**
 * Normalize semester input:
 *  "1"        → "Semester 1"
 *  "2"        → "Semester 2"
 *  "Semester 1" / "Semester 2" → returned as-is
 */
function normalizeSemester(value) {
  if (!value) return 'Semester 1';
  const s = String(value).trim();
  if (s === '1') return 'Semester 1';
  if (s === '2') return 'Semester 2';
  return s; // already in correct format
}

/**
 * Check whether the requesting user is allowed to create grades for a student.
 *
 * Authorization sources (checked in order):
 *  1. Admins (SchoolAdmin / SystemAdmin) — always allowed.
 *  2. Teacher's teacherProfile.classes — the primary assignment mechanism.
 *  3. Timetable periods — secondary / optional.
 */
async function isTeacherAuthorizedForStudent(teacherUser, studentUser) {
  const role = teacherUser.role || '';
  if (role === 'SchoolAdmin' || role === 'SystemAdmin') return true;

  const studentGrade = normalizeGradeValue(studentUser.studentProfile?.grade || studentUser.grade);
  const studentSection = normalizeClassScopeValue(studentUser.studentProfile?.section);
  const studentStream = normalizeClassScopeValue(studentUser.studentProfile?.stream);
  if (!studentGrade) return false;

  const classCoversStudent = (cls) => {
    const clsGrade = normalizeGradeValue(cls.grade);
    const clsSection = normalizeClassScopeValue(cls.section);
    const clsStream = normalizeClassScopeValue(cls.stream);
    if (clsGrade !== studentGrade) return false;
    if (clsSection && studentSection && clsSection !== studentSection) return false;
    if (clsStream  && studentStream  && clsStream  !== studentStream)  return false;
    return true;
  };

  // Source 1: teacherProfile.classes
  const profileClasses = Array.isArray(teacherUser.teacherProfile?.classes)
    ? teacherUser.teacherProfile.classes : [];
  if (profileClasses.some(classCoversStudent)) return true;

  // Source 2: Timetable
  const timetables = await Timetable.find({ 'periods.teacher': teacherUser._id })
    .select('class.grade class.section class.stream');
  const seen = new Set();
  const timetableClasses = [];
  for (const tt of timetables) {
    const key = `${tt.class.grade}-${tt.class.section || ''}-${tt.class.stream || ''}`;
    if (!seen.has(key)) { seen.add(key); timetableClasses.push(tt.class); }
  }
  if (timetableClasses.some(classCoversStudent)) return true;

  return false;
}

const getTeacherScopedStudents = async (teacherUser) => {
  const role = teacherUser?.role || '';
  if (role !== 'Teacher') {
    return [];
  }

  const profileClasses = Array.isArray(teacherUser.teacherProfile?.classes)
    ? teacherUser.teacherProfile.classes
    : [];

  const timetables = await Timetable.find({ 'periods.teacher': teacherUser._id })
    .select('class.grade class.section class.stream');

  const seen = new Set();
  const allClasses = [];

  profileClasses.forEach((cls) => {
    const key = `${normalizeGradeValue(cls.grade)}-${normalizeClassScopeValue(cls.section)}-${normalizeClassScopeValue(cls.stream)}`;
    if (!seen.has(key)) {
      seen.add(key);
      allClasses.push(cls);
    }
  });

  timetables.forEach((timetable) => {
    const timetableClass = timetable.class || {};
    const key = `${normalizeGradeValue(timetableClass.grade)}-${normalizeClassScopeValue(timetableClass.section)}-${normalizeClassScopeValue(timetableClass.stream)}`;
    if (!seen.has(key)) {
      seen.add(key);
      allClasses.push({
        grade: timetableClass.grade,
        section: timetableClass.section,
        stream: timetableClass.stream,
      });
    }
  });

  if (!allClasses.length) {
    return [];
  }

  const studentQueries = allClasses.map((cls) => {
    const grade = normalizeGradeValue(cls.grade);
    const gradeNum = parseInt(grade, 10);

    // Grades 11-12 have streams (Natural/Social), Grades 9-10 do not
    if (gradeNum >= 11) {
      const stream = cls.stream || cls.section;
      if (stream) {
        return {
          'studentProfile.grade': grade,
          'studentProfile.stream': normalizeClassScopeValue(stream),
        };
      }
    }

    // Grades 9-10 (or if no stream specified): only query by grade
    return {
      'studentProfile.grade': grade,
    };
  });

  const students = await User.find({
    role: 'Student',
    $or: studentQueries,
  }).select('_id');

  return students;
};

/**
 * Maps frontend assessmentType to the AcademicRecord marks field.
 * Mid=20, Final=40, Quiz=20, Assignment=20 → total 100
 */
const ASSESSMENT_MARKS_MAP = {
  mid_exam:   { field: 'midExam',    max: 20, submittedField: 'midExam' },
  final_exam: { field: 'finalExam',  max: 40, submittedField: 'finalExam' },
  test:       { field: 'classQuiz',  max: 20, submittedField: 'classQuiz' },
  assignment: { field: 'assignment', max: 20, submittedField: 'assignment' },
};

/**
 * Create or update a grade for a single assessment component.
 * Uses upsert so 4 POST calls (one per component) update ONE record.
 */
exports.createAcademicRecordFromGrade = async (req, res) => {
  try {
    const {
      studentId,
      subject,
      score,
      maxScore,
      assessmentType = 'assignment',
      semester,
      academicYear
    } = req.body;

    // Verify student exists (supports both ObjectId and custom studentId like "STU004")
    const studentUser = await findStudentByFlexibleId(studentId);
    if (!studentUser) {
      return res.status(404).json({
        success: false,
        message: `Student not found (id: ${studentId})`
      });
    }

    // Check if teacher is authorized to grade this student
    const teacherDoc = await User.findById(req.user.id).select('role teacherProfile');
    const authorized = await isTeacherAuthorizedForStudent(teacherDoc || req.user, studentUser);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to create grades for this student'
      });
    }

    if (!isTeacherAuthorizedForSubject(teacherDoc || req.user, subject)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to create grades for this subject'
      });
    }

    // Resolve which marks field this assessmentType maps to
    const markConfig = ASSESSMENT_MARKS_MAP[assessmentType] || ASSESSMENT_MARKS_MAP['assignment'];
    const cappedScore  = Math.min(Number(score) || 0, markConfig.max);

    const normSemester  = normalizeSemester(semester);
    const gradeLevel    = resolveStudentGradeLevel(studentUser);
    const baseFilter = {
      student: studentUser._id,
      subject,
      semester: normSemester,
      academicYear,
    };

    const submittedField = markConfig.submittedField;

    // Ensure base record exists atomically (prevents duplicate records under concurrent requests).
    await AcademicRecord.findOneAndUpdate(
      baseFilter,
      {
        $setOnInsert: {
          student: studentUser._id,
          teacher: req.user.id,
          subject,
          gradeLevel,
          academicYear,
          semester: normSemester,
          status: 'Pending Approval',
          createdBy: req.user.id,
        },
      },
      { upsert: true, setDefaultsOnInsert: true },
    );

    // Update the record with the new mark (only if not already submitted)
    const record = await AcademicRecord.findOneAndUpdate(
      {
        ...baseFilter,
        [`submittedComponents.${submittedField}`]: { $ne: true },
      },
      {
        $set: {
          [`marks.${markConfig.field}`]: cappedScore,
          [`submittedComponents.${submittedField}`]: true,
          teacher: req.user.id,
          gradeLevel,
          updatedBy: req.user.id,
        },
      },
      { new: true },
    );

    if (!record) {
      return res.status(409).json({
        success: false,
        message: `${assessmentType} already submitted for this student, subject, semester, and academic year`,
      });
    }

    await record.save(); // triggers pre-save hook → totalMarks recalculated

    res.status(201).json({
      success: true,
      message: 'Grade created successfully',
      data: record
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate academic record detected for this student, subject, semester, and academic year',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create grade',
      error: error.message
    });
  }
};

/**
 * Bulk create grades from array of grade data
 */
exports.bulkCreateGrades = async (req, res) => {
  try {
    const { grades = [] } = req.body;
    
    if (!Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Grades array is required and must not be empty'
      });
    }

    const createdRecords = [];
    const errors = [];
    let teacherDoc = null;

    for (const gradeData of grades) {
      try {
        const { 
          studentId, 
          subject, 
          score, 
          maxScore, 
          percentage, 
          weight,
          semester, 
          academicYear 
        } = gradeData;

        // Verify student exists (supports both ObjectId and custom studentId like "STU004")
        const studentUser = await findStudentByFlexibleId(studentId);
        if (!studentUser) {
          errors.push({ studentId, subject, error: 'Student not found' });
          continue;
        }

        // Check if teacher is authorized to grade this student
        // (checks teacherProfile.classes first, then Timetable; admins always pass)
        if (!teacherDoc) teacherDoc = await User.findById(req.user.id).select('role teacherProfile');
        const authorized = await isTeacherAuthorizedForStudent(teacherDoc || req.user, studentUser);
        if (!authorized) {
          errors.push({ studentId, subject, error: 'Not authorized to grade this student' });
          continue;
        }

        if (!isTeacherAuthorizedForSubject(teacherDoc || req.user, subject)) {
          errors.push({ studentId, subject, error: 'Not authorized to grade this subject' });
          continue;
        }

        // Convert percentage-based grade to marks components
        const totalPercentage = percentage || (score / maxScore * 100);
        
        const academicRecord = new AcademicRecord({
          student: studentUser._id,   // always use the real MongoDB _id
          teacher: req.user.id,
          subject,
          gradeLevel: resolveStudentGradeLevel(studentUser),
          academicYear,
          semester: normalizeSemester(semester),
          marks: {
            midExam: Math.round(totalPercentage * 0.2),
            finalExam: Math.round(totalPercentage * 0.4),
            classQuiz: Math.round(totalPercentage * 0.1),
            continuousAssessment: Math.round(totalPercentage * 0.1),
            assignment: Math.round(totalPercentage * 0.2)
          },
          status: 'Pending Approval',
          createdBy: req.user.id
        });

        await academicRecord.save();
        createdRecords.push(academicRecord);
      } catch (err) {
        errors.push({ 
          studentId: gradeData.studentId, 
          subject: gradeData.subject, 
          error: err.message 
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Created ${createdRecords.length} grades, ${errors.length} failed`,
      data: createdRecords,
      errors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to bulk create grades',
      error: error.message
    });
  }
};

/**
 * Create a new academic record with marks components
 */
exports.createAcademicRecord = async (req, res) => {
  try {
    const { 
      student, 
      subject, 
      academicYear, 
      semester, 
      marks,
      comments 
    } = req.body;

    // Verify student exists (supports both ObjectId and custom studentId like "STU004")
    const studentUser = await findStudentByFlexibleId(student);
    if (!studentUser) {
      return res.status(404).json({
        success: false,
        message: `Student not found (id: ${student})`
      });
    }

    // Check if teacher is authorized to grade this student
    // (checks teacherProfile.classes first, then Timetable; admins always pass)
    const teacherDoc2 = await User.findById(req.user.id).select('role teacherProfile');
    const authorized2 = await isTeacherAuthorizedForStudent(teacherDoc2 || req.user, studentUser);
    if (!authorized2) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to create grades for this student'
      });
    }

    if (!isTeacherAuthorizedForSubject(teacherDoc2 || req.user, subject)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to create grades for this subject'
      });
    }

    const academicRecord = new AcademicRecord({
      student: studentUser._id,   // always use the real MongoDB _id
      teacher: req.user.id,
      subject,
      gradeLevel: resolveStudentGradeLevel(studentUser),
      academicYear,
      semester: normalizeSemester(semester),
      marks: {
        midExam: marks?.midExam || 0,
        finalExam: marks?.finalExam || 0,
        classQuiz: marks?.classQuiz || 0,
        continuousAssessment: marks?.continuousAssessment || 0,
        assignment: marks?.assignment || 0
      },
      submittedComponents: {
        midExam: true,
        finalExam: true,
        classQuiz: true,
        assignment: true,
      },
      comments,
      status: 'Draft',
      createdBy: req.user.id
    });

    await academicRecord.save();

    res.status(201).json({
      success: true,
      message: 'Academic record created successfully',
      data: academicRecord
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Academic record already exists for this student, subject, semester, and academic year',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create academic record',
      error: error.message
    });
  }
};

/**
 * Get all academic records
 */
exports.getAcademicRecords = async (req, res) => {
  try {
    const { student, subject, academicYear, semester, status, page = 1, limit = 20 } = req.query;

    const query = {};

    if (req.user.role === 'Student') {
      query.student = req.user.id;
    } else if (req.user.role === 'Parent') {
      const parent = await User.findById(req.user.id).select('parentProfile');
      const childIds = parent.parentProfile?.linkedChildren?.map(c => c.toString()) || [];
      query.student = { $in: childIds };
    }

    if (req.user.role === 'Teacher') {
      // Use req.user directly since auth middleware already populates teacherProfile
      const assignedStudents = await getTeacherScopedStudents(req.user);
      query.student = { $in: assignedStudents.map((studentDoc) => studentDoc._id) };

      const teacherSubjects = getTeacherSubjects(req.user);
      if (!teacherSubjects.length) {
        query.subject = '__NO_ASSIGNED_SUBJECT__';
      } else {
        query.subject = { $in: teacherSubjects };
      }
    }

    if (student) {
      if (req.user.role === 'Teacher') {
        const allowedStudents = Array.isArray(query.student?.$in)
          ? query.student.$in.map((studentDoc) => String(studentDoc))
          : [];

        if (!allowedStudents.includes(String(student))) {
          return res.status(403).json({
            success: false,
            message: 'You are not authorized to view grades for this student'
          });
        }
      }

      query.student = student;
    }

    if (subject) {
      if (req.user.role === 'Teacher') {
        if (!isTeacherAuthorizedForSubject(req.user, subject)) {
          return res.status(403).json({
            success: false,
            message: 'You are not authorized to view grades for this subject'
          });
        }
      }

      query.subject = subject;
    }
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = semester;
    if (status) query.status = status;

    const records = await AcademicRecord.find(query)
      .populate('student', 'firstName lastName username studentProfile')
      .populate('teacher', 'firstName lastName username')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Fallback: if populate failed (student/teacher are null), try manual lookup using raw MongoDB
    const db = mongoose.connection.db;
    const recordsWithFallback = await Promise.all(
      records.map(async (record) => {
        // Store original IDs before modification
        const originalStudentId = record.student;
        const originalTeacherId = record.teacher;
        
        // Check if student is null or missing required fields
        if (!record.student || !record.student.firstName) {
          try {
            // Try raw MongoDB query first
            const studentDoc = await db.collection('users').findOne({ _id: originalStudentId });
            if (studentDoc) {
              record.student = studentDoc;
            } else {
              // Fallback to Mongoose
              const student = await User.findById(record.student).select('firstName lastName email username studentProfile');
              if (student) {
                record.student = student;
              } else {
                // If student still not found, create a minimal object with the ID
                record.student = { _id: originalStudentId, firstName: 'Unknown', lastName: 'Student' };
              }
            }
          } catch (err) {
            record.student = { _id: originalStudentId, firstName: 'Unknown', lastName: 'Student' };
          }
        }
        // Check if teacher is null or missing required fields
        if (!record.teacher || !record.teacher.firstName) {
          try {
            // Try raw MongoDB query first
            const teacherDoc = await db.collection('users').findOne({ _id: originalTeacherId });
            if (teacherDoc) {
              record.teacher = teacherDoc;
            } else {
              // Fallback to Mongoose
              const teacher = await User.findById(record.teacher).select('firstName lastName email teacherProfile');
              if (teacher) {
                record.teacher = teacher;
              } else {
                // If teacher still not found, create a minimal object with the ID
                record.teacher = { _id: originalTeacherId, firstName: 'Unknown', lastName: 'Teacher' };
              }
            }
          } catch (err) {
            record.teacher = { _id: originalTeacherId, firstName: 'Unknown', lastName: 'Teacher' };
          }
        }
        return record;
      })
    );

    const total = await AcademicRecord.countDocuments(query);

    res.json({
      success: true,
      data: recordsWithFallback,
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
      message: 'Failed to fetch academic records',
      error: error.message
    });
  }
};

/**
 * Get academic record by ID
 */
exports.getAcademicRecordById = async (req, res) => {
  try {
    const record = await AcademicRecord.findById(req.params.id)
      .populate('student', 'firstName lastName email username grade section')
      .populate('teacher', 'firstName lastName email subject')
      .populate('approvedBy', 'firstName lastName');

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Academic record not found'
      });
    }

    if (req.user.role === 'Student' && record.student._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this record'
      });
    }

    if (req.user.role === 'Parent') {
      const parent = await User.findById(req.user.id).select('parentProfile');
      const childIds = parent.parentProfile?.linkedChildren?.map(c => c.toString()) || [];
      if (!childIds.includes(record.student._id.toString())) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this record'
        });
      }
    }

    if (req.user.role === 'Teacher') {
      const teacherDoc = await User.findById(req.user.id).select('role teacherProfile');
      const studentRef = record.student?._id || record.student;
      const studentUser = await User.findById(studentRef).select('role studentProfile grade');

      const allowedForStudent = await isTeacherAuthorizedForStudent(teacherDoc || req.user, studentUser);
      const allowedForSubject = isTeacherAuthorizedForSubject(teacherDoc || req.user, record.subject);

      if (!allowedForStudent || !allowedForSubject) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this record'
        });
      }
    }

    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch academic record',
      error: error.message
    });
  }
};

/**
 * Update academic record marks
 */
exports.updateAcademicRecord = async (req, res) => {
  try {
    const { marks, comments, status } = req.body;

    const record = await AcademicRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Academic record not found'
      });
    }

    if (record.isLocked && !isAcademicAdmin(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Record is locked. Contact admin to unlock.'
      });
    }

    if (req.user.role === 'Teacher' && record.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this record'
      });
    }

    if (req.user.role === 'Student' || req.user.role === 'Parent') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit academic records'
      });
    }

    if (marks) {
      record.marks = {
        midExam: marks.midExam ?? record.marks.midExam,
        finalExam: marks.finalExam ?? record.marks.finalExam,
        classQuiz: marks.classQuiz ?? record.marks.classQuiz,
        continuousAssessment: marks.continuousAssessment ?? record.marks.continuousAssessment,
        assignment: marks.assignment ?? record.marks.assignment
      };
    }
    if (comments !== undefined) record.comments = comments;
    if (status !== undefined && isAcademicAdmin(req.user.role)) record.status = status;

    record.updatedBy = req.user.id;
    await record.save();

    res.json({
      success: true,
      message: 'Academic record updated successfully',
      data: record
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update academic record',
      error: error.message
    });
  }
};

/**
 * Delete academic record
 */
exports.deleteAcademicRecord = async (req, res) => {
  try {
    const record = await AcademicRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Academic record not found'
      });
    }

    if (!isAcademicAdmin(req.user.role) && record.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this record'
      });
    }

    // Only non-admin users cannot delete approved records
    if (!isAcademicAdmin(req.user.role) && record.status === 'Approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete approved records'
      });
    }

    await AcademicRecord.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Academic record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete academic record',
      error: error.message
    });
  }
};

/**
 * Submit grade for approval
 */
exports.submitForApproval = async (req, res) => {
  try {
    const record = await AcademicRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Academic record not found'
      });
    }

    if (record.teacher.toString() !== req.user.id && !isAcademicAdmin(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (record.status !== 'Pending Approval' && record.status !== 'Rejected') {
      return res.status(400).json({
        success: false,
        message: 'Only pending approval or rejected records can be submitted'
      });
    }

    record.status = 'Submitted';
    await record.save();

    res.json({
      success: true,
      message: 'Grade submitted for approval',
      data: record
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to submit grade',
      error: error.message
    });
  }
};

/**
 * Approve grade
 */
exports.approveGrade = async (req, res) => {
  try {
    const record = await AcademicRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Academic record not found'
      });
    }

    if (record.status !== 'Pending Approval' && record.status !== 'Submitted') {
      return res.status(400).json({
        success: false,
        message: 'Only pending approval or submitted grades can be approved'
      });
    }

    record.status = 'Approved';
    record.isLocked = true;
    record.approvedBy = req.user.id;
    record.approvedAt = new Date();
    await record.save();

    // Send notification to student and parents
    const student = await User.findById(record.student);
    if (student) {
      const recipients = [student._id.toString()];

      // Add linked parents
      if (student.parentProfile?.linkedChildren) {
        const parentIds = student.parentProfile.linkedChildren
          .filter(link => link.childId?.toString() === student._id.toString())
          .map(link => link.parentId?.toString());
        recipients.push(...parentIds);
      }

      // Also check if parents are linked through parentProfile
      const parents = await User.find({
        role: 'Parent',
        'parentProfile.linkedChildren.childId': student._id
      });
      parents.forEach(parent => {
        if (!recipients.includes(parent._id.toString())) {
          recipients.push(parent._id.toString());
        }
      });

      if (recipients.length > 0) {
        const notification = new Message({
          sender: req.user.id,
          recipients,
          messageType: 'Broadcast',
          category: 'Academic',
          subject: `Grade Approved - ${record.subject}`,
          content: `Your grade for ${record.subject} has been approved and is now available.`,
          priority: 'Normal',
        });
        await notification.save();
      }
    }

    res.json({
      success: true,
      message: 'Grade approved and locked',
      data: record
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to approve grade',
      error: error.message
    });
  }
};

/**
 * Reject grade
 */
exports.rejectGrade = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const record = await AcademicRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Academic record not found'
      });
    }

    if (record.status !== 'Pending Approval' && record.status !== 'Submitted') {
      return res.status(400).json({
        success: false,
        message: 'Only pending approval or submitted grades can be rejected'
      });
    }

    record.status = 'Rejected';
    record.rejectionReason = reason;
    record.approvedBy = req.user.id;
    await record.save();

    res.json({
      success: true,
      message: 'Grade rejected',
      data: record
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reject grade',
      error: error.message
    });
  }
};

/**
 * Unlock grade (Admin only)
 */
exports.unlockGrade = async (req, res) => {
  try {
    const record = await AcademicRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Academic record not found'
      });
    }

    if (!isAcademicAdmin(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin can unlock grades'
      });
    }

    record.isLocked = false;
    await record.save();

    res.json({
      success: true,
      message: 'Grade unlocked for editing',
      data: record
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to unlock grade',
      error: error.message
    });
  }
};

/**
 * Lock grade (Admin only)
 */
exports.lockGrade = async (req, res) => {
  try {
    const record = await AcademicRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Academic record not found'
      });
    }

    if (!isAcademicAdmin(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin can lock grades'
      });
    }

    record.isLocked = true;
    await record.save();

    res.json({
      success: true,
      message: 'Grade locked',
      data: record
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to lock grade',
      error: error.message
    });
  }
};

/**
 * Get pending approvals
 */
exports.getPendingApprovals = async (req, res) => {
  try {
    const { academicYear, semester, page = 1, limit = 20 } = req.query;

    const query = { status: 'Submitted' };

    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = semester;

    const records = await AcademicRecord.find(query)
      .populate('student', 'firstName lastName email username grade')
      .populate('teacher', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await AcademicRecord.countDocuments(query);

    res.json({
      success: true,
      data: records,
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
      message: 'Failed to fetch pending approvals',
      error: error.message
    });
  }
};

/**
 * Get student performance summary
 */
exports.getStudentPerformance = async (req, res) => {
  try {
    const { studentId, academicYear } = req.query;

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

    if (req.user.role === 'Student' && targetStudentId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this student performance'
      });
    }

    if (req.user.role === 'Parent') {
      const parent = await User.findById(req.user.id).select('parentProfile');
      const childIds = parent.parentProfile?.linkedChildren?.map(c => c.toString()) || [];
      if (!childIds.includes(targetStudentId)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this student performance'
        });
      }
    }

    const performance = await AcademicRecord.getStudentPerformance(targetStudentId, academicYear);

    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get student performance',
      error: error.message
    });
  }
};

/**
 * Get class performance summary
 */
exports.getClassPerformance = async (req, res) => {
  try {
    const { academicYear, semester, subject } = req.query;

    const query = { 
      academicYear, 
      semester,
      status: 'Approved'
    };

    if (subject) query.subject = subject;

    const records = await AcademicRecord.find(query)
      .populate('student', 'firstName lastName');

    const stats = {
      totalRecords: records.length,
      averageMarks: 0,
      highestMarks: 0,
      lowestMarks: 100
    };

    if (records.length > 0) {
      let total = 0;
      records.forEach(record => {
        total += record.totalMarks;
        if (record.totalMarks > stats.highestMarks) stats.highestMarks = record.totalMarks;
        if (record.totalMarks < stats.lowestMarks) stats.lowestMarks = record.totalMarks;
      });

      stats.averageMarks = (total / records.length).toFixed(2);
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get class performance',
      error: error.message
    });
  }
};

/**
 * Get student honor roll status
 */
exports.getHonorRollStatus = async (req, res) => {
  try {
    const { studentId, academicYear, semester } = req.query;

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

    if (req.user.role === 'Student' && targetStudentId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this student honor roll status'
      });
    }

    if (req.user.role === 'Parent') {
      const parent = await User.findById(req.user.id).select('parentProfile');
      const childIds = parent.parentProfile?.linkedChildren?.map(c => c.toString()) || [];
      if (!childIds.includes(targetStudentId)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this student honor roll status'
        });
      }
    }

    const honorRollStatus = await AcademicRecord.calculateHonorRoll(
      targetStudentId,
      academicYear,
      semester
    );

    res.json({
      success: true,
      data: honorRollStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get honor roll status',
      error: error.message
    });
  }
};

/**
 * Update honor roll status for a semester (Admin/Teacher only)
 */
exports.updateHonorRollStatus = async (req, res) => {
  try {
    const { academicYear, semester } = req.body;

    if (req.user.role === 'Student' || req.user.role === 'Parent') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update honor roll status'
      });
    }

    const results = await AcademicRecord.updateHonorRollForSemester(academicYear, semester);

    res.json({
      success: true,
      message: 'Honor roll status updated successfully',
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update honor roll status',
      error: error.message
    });
  }
};

/**
 * Get honor roll list for a semester
 */
exports.getHonorRollList = async (req, res) => {
  try {
    const { academicYear, semester, honorRollType } = req.query;

    const query = {
      academicYear,
      semester,
      honorRoll: true,
      status: 'Approved'
    };

    if (honorRollType) {
      query.honorRollType = honorRollType;
    }

    const records = await AcademicRecord.find(query)
      .populate('student', 'firstName lastName email grade section')
      .sort({ 'student.lastName': 1 });

    // Group by student and get their honor roll type
    const studentMap = new Map();
    records.forEach(record => {
      const studentId = record.student._id.toString();
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student: record.student,
          honorRollType: record.honorRollType,
          subjects: []
        });
      }
      studentMap.get(studentId).subjects.push(record.subject);
    });

    const honorRollList = Array.from(studentMap.values());

    res.json({
      success: true,
      data: honorRollList
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get honor roll list',
      error: error.message
    });
  }
};
