const mongoose = require('mongoose');
const Permission = require('../models/Permission');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Permission.initializeDefaultPermissions();
    console.log('MongoDB Atlas connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
