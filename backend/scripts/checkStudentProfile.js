const mongoose = require('mongoose');
const User = require('../models/User');

require('dotenv').config();

async function checkStudentProfile() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    const students = await User.find({ role: 'Student' });
    console.log(`Total students: ${students.length}\n`);
    
    let missingProfile = 0;
    let missingGrade = 0;
    
    students.forEach(student => {
      const hasProfile = !!student.studentProfile;
      const hasGrade = hasProfile && !!student.studentProfile.grade;
      
      if (!hasProfile) missingProfile++;
      if (!hasGrade) missingGrade++;
      
      console.log(`${student.firstName} ${student.lastName} (${student.email})`);
      console.log(`  ID: ${student._id}`);
      console.log(`  Has studentProfile: ${hasProfile}`);
      console.log(`  Grade: ${student.studentProfile?.grade || 'MISSING'}`);
      console.log(`  Stream: ${student.studentProfile?.stream || 'N/A'}`);
      console.log('');
    });
    
    console.log(`\nSummary:`);
    console.log(`- Students missing studentProfile: ${missingProfile}`);
    console.log(`- Students missing grade: ${missingGrade}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkStudentProfile();
