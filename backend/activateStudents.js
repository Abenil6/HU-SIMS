const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

async function activateAllStudents() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const result = await User.updateMany(
      { role: 'Student', status: 'Pending' },
      { $set: { status: 'Active' } }
    );

    console.log(`Successfully activated ${result.modifiedCount} students.`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

activateAllStudents();
