const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const AcademicRecord = require('./models/AcademicRecord');

async function syncData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Force all students to the active academic year and Active status
    const studentResult = await User.updateMany(
      { role: 'Student' },
      { 
        $set: { 
          'studentProfile.academicYear': '2025-2026', 
          'status': 'Active' 
        } 
      }
    );
    console.log(`Updated ${studentResult.modifiedCount} student profiles.`);

    // 2. Ensure all academic records are for 2025-2026 and are Approved
    const recordResult = await AcademicRecord.updateMany(
      {}, 
      { $set: { academicYear: '2025-2026', status: 'Approved' } }
    );
    console.log(`Updated ${recordResult.modifiedCount} academic records.`);

    // 3. Diagnostic check
    const totalStudents = await User.countDocuments({ role: 'Student' });
    const studentIdsWithGrades = await AcademicRecord.distinct('student');
    
    console.log('\nFinal Status:');
    console.log(`- Total Students in System: ${totalStudents}`);
    console.log(`- Unique Students with Grades: ${studentIdsWithGrades.length}`);

    if (totalStudents !== studentIdsWithGrades.length) {
        console.log('\nWarning: Discrepancy found!');
        const allStudents = await User.find({ role: 'Student' }).select('_id firstName lastName');
        const missing = allStudents.filter(s => !studentIdsWithGrades.some(id => String(id) === String(s._id)));
        console.log(`Missing grades for ${missing.length} students:`);
        missing.forEach(s => console.log(`- ${s.firstName} ${s.lastName} (${s._id})`));
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

syncData();
