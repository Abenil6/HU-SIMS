const mongoose = require('mongoose');

const examScheduleSchema = new mongoose.Schema(
  {
    examName: {
      type: String,
      required: true
    },
    examType: {
      type: String,
      enum: ['Midterm', 'Final', 'Mock'],
      default: 'Midterm'
    },
    subject: {
      type: String,
      required: true
    },
    grade: {
      type: Number,
      required: true,
      min: 9,
      max: 12
    },
    section: {
      type: String,
      default: undefined
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
    date: {
      type: Date,
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    duration: {
      type: Number,
      default: 60 // in minutes
    },
    room: {
      type: String,
      required: true
    },
    invigilator: {
      type: String,
      required: true
    },
    instructions: {
      type: String
    },
    notes: {
      type: String
    },
    maxMarks: {
      type: Number,
      default: 100
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'],
      default: 'Scheduled'
    }
  },
  { timestamps: true }
);

// Indexes for efficient queries
examScheduleSchema.index({ academicYear: 1, semester: 1 });
examScheduleSchema.index({ grade: 1, section: 1 });
examScheduleSchema.index({ date: 1 });
examScheduleSchema.index({ subject: 1 });
examScheduleSchema.index({ date: 1, startTime: 1, endTime: 1, room: 1 });
examScheduleSchema.index({ date: 1, startTime: 1, endTime: 1, invigilator: 1 });

module.exports = mongoose.model('ExamSchedule', examScheduleSchema);
