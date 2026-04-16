const mongoose = require('mongoose');
const AcademicRecord = require('../models/AcademicRecord');
const User = require('../models/User');

require('dotenv').config();

async function checkAcademicMarks() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    const records = await AcademicRecord.find({}).limit(5);
    console.log(`Total academic records: ${records.length}\n`);
    
    for (const record of records) {
      console.log(`Record ID: ${record._id}`);
      console.log(`  Subject: ${record.subject}`);
      console.log(`  Student ID: ${record.student}`);
      console.log(`  Total Marks: ${record.totalMarks}`);
      console.log(`  Marks:`, record.marks);
      console.log(`  Status: ${record.status}`);
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

checkAcademicMarks();
