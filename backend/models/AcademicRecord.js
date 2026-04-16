const mongoose = require('mongoose');

const academicRecordSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    subject: {
      type: String,
      required: true
    },
    gradeLevel: {
      type: String,
      default: ''
    },
    // Grading components (out of 100)
    marks: {
      // Mid Exam - out of 20
      midExam: {
        type: Number,
        default: 0,
        min: 0,
        max: 20
      },
      // Final Exam - out of 40
      finalExam: {
        type: Number,
        default: 0,
        min: 0,
        max: 40
      },
      // Class Quiz / Test - out of 20
      classQuiz: {
        type: Number,
        default: 0,
        min: 0,
        max: 20
      },
      // Continuous Assessment - out of 10
      continuousAssessment: {
        type: Number,
        default: 0,
        min: 0,
        max: 10
      },
      // Assignment - out of 20
      assignment: {
        type: Number,
        default: 0,
        min: 0,
        max: 20
      }
    },
    // Tracks whether each component has already been submitted at least once.
    // This prevents duplicate submissions via POST /grades for the same term.
    submittedComponents: {
      midExam: {
        type: Boolean,
        default: false
      },
      finalExam: {
        type: Boolean,
        default: false
      },
      classQuiz: {
        type: Boolean,
        default: false
      },
      assignment: {
        type: Boolean,
        default: false
      }
    },
    // Total marks (calculated automatically)
    totalMarks: {
      type: Number,
      default: 0,
      min: 0
    },
    // Grade status for approval workflow
    status: {
      type: String,
      enum: ['Draft', 'Submitted', 'Approved', 'Rejected'],
      default: 'Draft'
    },
    // If locked, grade cannot be edited
    isLocked: {
      type: Boolean,
      default: false
    },
    // Academic term/year
    academicYear: {
      type: String,
      required: true
    },
    semester: {
      type: String,
      enum: ['Semester 1', 'Semester 2'],
      required: true
    },
    // Comments
    comments: {
      type: String
    },
    // Approval tracking
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    rejectionReason: {
      type: String
    },
    // Audit fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    // Honor Roll Status
    honorRoll: {
      type: Boolean,
      default: false
    },
    honorRollType: {
      type: String,
      enum: ['First Class', 'Second Class Upper', 'Second Class Lower', 'Third Class', null],
      default: null
    },
    honorRollDate: {
      type: Date
    }
  },
  { timestamps: true }
);

// Indexes for efficient queries
academicRecordSchema.index({ student: 1, academicYear: 1, semester: 1 });
academicRecordSchema.index(
  { student: 1, subject: 1, academicYear: 1, semester: 1 },
  { unique: true },
);
academicRecordSchema.index({ gradeLevel: 1, academicYear: 1, semester: 1 });
academicRecordSchema.index({ teacher: 1, academicYear: 1 });
academicRecordSchema.index({ subject: 1 });
academicRecordSchema.index({ status: 1 });
academicRecordSchema.index({ isLocked: 1 });

// Calculate total marks before saving
academicRecordSchema.pre('save', async function() {
  // Total marks out of 110: Mid(20) + Final(40) + Quiz(20) + ContinuousAssessment(10) + Assignment(20)
  this.totalMarks =
    (this.marks?.midExam || 0) +
    (this.marks?.finalExam || 0) +
    (this.marks?.classQuiz || 0) +
    (this.marks?.continuousAssessment || 0) +
    (this.marks?.assignment || 0);
});

/**
 * Submit grade for approval
 */
academicRecordSchema.methods.submitForApproval = function(userId) {
  this.status = 'Submitted';
  this.createdBy = userId;
  return this.save();
};

/**
 * Approve grade
 */
academicRecordSchema.methods.approve = function(approverId) {
  this.status = 'Approved';
  this.isLocked = true;
  this.approvedBy = approverId;
  this.approvedAt = new Date();
  return this.save();
};

/**
 * Reject grade
 */
academicRecordSchema.methods.reject = function(approverId, reason) {
  this.status = 'Rejected';
  this.approvedBy = approverId;
  this.rejectionReason = reason;
  return this.save();
};

/**
 * Unlock grade for editing
 */
academicRecordSchema.methods.unlock = function() {
  this.isLocked = false;
  return this.save();
};

