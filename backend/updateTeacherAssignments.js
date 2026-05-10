const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

async function updateTeacherAssignments(teacherEmail, subjects, classes) {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const teacher = await User.findOne({ email: teacherEmail, role: 'Teacher' });
    
    if (!teacher) {
      console.log(`Teacher with email ${teacherEmail} not found`);
      process.exit(1);
    }

    console.log(`\nCurrent assignments for ${teacher.firstName} ${teacher.lastName}:`);
    console.log('  Subjects:', teacher.teacherProfile?.subjects || []);
    console.log('  Classes:', teacher.teacherProfile?.classes || []);

    // Update subjects
    teacher.teacherProfile.subjects = subjects;
    teacher.teacherProfile.subject = subjects[0] || '';

    // Update classes
    teacher.teacherProfile.classes = classes;

    await teacher.save();

    console.log(`\n✓ Updated assignments for ${teacher.firstName} ${teacher.lastName}:`);
    console.log('  Subjects:', teacher.teacherProfile.subjects);
    console.log('  Classes:', teacher.teacherProfile.classes);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const teacherEmail = args[0];

if (!teacherEmail) {
  console.log('Usage: node updateTeacherAssignments.js <teacher_email>');
  console.log('\nExample: node updateTeacherAssignments.js teacher@school.com');
  console.log('\nThis will update the teacher to have English subject and Grade 11-12 classes');
  process.exit(1);
}

// Default assignments for English and Grade 11-12
const subjects = ['English'];
const classes = [
  { grade: '11', stream: 'Natural' },
  { grade: '12', stream: 'Social' }
];

updateTeacherAssignments(teacherEmail, subjects, classes);
