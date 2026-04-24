/**
 * Migration Script: Create 2025-2026 Academic Year
 * 
 * This script creates the 2025-2026 academic year if it doesn't exist.
 * 
 * Run with: node migrations/createAcademicYear.js
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

const AcademicYear = require('../models/AcademicYear');

async function createAcademicYear() {
  try {
    console.log('Checking if 2025-2026 academic year exists...');
    
    // Check if it already exists
    const existingYear = await AcademicYear.findOne({ year: '2025-2026' });
    if (existingYear) {
      console.log('2025-2026 academic year already exists.');
      console.log('ID:', existingYear._id);
      console.log('Active:', existingYear.isActive);
      process.exit(0);
    }
    
    // Create the academic year
    const academicYear = await AcademicYear.create({
      year: '2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-07-31',
      isActive: false,
      status: 'Active',
      semesters: [
        {
          name: 'Semester 1',
          startDate: '2025-09-01',
          endDate: '2026-01-31',
          examPeriodStart: '2026-01-15',
          examPeriodEnd: '2026-01-31',
          resultDate: '2026-02-15'
        },
        {
          name: 'Semester 2',
          startDate: '2026-02-01',
          endDate: '2026-07-31',
          examPeriodStart: '2026-07-01',
          examPeriodEnd: '2026-07-15',
          resultDate: '2026-07-31'
        }
      ]
    });
    
    console.log('2025-2026 academic year created successfully!');
    console.log('ID:', academicYear._id);
    console.log('Active:', academicYear.isActive);
    console.log('You can now activate it from the School Settings page.');
    
    process.exit(0);
  } catch (error) {
    console.error('Failed to create academic year:', error);
    process.exit(1);
  }
}

// Run migration
createAcademicYear();
