const mongoose = require('mongoose');
const AcademicRecord = require('../models/AcademicRecord');
const User = require('../models/User');

require('dotenv').config();

async function checkAcademicRecordStudent() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    const records = await AcademicRecord.find({}).limit(5);
    console.log(`Total academic records: ${records.length}\n`);
    
    for (const record of records) {
      const studentId = record.student;
      const student = await User.findById(studentId);
      
      console.log(`Record ID: ${record._id}`);
      console.log(`  Student ID: ${studentId}`);
      console.log(`  Subject: ${record.subject}`);
      console.log(`  Student exists: ${!!student}`);
      if (student) {
        console.log(`  Student Name: ${student.firstName} ${student.lastName}`);
      }
      console.log('');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkAcademicRecordStudent();
