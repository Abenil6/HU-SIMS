/**
 * DEBUG SCRIPT — run once then delete
 * Usage: node debugTeachers.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to:', process.env.MONGO_URI.replace(/:\/\/.*@/, '://***@'));

  const users = await mongoose.connection.db
    .collection('users')
    .find({})
    .project({ _id: 1, role: 1, firstName: 1, lastName: 1, email: 1 })
    .toArray();

  const teachers = users.filter(u => u.role === 'Teacher');
  const nonTeachers = users.filter(u => u.role !== 'Teacher');

  console.log(`\n=== ALL USERS (${users.length} total) ===`);
  console.log(`  Teachers: ${teachers.length}`);
  console.log(`  Others: ${nonTeachers.map(u => u.role).join(', ')}`);

  if (teachers.length === 0) {
    console.log('\n⚠️  NO USERS WITH role="Teacher" FOUND!');
    console.log('\nAll roles in DB:');
    const roleCounts = {};
    users.forEach(u => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1; });
    console.table(roleCounts);
  } else {
    console.log('\n=== TEACHER IDs (paste one to test PUT) ===');
    teachers.forEach(t => {
      console.log(`  _id: ${t._id}  |  ${t.firstName} ${t.lastName}  |  ${t.email}`);
    });
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
