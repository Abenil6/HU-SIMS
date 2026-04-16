/**
 * Master Seed Script - Seeds ALL data for SIMS
 * This script runs both seedAllData.js and seedMissingData.js in sequence
 * Run with: node seedMaster.js
 */

const { execSync } = require('child_process');

console.log('========================================');
console.log('SIMS Master Seed Script');
console.log('========================================\n');

try {
  console.log('Step 1/2: Running seedAllData.js (users, timetables, grades, attendance, announcements)...');
  execSync('node seedAllData.js', { cwd: __dirname, stdio: 'inherit' });

  console.log('\nStep 2/2: Running seedMissingData.js (messages, certificates, exam schedules, materials, absence alerts)...');
  execSync('node seedMissingData.js', { cwd: __dirname, stdio: 'inherit' });

  console.log('\n========================================');
  console.log('✓ Master seed completed successfully');
  console.log('✓ All data types have been seeded');
  console.log('========================================\n');
} catch (error) {
  console.error('\n✗ Master seed failed:', error.message);
  process.exit(1);
}
