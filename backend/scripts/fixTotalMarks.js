const mongoose = require('mongoose');
const AcademicRecord = require('../models/AcademicRecord');

require('dotenv').config();

async function fixTotalMarks() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    const records = await AcademicRecord.find({});
    console.log(`Found ${records.length} academic records\n`);

    let updatedCount = 0;

    for (const record of records) {
      const marks = record.marks || {};
      const totalMarks = 
        (marks.midExam || 0) +
        (marks.finalExam || 0) +
        (marks.classQuiz || 0) +
        (marks.continuousAssessment || 0) +
        (marks.assignment || 0);

      if (record.totalMarks !== totalMarks) {
        record.totalMarks = totalMarks;
        await record.save();
        updatedCount++;
        console.log(`Updated record ${record._id}: ${record.subject} - Total: ${totalMarks}`);
      }
    }

    console.log(`\n✅ Updated ${updatedCount} records`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixTotalMarks();
