const mongoose = require('mongoose');

const schoolClassSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    grade: {
      type: String,
      required: true,
      trim: true,
    },
    stream: {
      type: String,
      default: '',
      trim: true,
    },
    academicYear: {
      type: String,
      default: '',
      trim: true,
    },
    capacity: {
      type: Number,
      default: 45,
      min: 1,
    },
    classTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    subjects: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
);

schoolClassSchema.index({ grade: 1, stream: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('SchoolClass', schoolClassSchema);
