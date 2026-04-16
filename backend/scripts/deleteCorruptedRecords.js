const mongoose = require('mongoose');
const AcademicRecord = require('../models/AcademicRecord');
const User = require('../models/User');
require('dotenv').config();

async function deleteCorrupted() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get all academic records
    const allRecords = await AcademicRecord.find({});
    console.log(`Total academic records: ${allRecords.length}`);

    let deletedCount = 0;
    let keptCount = 0;

    for (const record of allRecords) {
      // Check if student exists
      const student = await User.findById(record.student);
      // Check if teacher exists
      const teacher = await User.findById(record.teacher);

      if (!student || !teacher) {
        console.log(`Deleting corrupted record ${record._id}:`, {
          studentExists: !!student,
          teacherExists: !!teacher,
          subject: record.subject,
        });
        await AcademicRecord.findByIdAndDelete(record._id);
        deletedCount++;
      } else {
        keptCount++;
      }
    }

    console.log(`\n✅ Deleted ${deletedCount} corrupted records`);
    console.log(`✅ Kept ${keptCount} valid records`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteCorrupted();
