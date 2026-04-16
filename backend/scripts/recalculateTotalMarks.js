const mongoose = require('mongoose');
const AcademicRecord = require('../models/AcademicRecord');
require('dotenv').config();

async function recalculateTotalMarks() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all academic records
    const records = await AcademicRecord.find({});
    console.log(`Found ${records.length} academic records`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const record of records) {
      try {
        // Calculate total marks
        const totalMarks =
          (record.marks?.midExam || 0) +
          (record.marks?.finalExam || 0) +
          (record.marks?.classQuiz || 0) +
          (record.marks?.continuousAssessment || 0) +
          (record.marks?.assignment || 0);

        // Only update if totalMarks is different
        if (record.totalMarks !== totalMarks) {
          record.totalMarks = totalMarks;
          await record.save();
          updatedCount++;
          console.log(`Updated ${record.subject} for student ${record.student}: ${record.totalMarks} → ${totalMarks}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`Error updating record ${record._id}:`, error.message);
      }
    }

    console.log(`\nRecalculation complete:`);
    console.log(`- Total records processed: ${records.length}`);
    console.log(`- Records updated: ${updatedCount}`);
    console.log(`- Errors: ${errorCount}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

recalculateTotalMarks();
