const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema(
  {
    class: {
      type: String,
      required: true
    },
    section: {
      type: String
    },
    // Preferred field for Grade 11-12 specialization.
    stream: {
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
    schedule: [{
      day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        required: true
      },
      period: {
        type: Number,
        required: true,
        min: 1,
        max: 8
      },
      subject: {
        type: String,
        required: true
      },
      teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      room: {
        type: String
      },
      startTime: {
        type: String
      },
      endTime: {
        type: String
      }
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ['Draft', 'Published'],
      default: 'Draft'
    },
    version: {
      type: Number,
      default: 1
    },
    versionGroup: {
      type: String
    },
    isLocked: {
      type: Boolean,
      default: false
    },
    generatedBySystem: {
      type: Boolean,
      default: false
    },
    generationWarnings: [{
      type: String
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

// Indexes
timetableSchema.index({ class: 1, academicYear: 1, semester: 1 });
timetableSchema.index({ class: 1, stream: 1, academicYear: 1, semester: 1, version: -1 });
timetableSchema.index({ 'schedule.teacher': 1 });
timetableSchema.index({ academicYear: 1, semester: 1 });

/**
 * Check for scheduling conflicts
 */
timetableSchema.methods.hasConflict = function(newEntry) {
  return this.schedule.some(entry => 
    entry.day === newEntry.day &&
    entry.period === newEntry.period &&
    entry.teacher.toString() === newEntry.teacher.toString()
  );
};

/**
 * Get schedule for a specific day
 */
timetableSchema.methods.getDaySchedule = function(day) {
  return this.schedule.filter(entry => entry.day === day)
    .sort((a, b) => a.period - b.period);
};

/**
 * Get teacher schedule for a specific day
 */
timetableSchema.statics.getTeacherSchedule = async function(teacherId, academicYear, semester) {
  const timetables = await this.find({ academicYear, semester, isActive: true });
  
  const teacherSchedule = [];
  timetables.forEach(timetable => {
    timetable.schedule.forEach(entry => {
      if (entry.teacher.toString() === teacherId.toString()) {
        teacherSchedule.push({
          day: entry.day,
          period: entry.period,
          subject: entry.subject,
          class: timetable.class,
          section: timetable.section,
          room: entry.room,
          startTime: entry.startTime,
          endTime: entry.endTime
        });
      }
    });
  });

  return teacherSchedule.sort((a, b) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCompare = days.indexOf(a.day) - days.indexOf(b.day);
    if (dayCompare !== 0) return dayCompare;
    return a.period - b.period;
  });
};

/**
 * Get class schedule
 */
timetableSchema.statics.getClassSchedule = async function(className, academicYear, semester) {
  return this.findOne({ 
    class: className, 
    academicYear, 
    semester,
    isActive: true 
  }).populate('schedule.teacher', 'firstName lastName subject');
};

module.exports = mongoose.model('Timetable', timetableSchema);
