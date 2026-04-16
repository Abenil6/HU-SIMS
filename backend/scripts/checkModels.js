const mongoose = require('mongoose');
const User = require('../models/User');
const AcademicRecord = require('../models/AcademicRecord');
require('dotenv').config();

async function checkModels() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('Mongoose model names:', Object.keys(mongoose.models));
    console.log('\nUser model:', mongoose.models.User ? 'exists' : 'does not exist');
    console.log('AcademicRecord model:', mongoose.models.AcademicRecord ? 'exists' : 'does not exist');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkModels();
