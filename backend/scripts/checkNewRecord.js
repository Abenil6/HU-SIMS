const mongoose = require('mongoose');
const AcademicRecord = require('../models/AcademicRecord');
const User = require('../models/User');
require('dotenv').config();

async function checkNewRecord() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const record = await AcademicRecord.findOne({ subject: 'English' }).sort({ createdAt: -1 });
    console.log('Latest English record:', {
      id: record._id,
      student: record.student,
      studentType: typeof record.student,
      teacher: record.teacher,
      teacherType: typeof record.teacher,
      subject: record.subject,
    });

    // Try to find the student using the exact ID from the record
    const student = await User.findById(record.student);
    console.log('\nStudent found by record.student:', !!student);

    // Try to find the student using the ID as a string
    const studentString = await User.findById(String(record.student));
    console.log('Student found by String(record.student):', !!studentString);
    
    // Try using new ObjectId
    const studentObjectId = await User.findById(new mongoose.Types.ObjectId(record.student));
    console.log('Student found by new ObjectId:', !!studentObjectId);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkNewRecord();
