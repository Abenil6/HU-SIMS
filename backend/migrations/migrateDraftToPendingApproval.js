/**
 * Migration Script: Update Draft grades to Pending Approval
 * 
 * This script updates all existing academic records with status "Draft"
 * to "Pending Approval" so they can be reviewed and approved by SchoolAdmins.
 * 
 * Run with: node migrations/migrateDraftToPendingApproval.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL || 'mongodb://localhost:27017/hu-sims';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const AcademicRecord = require('../models/AcademicRecord');

async function migrateDraftToPendingApproval() {
  try {
    console.log('Starting migration: Draft -> Pending Approval');
    
    // Find all records with status "Draft"
    const draftRecords = await AcademicRecord.find({ status: 'Draft' });
    console.log(`Found ${draftRecords.length} records with status "Draft"`);
    
    if (draftRecords.length === 0) {
      console.log('No Draft records found. Migration complete.');
      process.exit(0);
    }
    
    // Update all Draft records to Pending Approval
    const result = await AcademicRecord.updateMany(
      { status: 'Draft' },
      { status: 'Pending Approval' }
    );
    
    console.log(`Updated ${result.modifiedCount} records from "Draft" to "Pending Approval"`);
    console.log('Migration completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateDraftToPendingApproval();
