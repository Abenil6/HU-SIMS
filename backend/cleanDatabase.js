/**
 * Database Cleanup Script - Removes all users except System Admin
 * Run with: node cleanDatabase.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function cleanDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Count total users
    const totalUsers = await User.countDocuments();
    console.log(`Total users in database: ${totalUsers}\n`);

    // Find System Admin
    const systemAdmin = await User.findOne({ role: 'SystemAdmin' });
    
    if (!systemAdmin) {
      console.log('⚠️  No System Admin found. Cannot proceed with cleanup.');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('System Admin found:');
    console.log(`Email: ${systemAdmin.email}`);
    console.log(`Username: ${systemAdmin.username}\n`);

    // Delete all users except System Admin
    const deleteResult = await User.deleteMany({ 
      email: { $ne: systemAdmin.email },
      role: { $ne: 'SystemAdmin' }
    });

    console.log(`✅ Deleted ${deleteResult.deletedCount} users`);
    console.log(`✅ Kept 1 System Admin (${systemAdmin.email})\n`);

    // Verify cleanup
    const remainingUsers = await User.countDocuments();
    console.log(`Remaining users in database: ${remainingUsers}\n`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanDatabase();
