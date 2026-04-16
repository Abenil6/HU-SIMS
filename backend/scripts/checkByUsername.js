const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function checkByUsername() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const student = await User.findOne({ username: 'selam.g9' }).select('_id firstName lastName role');
    console.log('Student by username selam.g9:', student ? { id: student._id, firstName: student.firstName, lastName: student.lastName, role: student.role } : 'Not found');

    const teacher = await User.findOne({ username: 'teacher' }).select('_id firstName lastName role');
    console.log('Teacher by username teacher:', teacher ? { id: teacher._id, firstName: teacher.firstName, lastName: teacher.lastName, role: teacher.role } : 'Not found');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkByUsername();
