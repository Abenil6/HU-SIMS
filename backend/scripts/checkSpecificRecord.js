const mongoose = require('mongoose');
const AcademicRecord = require('../models/AcademicRecord');
require('dotenv').config();

async function checkSpecific() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const record = await AcademicRecord.findById('69db46facf5d8b1811062c8e');
    console.log('Specific record:', {
      id: record._id,
      student: record.student,
      teacher: record.teacher,
      subject: record.subject,
      gradeLevel: record.gradeLevel,
      semester: record.semester,
      academicYear: record.academicYear,
    });
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkSpecific();
