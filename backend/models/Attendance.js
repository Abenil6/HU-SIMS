const mongoose = require('mongoose');

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

const attendanceSchema = new mongoose.Schema(
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
    date: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Late', 'Excused'],
      required: true
    },
    // For offline-first support
    offlineId: {
      type: String,
      unique: true,
      sparse: true
    },
    synced: {
      type: Boolean,
      default: true
    },
    // Additional details
    period: {
      type: Number,
      min: 1,
      max: 8
    },
    subject: {
      type: String
    },
    remarks: {
      type: String
    },
    // Check-in time for late arrivals
    checkInTime: {
      type: Date
    }
  },
  { timestamps: true }
);

// Indexes for efficient queries
attendanceSchema.index({ student: 1, date: 1 });
attendanceSchema.index({ teacher: 1, date: 1 });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ synced: 1 });

/**
 * Mark attendance (single or bulk)
 */
attendanceSchema.statics.markAttendance = async function(attendanceData) {
  const results = {
    created: [],
    updated: [],
    errors: []
  };

  for (const record of attendanceData) {
    try {
      const attendanceDate = parseAttendanceDate(record.date);
      if (!attendanceDate) {
        throw new Error('Invalid attendance date');
      }
      const dayStart = new Date(attendanceDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(attendanceDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Check if attendance already exists for this student/date
      const existing = await this.findOne({
        student: record.student,
        date: { $gte: dayStart, $lte: dayEnd }
      });

      if (existing) {
        existing.status = record.status;
        existing.remarks = record.remarks;
        existing.checkInTime = record.checkInTime || existing.checkInTime;
        existing.synced = record.synced !== false;
        await existing.save();
        results.updated.push(existing);
      } else {
        const attendance = new this({
          ...record,
          synced: record.synced !== false
        });
        await attendance.save();
        results.created.push(attendance);
      }
    } catch (error) {
      results.errors.push({ record, error: error.message });
    }
  }

  return results;
};

/**
 * Get attendance for a student
 */
attendanceSchema.statics.getStudentAttendance = async function(studentId, academicYear, month) {
  const startDate = new Date(academicYear, month - 1, 1);
  const endDate = new Date(academicYear, month, 0, 23, 59, 59);

  return this.find({
    student: studentId,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });
};

/**
 * Get class attendance summary
 */
attendanceSchema.statics.getClassSummary = async function(className, academicYear, month) {
  const startDate = new Date(academicYear, month - 1, 1);
  const endDate = new Date(academicYear, month, 0, 23, 59, 59);

  const records = await this.aggregate([
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
      $match: {
        'studentInfo.grade': className,
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$student',
        studentName: { $first: '$studentInfo' },
        totalPresent: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
        totalAbsent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
        totalLate: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
        totalExcused: { $sum: { $cond: [{ $eq: ['$status', 'Excused'] }, 1, 0] } },
        totalDays: { $sum: 1 }
      }
    },
    {
      $project: {
        studentName: { $concat: ['$studentName.firstName', ' ', '$studentName.lastName'] },
        totalPresent: 1,
        totalAbsent: 1,
        totalLate: 1,
        totalExcused: 1,
        totalDays: 1,
        attendancePercentage: {
          $multiply: [
            { $divide: ['$totalPresent', '$totalDays'] },
            100
          ]
        }
      }
    }
  ]);

  return records;
};

/**
 * Get daily attendance report
 */
attendanceSchema.statics.getDailyReport = async function(date, className) {
  const match = { date: new Date(date) };
  
  if (className) {
    match['studentInfo.grade'] = className;
  }

  return this.aggregate([
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
      $match: match
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

/**
 * Sync offline attendance records
 */
attendanceSchema.statics.syncOfflineRecords = async function(offlineRecords) {
  const results = {
    synced: [],
    conflicts: [],
    errors: []
  };

  for (const record of offlineRecords) {
    try {
      const existing = await this.findOne({ offlineId: record.offlineId });

      if (existing) {
        // Update existing record
        existing.status = record.status;
        existing.remarks = record.remarks;
        existing.synced = true;
        await existing.save();
        results.synced.push(existing);
      } else {
        // Create new record
        const attendance = new this({
          ...record,
          synced: true
        });
        await attendance.save();
        results.synced.push(attendance);
      }
    } catch (error) {
      results.errors.push({ offlineId: record.offlineId, error: error.message });
    }
  }

  return results;
};

module.exports = mongoose.model('Attendance', attendanceSchema);
