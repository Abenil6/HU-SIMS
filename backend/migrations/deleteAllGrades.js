/**
 * Script: Delete All Academic Records
 * 
 * WARNING: This script will DELETE ALL academic records from the database.
 * This action cannot be undone.
 * 
 * Run with: node migrations/deleteAllGrades.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

// Connect to MongoDB
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGODB_URL || 'mongodb://localhost:27017/hu-sims';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const AcademicRecord = require('../models/AcademicRecord');

async function deleteAllGrades() {
  try {
    console.log('⚠️  WARNING: This will delete ALL academic records from the database');
    console.log('⚠️  This action cannot be undone!\n');
    
    // Count records first
    const count = await AcademicRecord.countDocuments();
    console.log(`Found ${count} academic records in the database`);
    
    if (count === 0) {
      console.log('No records to delete. Exiting.');
      process.exit(0);
    }
    
    // Confirm deletion
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('Are you sure you want to delete ALL records? (yes/no): ', async (answer) => {
      rl.close();
      
      if (answer.toLowerCase() !== 'yes') {
        console.log('Deletion cancelled.');
        process.exit(0);
      }
      
      console.log('\nDeleting all academic records...');
      
      const result = await AcademicRecord.deleteMany({});
      
      console.log(`✓ Deleted ${result.deletedCount} academic records`);
      console.log('All grades have been removed from the database.');
      
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Deletion failed:', error);
    process.exit(1);
  }
}

// Run deletion
deleteAllGrades();
