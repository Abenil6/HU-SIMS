const mongoose = require('mongoose');
const AcademicRecord = require('../models/AcademicRecord');
require('dotenv').config();

async function findCorrupted() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const studentIds = [
      '69ce7db107389ec59414de91',
      '69cf012ebfd70fce09876482',
      '69cf0130bfd70fce0987648a',
      '69cf012dbfd70fce0987647e',
      '69cf012fbfd70fce09876486'
    ];

    const records = await AcademicRecord.find({
      student: { $in: studentIds },
      subject: 'English'
    });

    console.log(`Found ${records.length} English records for those students`);
    records.forEach(r => {
      console.log({
        id: r._id,
        student: r.student,
        teacher: r.teacher,
        subject: r.subject,
        gradeLevel: r.gradeLevel,
        semester: r.semester,
        academicYear: r.academicYear,
      });
    });

    const corrupted = await AcademicRecord.find({
      $or: [
        { student: null },
        { teacher: null }
      ]
    });

    console.log(`\nTotal corrupted records in database: ${corrupted.length}`);
    corrupted.forEach(r => {
      console.log({
        id: r._id,
        student: r.student,
        teacher: r.teacher,
        subject: r.subject,
        gradeLevel: r.gradeLevel,
      });
    });
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findCorrupted();
