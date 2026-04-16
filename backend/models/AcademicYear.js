const mongoose = require('mongoose');

const academicYearSchema = new mongoose.Schema(
  {
    year: {
      type: String,
      required: true,
      unique: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    semesters: [{
      name: {
        type: String,
        enum: ['Semester 1', 'Semester 2'],
        required: true
      },
      startDate: {
        type: Date,
        required: true
      },
      endDate: {
        type: Date,
        required: true
      },
      examPeriodStart: Date,
      examPeriodEnd: Date,
      resultDate: Date
    }],
    isActive: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['Planning', 'Active', 'Completed'],
      default: 'Planning'
    },
    notes: {
      type: String
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

// Index for efficient queries
academicYearSchema.index({ isActive: 1 });
academicYearSchema.index({ status: 1 });

/**
 * Set this academic year as active (deactivate others)
 */
academicYearSchema.methods.setAsActive = async function() {
  // Deactivate all other academic years
  await this.constructor.updateMany(
    { _id: { $ne: this._id } },
    { isActive: false }
  );
  this.isActive = true;
  return this.save();
};

/**
 * Get the currently active academic year
 */
academicYearSchema.statics.getActiveYear = async function() {
  return this.findOne({ isActive: true });
};

/**
 * Get academic year by year string
 */
academicYearSchema.statics.getByYear = async function(year) {
  return this.findOne({ year });
};

module.exports = mongoose.model('AcademicYear', academicYearSchema);
