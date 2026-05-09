const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const AcademicRecord = require('./models/AcademicRecord');
const User = require('./models/User');

async function checkStudents() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const totalStudents = await User.countDocuments({ role: 'Student' });
    const studentsWithGrades = await AcademicRecord.distinct('student');
    
    console.log(`Total Students in DB: ${totalStudents}`);
    console.log(`Students with at least one grade: ${studentsWithGrades.length}`);

    const allStudents = await User.find({ role: 'Student' }).select('firstName lastName studentProfile grade stream');
    const missing = allStudents.filter(s => !studentsWithGrades.some(id => String(id) === String(s._id)));

    if (missing.length > 0) {
      console.log('\nStudents missing grades:');
      missing.forEach(s => {
        const grade = s.studentProfile?.grade || s.grade;
        const stream = s.studentProfile?.stream || s.stream;
        console.log(`- ${s.firstName} ${s.lastName} (Grade: ${grade}, Stream: ${stream})`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkStudents();
