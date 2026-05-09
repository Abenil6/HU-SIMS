const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const AcademicRecord = require('./models/AcademicRecord');

async function finalFix() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const students = await User.find({ role: 'Student' });
    
    for (const student of students) {
      let updated = false;
      
      // 1. Ensure status is Active
      if (student.status !== 'Active') {
        student.status = 'Active';
        updated = true;
      }

      // 2. Ensure academic year is set
      if (student.studentProfile.academicYear !== '2025-2026') {
        student.studentProfile.academicYear = '2025-2026';
        updated = true;
      }

      // 3. Ensure grade is present
      if (!student.studentProfile.grade) {
        student.studentProfile.grade = student.grade || '9';
        updated = true;
      }

      // 4. Ensure stream is present for Grade 11 & 12
      const gradeNum = parseInt(student.studentProfile.grade, 10);
      if (gradeNum >= 11 && !student.studentProfile.stream) {
        student.studentProfile.stream = 'Natural Science';
        updated = true;
      }

      if (updated) {
        await student.save();
        console.log(`Updated profile for: ${student.firstName} ${student.lastName}`);
      }
    }

    // 5. Check Academic Records for null students or fields
    const records = await AcademicRecord.find({}).populate('student');
    let recordFixes = 0;
    for (const record of records) {
      if (!record.student) {
        // Orphaned record - delete it
        await AcademicRecord.findByIdAndDelete(record._id);
        recordFixes++;
      } else if (!record.gradeLevel) {
        record.gradeLevel = record.student.studentProfile?.grade || '9';
        await record.save();
        recordFixes++;
      }
    }
    console.log(`Cleaned up ${recordFixes} orphaned or incomplete records.`);

    const finalCount = await User.countDocuments({ role: 'Student', status: 'Active' });
    const finalWithGrades = await AcademicRecord.distinct('student');
    
    console.log('\nDeployment Complete:');
    console.log(`- Active Students: ${finalCount}`);
    console.log(`- Students with Grades: ${finalWithGrades.length}`);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

finalFix();
