const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function listStudents() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const students = await User.find({ role: 'Student' }).select('_id firstName lastName username studentProfile');
    console.log(`Total students in database: ${students.length}`);
    students.forEach(s => {
      console.log({
        id: s._id,
        firstName: s.firstName,
        lastName: s.lastName,
        username: s.username,
        studentId: s.studentProfile?.studentId,
        grade: s.studentProfile?.grade,
      });
    });
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

listStudents();
