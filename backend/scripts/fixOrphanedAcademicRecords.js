const mongoose = require('mongoose');
const AcademicRecord = require('../models/AcademicRecord');
const User = require('../models/User');

require('dotenv').config();

async function fixOrphanedAcademicRecords() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Get all academic records
    const allRecords = await AcademicRecord.find({});
    console.log(`Total academic records: ${allRecords.length}`);

    let orphanedCount = 0;
    let fixedCount = 0;

    for (const record of allRecords) {
      const studentId = record.student;
      
      // Check if student exists
      const student = await User.findById(studentId);
      
      if (!student) {
        orphanedCount++;
        console.log(`\n⚠️  Orphaned record found:`);
        console.log(`   Record ID: ${record._id}`);
        console.log(`   Student ID: ${studentId}`);
        console.log(`   Subject: ${record.subject}`);
        console.log(`   Academic Year: ${record.academicYear}`);
        console.log(`   Semester: ${record.semester}`);

        // Delete the orphaned record
        await AcademicRecord.findByIdAndDelete(record._id);
        fixedCount++;
        console.log(`   ✅ Deleted orphaned record`);
      }
    }

    console.log(`\n\nSummary:`);
    console.log(`- Total records checked: ${allRecords.length}`);
    console.log(`- Orphaned records found: ${orphanedCount}`);
    console.log(`- Records deleted: ${fixedCount}`);

    if (orphanedCount === 0) {
      console.log('\n✅ All academic records have valid student references!');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixOrphanedAcademicRecords();
