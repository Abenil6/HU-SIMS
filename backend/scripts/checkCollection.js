const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function checkCollection() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('User model name:', User.modelName);
    console.log('User collection name:', User.collection.name);

    // Count all users
    const allUsersCount = await User.countDocuments({});
    console.log('Total users in User collection:', allUsersCount);

    // Count students
    const studentsCount = await User.countDocuments({ role: 'Student' });
    console.log('Total students in User collection:', studentsCount);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkCollection();
