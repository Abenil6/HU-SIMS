/**
 * Seed Script - Creates a default admin user for testing
 * Run with: node seedAdmin.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, required: true, enum: ['SystemAdmin', 'SchoolAdmin', 'Teacher', 'Student', 'Parent'] },
  status: { type: String, default: 'Active' },
  isVerified: { type: Boolean, default: true },
  mustSetPassword: { type: Boolean, default: false },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@school.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      console.log('Email: admin@school.com');
      console.log('Password: admin123');
      process.exit(0);
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = new User({
      email: 'admin@school.com',
      username: 'admin',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: 'SystemAdmin',
      status: 'Active',
      isVerified: true,
      mustSetPassword: false
    });

    await admin.save();
    console.log('Admin user created successfully!');
    console.log('Email: admin@school.com');
    console.log('Password: admin123');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

seedAdmin();
