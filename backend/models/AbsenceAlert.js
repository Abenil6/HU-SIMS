const mongoose = require('mongoose');

const absenceAlertSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    academicYear: {
      type: String,
      required: true
    },
    grade: {
      type: String,
      required: true
    },
    section: {
      type: String,
      required: true
    },
    // Absence details
    date: {
      type: Date,
      required: true
    },
    period: {
      type: String, // Can be "Full Day" or specific period number
      default: 'Full Day'
    },
    subject: {
      type: String
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String
    },
    // Notification status
    notificationStatus: {
      type: String,
      enum: ['Pending', 'Sent', 'Failed', 'Read'],
      default: 'Pending'
    },
    notificationSentAt: {
      type: Date
    },
    notificationMethod: {
      type: String,
      enum: ['SMS', 'Email', 'Push', 'InApp'],
      default: 'InApp'
    },
    // Parent notification
    parents: [{
      parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      status: {
        type: String,
        enum: ['Pending', 'Sent', 'Read'],
        default: 'Pending'
      },
      sentAt: Date,
      readAt: Date
    }],
    // Alert settings
    alertType: {
      type: String,
      enum: ['FirstAbsence', 'ConsecutiveAbsence', 'ThresholdReached', 'PatternDetected'],
      default: 'FirstAbsence'
    },
    consecutiveCount: {
      type: Number,
      default: 1
    },
    // Response from parent
    parentResponse: {
      responded: {
        type: Boolean,
        default: false
      },
      response: {
        type: String,
        enum: ['Acknowledged', 'Excused', 'Unexcused', null],
        default: null
      },
      responseDate: Date,
      responseNote: String
    },
    // Status
    status: {
      type: String,
      enum: ['Active', 'Resolved', 'Dismissed'],
      default: 'Active'
    },
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

// Indexes
absenceAlertSchema.index({ student: 1, date: -1 });
absenceAlertSchema.index({ academicYear: 1, grade: 1, section: 1 });
absenceAlertSchema.index({ notificationStatus: 1 });
absenceAlertSchema.index({ 'parents.parent': 1 });
absenceAlertSchema.index({ alertType: 1 });

// Static method to create absence alert from attendance
absenceAlertSchema.statics.createFromAttendance = async function(attendance, teacher) {
  const student = await mongoose.model('User').findById(attendance.student);
        
  if (!student || student.role !== 'Student') {
    throw new Error('Invalid student');
  }

  // Get parent's linked children
  const linkedParents = student.studentProfile?.linkedParents || [];

  // Create alert
  const alert = new this({
    student: attendance.student,
    academicYear: student.studentProfile?.academicYear || '2024-2025',
    grade: student.studentProfile?.grade || '9',
    section: student.studentProfile?.section || student.studentProfile?.stream || 'A',
    date: attendance.date,
    period: attendance.period || 'Full Day',
    subject: attendance.subject,
    teacher: teacher._id,
    reason: attendance.notes,
    parents: linkedParents.map(parentId => ({
      parent: parentId,
      status: 'Pending'
    })),
    notificationStatus: linkedParents.length > 0 ? 'Pending' : 'Sent',
    alertType: 'FirstAbsence'
  });

  await alert.save();
  return alert;
};

// Static method to check and create consecutive absence alerts
absenceAlertSchema.statics.checkConsecutiveAbsences = async function(studentId, academicYear) {
  const recentAbsences = await this.find({
    student: studentId,
    academicYear,
    status: 'Active'
  }).sort({ date: -1 }).limit(5);

  if (recentAbsences.length >= 3) {
    const lastThree = recentAbsences.slice(0, 3);
    if (lastThree.every(a => a.consecutiveCount === 1)) {
      // Mark all as consecutive
      await this.updateMany(
        { _id: { $in: lastThree.map(a => a._id) } },
        { 
          alertType: 'ConsecutiveAbsence',
          consecutiveCount: 3
        }
      );
    }
  }

  return recentAbsences;
};

// Static method to get parent alerts
absenceAlertSchema.statics.getParentAlerts = async function(parentId) {
  return await this.find({
    'parents.parent': parentId,
    status: 'Active'
  })
    .populate('student', 'firstName lastName studentProfile')
    .populate('teacher', 'firstName lastName')
    .sort({ date: -1 });
};

// Static method to get student alerts
absenceAlertSchema.statics.getStudentAlerts = async function(studentId) {
  return await this.find({
    student: studentId,
    status: 'Active'
  })
    .populate('teacher', 'firstName lastName')
    .sort({ date: -1 });
};

module.exports = mongoose.model('AbsenceAlert', absenceAlertSchema);
