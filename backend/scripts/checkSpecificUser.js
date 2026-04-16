const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function checkSpecificUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const studentId = '69cf0130bfd70fce0987648a';
    const teacherId = '69ce7db107389ec59414de8f';

    console.log('Checking student ID:', studentId);
    const student = await User.findById(studentId).select('firstName lastName role');
    console.log('Student:', student ? { id: student._id, firstName: student.firstName, lastName: student.lastName, role: student.role } : 'Not found');

    console.log('\nChecking teacher ID:', teacherId);
    const teacher = await User.findById(teacherId).select('firstName lastName role');
    console.log('Teacher:', teacher ? { id: teacher._id, firstName: teacher.firstName, lastName: teacher.lastName, role: teacher.role } : 'Not found');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkSpecificUser();
