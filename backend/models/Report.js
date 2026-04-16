const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reportType: {
      type: String,
      enum: [
        'StudentReportCard',
        'StudentTranscript',
        'ClassProgress',
        'AttendanceSummary',
        'GradeReport',
        'PerformanceAnalytics'
      ],
      required: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    class: {
      type: String
    },
    academicYear: {
      type: String,
      required: true
    },
    semester: {
      type: String,
      enum: ['Semester 1', 'Semester 2'],
      required: true
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // For official transcripts
    official: {
      type: Boolean,
      default: false
    },
    signedBy: {
      type: String
    },
    signatureDate: {
      type: Date
    },
    signatureImage: {
      type: String
    },
    status: {
      type: String,
      enum: ['Draft', 'Final', 'Archived'],
      default: 'Draft'
    }
  },
  { timestamps: true }
);

// Indexes
reportSchema.index({ student: 1, academicYear: 1, semester: 1 });
reportSchema.index({ class: 1, academicYear: 1, semester: 1 });
reportSchema.index({ reportType: 1, status: 1 });

module.exports = mongoose.model('Report', reportSchema);
