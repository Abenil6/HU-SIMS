/**
 * Production Seed Script - Creates single SystemAdmin account
 * Run with: node seedProduction.js
 *
 * Environment Variables Required:
 * - MONGO_URI: MongoDB connection string
 * - ADMIN_EMAIL: Admin email (default: admin@school.com)
 * - ADMIN_PASSWORD: Admin password (default: ChangeMe123!)
 * - ADMIN_FIRST_NAME: Admin first name (default: System)
 * - ADMIN_LAST_NAME: Admin last name (default: Admin)
 *
 * Usage:
 * node seedProduction.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

async function seedProductionAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Get admin credentials from environment or use defaults
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@school.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
    const adminFirstName = process.env.ADMIN_FIRST_NAME || 'System';
    const adminLastName = process.env.ADMIN_LAST_NAME || 'Admin';

    console.log('Creating SystemAdmin account...');
    console.log(`Email: ${adminEmail}`);
    console.log(`First Name: ${adminFirstName}`);
    console.log(`Last Name: ${adminLastName}\n`);

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail, role: 'SystemAdmin' });
    
    if (existingAdmin) {
      console.log('⚠️  SystemAdmin already exists with this email.');
      console.log('If you want to recreate it, delete the existing user first or use a different email.');
      console.log('Email:', existingAdmin.email);
      console.log('Username:', existingAdmin.username);
      await mongoose.disconnect();
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create SystemAdmin
    const admin = new User({
      email: adminEmail,
      username: adminEmail.split('@')[0],
      password: hashedPassword,
      firstName: adminFirstName,
      lastName: adminLastName,
      role: 'SystemAdmin',
      status: 'Active',
      isVerified: true,
      mustSetPassword: false
    });

    await admin.save();

    console.log('✅ SystemAdmin created successfully!');
    console.log('\n========================================');
    console.log('Login Credentials:');
    console.log('========================================');
    console.log(`Email:    ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('========================================\n');
    console.log('⚠️  IMPORTANT: Change the password immediately after first login!');
    console.log('========================================\n');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seedProductionAdmin();
