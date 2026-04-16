const mongoose = require('mongoose');
const User = require('../models/User');

require('dotenv').config();

async function checkStudents() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    const students = await User.find({ role: 'Student' });
    console.log(`Total students in database: ${students.length}`);
    
    if (students.length > 0) {
      console.log('\nSample students:');
      students.slice(0, 5).forEach(student => {
        console.log(`- ${student.firstName} ${student.lastName} (${student.email})`);
        console.log(`  ID: ${student._id}`);
        console.log(`  Grade: ${student.studentProfile?.grade}`);
      });
    } else {
      console.log('\n⚠️  No students found in database!');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkStudents();
