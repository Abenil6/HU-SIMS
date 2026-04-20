/**
 * Database Diagnostic Script
 * Run with: node checkDatabase.js
 * 
 * This script checks:
 * - Database connection
 * - Total users count
 * - Teachers in the database
 * - Specific teacher lookup by ID
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function checkDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Check total users
    const totalUsers = await User.countDocuments();
    console.log(`Total users in database: ${totalUsers}\n`);
    
    // Check teachers
    const teachers = await User.find({ role: 'Teacher' }).select('_id firstName lastName email');
    console.log(`Teachers in database: ${teachers.length}`);
    if (teachers.length > 0) {
      console.log('\nTeacher list:');
      teachers.forEach(t => {
        console.log(`  - ID: ${t._id}, Name: ${t.firstName} ${t.lastName}, Email: ${t.email}`);
      });
    } else {
      console.log('⚠️  No teachers found in database!');
    }
    
    // Check specific ID if provided
    const specificId = process.env.CHECK_ID || '69e6947eadd055792e411439';
    console.log(`\nChecking for specific ID: ${specificId}`);
    const specificUser = await User.findOne({ _id: specificId });
    if (specificUser) {
      console.log(`✅ Found user: ${specificUser.firstName} ${specificUser.lastName}, Role: ${specificUser.role}`);
    } else {
      console.log('❌ User not found with this ID');
      
      // Try raw collection lookup
      const col = mongoose.connection.db.collection('users');
      const rawUser = await col.findOne({ _id: specificId });
      if (rawUser) {
        console.log(`✅ Found in raw collection: ${rawUser.firstName} ${rawUser.lastName}, Role: ${rawUser.role}`);
      } else {
        console.log('❌ Not found in raw collection either');
      }
    }
    
    // Check users by role
    console.log('\nUsers by role:');
    const roles = ['SystemAdmin', 'SchoolAdmin', 'Teacher', 'Student', 'Parent'];
    for (const role of roles) {
      const count = await User.countDocuments({ role });
      console.log(`  ${role}: ${count}`);
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Database check completed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();
