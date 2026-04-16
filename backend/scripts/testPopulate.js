const mongoose = require('mongoose');
const User = require('../models/User');
const AcademicRecord = require('../models/AcademicRecord');
require('dotenv').config();

async function testPopulate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const record = await AcademicRecord.findOne({ subject: 'English' }).sort({ createdAt: -1 });
    console.log('Record before populate:', {
      id: record._id,
      student: record.student,
      teacher: record.teacher,
    });

    // Test populate
    const populated = await AcademicRecord.findOne({ subject: 'English' })
      .populate('student', 'firstName lastName')
      .populate('teacher', 'firstName lastName')
      .sort({ createdAt: -1 });

    console.log('\nRecord after populate:', {
      id: populated._id,
      student: populated.student,
      teacher: populated.teacher,
    });

    if (populated.student) {
      console.log('Student name:', populated.student.firstName, populated.student.lastName);
    } else {
      console.log('Student is null after populate');
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testPopulate();
