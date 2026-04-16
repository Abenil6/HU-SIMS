const mongoose = require('mongoose');
const AcademicRecord = require('../models/AcademicRecord');
require('dotenv').config();

async function checkRecords() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const records = await AcademicRecord.find({}).limit(5);
    console.log('Sample records:', records.map(r => ({
      id: r._id,
      student: r.student,
      teacher: r.teacher,
      subject: r.subject,
      gradeLevel: r.gradeLevel,
    })));

    const nullStudentRecords = await AcademicRecord.find({ student: null }).limit(5);
    console.log('Records with null student:', nullStudentRecords.length);
    
    const nullTeacherRecords = await AcademicRecord.find({ teacher: null }).limit(5);
    console.log('Records with null teacher:', nullTeacherRecords.length);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkRecords();
