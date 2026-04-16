const mongoose = require('mongoose');
const AcademicRecord = require('../models/AcademicRecord');
require('dotenv').config();

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const result = await AcademicRecord.deleteMany({
      $or: [
        { student: null },
        { teacher: null }
      ]
    });

    console.log(`✅ Deleted ${result.deletedCount} corrupted academic records`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanup();