/**
 * Lock grade to prevent further edits
 */
academicRecordSchema.methods.lock = function() {
  this.isLocked = true;
  return this.save();
};

/**
 * Calculate GPA from grades
 */
academicRecordSchema.statics.calculateGPA = async function(studentId, academicYear, semester) {
  const records = await this.find({
    student: studentId,
    academicYear,
    semester,
    status: 'Approved'
  });

  if (records.length === 0) return 0;

  const totalGrade = records.reduce((sum, record) => sum + record.totalMarks, 0);
  return (totalGrade / records.length).toFixed(2);
};

/**
 * Calculate Honor Roll status based on average marks
 * First Class: >= 90%
 * Second Class Upper: >= 80%
 * Second Class Lower: >= 70%
 * Third Class: >= 60%
 */
academicRecordSchema.statics.calculateHonorRoll = async function(studentId, academicYear, semester) {
  const records = await this.find({
    student: studentId,
    academicYear,
    semester,
    status: 'Approved'
  });

  if (records.length === 0) {
    return { honorRoll: false, honorRollType: null, averageMarks: 0 };
  }

  const totalMarks = records.reduce((sum, record) => sum + record.totalMarks, 0);
  const averageMarks = (totalMarks / records.length);

  let honorRollType = null;
  if (averageMarks >= 90) {
    honorRollType = 'First Class';
  } else if (averageMarks >= 80) {
    honorRollType = 'Second Class Upper';
  } else if (averageMarks >= 70) {
    honorRollType = 'Second Class Lower';
  } else if (averageMarks >= 60) {
    honorRollType = 'Third Class';
  }

  return {
    honorRoll: honorRollType !== null,
    honorRollType,
    averageMarks: averageMarks.toFixed(2)
  };
};

/**
 * Update Honor Roll status for all students in a semester
 */
academicRecordSchema.statics.updateHonorRollForSemester = async function(academicYear, semester) {
  const students = await this.distinct('student', { academicYear, semester, status: 'Approved' });
  const results = [];

  for (const studentId of students) {
    const honorRollStatus = await this.calculateHonorRoll(studentId, academicYear, semester);
    
    // Update all records for this student with honor roll status
    await this.updateMany(
      { student: studentId, academicYear, semester },
      {
        honorRoll: honorRollStatus.honorRoll,
        honorRollType: honorRollStatus.honorRollType,
        honorRollDate: new Date()
      }
    );

    results.push({
      studentId,
      ...honorRollStatus
    });
  }

  return results;
};

/**
 * Get student performance summary
 */
academicRecordSchema.statics.getStudentPerformance = async function(studentId, academicYear) {
  const records = await this.find({
    student: studentId,
    academicYear
  }).populate('subject', 'name');

  const summary = {
    totalRecords: records.length,
    approvedRecords: records.filter(r => r.status === 'Approved').length,
    averageMarks: 0,
    marksBySubject: {},
    semesterData: {
      'Semester 1': { total: 0, count: 0 },
      'Semester 2': { total: 0, count: 0 }
    }
  };

  if (records.length > 0) {
    const approvedRecords = records.filter(r => r.status === 'Approved');
    if (approvedRecords.length > 0) {
      const total = approvedRecords.reduce((sum, r) => sum + r.totalMarks, 0);
      summary.averageMarks = (total / approvedRecords.length).toFixed(2);
    }

    // Group by subject
    approvedRecords.forEach(record => {
      const subject = record.subject;
      if (!summary.marksBySubject[subject]) {
        summary.marksBySubject[subject] = { total: 0, count: 0 };
      }
      summary.marksBySubject[subject].total += record.totalMarks;
      summary.marksBySubject[subject].count += 1;
    });

    // Calculate averages by subject
    for (const subject in summary.marksBySubject) {
      const data = summary.marksBySubject[subject];
      summary.marksBySubject[subject].average = (data.total / data.count).toFixed(2);
    }

    // Group by semester
    approvedRecords.forEach(record => {
      if (summary.semesterData[record.semester]) {
        summary.semesterData[record.semester].total += record.totalMarks;
        summary.semesterData[record.semester].count += 1;
      }
    });
  }

  return summary;
};

module.exports = mongoose.model('AcademicRecord', academicRecordSchema);
