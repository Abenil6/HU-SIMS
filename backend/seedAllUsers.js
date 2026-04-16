/**
 * Comprehensive Seed Script - Creates all test users for SIMS
 * Run with: node seedAllUsers.js
 *
 * Notes:
 * - Non-destructive by default: does NOT delete existing users.
 * - Existing SystemAdmin and SchoolAdmin are preserved.
 * - To force a full reset, run with RESET_USERS=true.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

const DEFAULT_PASSWORD = 'admin123';
const RESET_USERS = process.env.RESET_USERS === 'true';

// Keep your original top entries.
const coreUsers = [
  {
    email: 'admin@school.com',
    username: 'admin',
    password: DEFAULT_PASSWORD,
    firstName: 'System',
    lastName: 'Admin',
    role: 'SystemAdmin'
  },
  {
    email: 'schooladmin@school.com',
    username: 'schooladmin',
    password: DEFAULT_PASSWORD,
    firstName: 'School',
    lastName: 'Administrator',
    role: 'SchoolAdmin'
  },
  {
    email: 'teacher@school.com',
    username: 'teacher',
    password: DEFAULT_PASSWORD,
    firstName: 'John',
    lastName: 'Teacher',
    role: 'Teacher',
    teacherProfile: {
      department: 'Mathematics',
      subjects: ['Mathematics'],
      qualifications: ['BSc Mathematics'],
      classes: [{ grade: '9' }, { grade: '10' }]
    }
  },
  {
    email: 'student@school.com',
    username: 'student',
    password: DEFAULT_PASSWORD,
    firstName: 'Jane',
    lastName: 'Student',
    role: 'Student',
    studentProfile: {
      grade: '9',
      stream: '',
      academicYear: '2025-2026',
      gender: 'Female'
    }
  },
  {
    email: 'parent@school.com',
    username: 'parent',
    password: DEFAULT_PASSWORD,
    firstName: 'Bob',
    lastName: 'Parent',
    role: 'Parent',
    parentProfile: {
      occupation: 'Engineer',
      preferredContactMethod: 'Email'
    }
  }
];

const extraTeachers = [
  {
    email: 'sam.math@school.com',
    username: 'sam.math',
    firstName: 'Samuel',
    lastName: 'Mekonnen',
    role: 'Teacher',
    teacherProfile: {
      department: 'Mathematics',
      subjects: ['Mathematics'],
      qualifications: ['BSc Mathematics'],
      classes: [{ grade: '9' }, { grade: '11', stream: 'Natural' }]
    }
  },
  {
    email: 'hana.english@school.com',
    username: 'hana.english',
    firstName: 'Hana',
    lastName: 'Bekele',
    role: 'Teacher',
    teacherProfile: {
      department: 'Languages',
      subjects: ['English'],
      qualifications: ['BA English'],
      classes: [{ grade: '9' }, { grade: '10' }, { grade: '12', stream: 'Social' }]
    }
  },
  {
    email: 'abel.physics@school.com',
    username: 'abel.physics',
    firstName: 'Abel',
    lastName: 'Tadesse',
    role: 'Teacher',
    teacherProfile: {
      department: 'Science',
      subjects: ['Physics'],
      qualifications: ['BSc Physics'],
      classes: [{ grade: '10' }, { grade: '11', stream: 'Natural' }, { grade: '12', stream: 'Natural' }]
    }
  },
  {
    email: 'meli.chem@school.com',
    username: 'meli.chem',
    firstName: 'Melek',
    lastName: 'Kebede',
    role: 'Teacher',
    teacherProfile: {
      department: 'Science',
      subjects: ['Chemistry'],
      qualifications: ['BSc Chemistry'],
      classes: [{ grade: '10' }, { grade: '11', stream: 'Natural' }]
    }
  },
  {
    email: 'yonas.bio@school.com',
    username: 'yonas.bio',
    firstName: 'Yonas',
    lastName: 'Girma',
    role: 'Teacher',
    teacherProfile: {
      department: 'Science',
      subjects: ['Biology'],
      qualifications: ['BSc Biology'],
      classes: [{ grade: '9' }, { grade: '11', stream: 'Natural' }]
    }
  },
  {
    email: 'sara.social@school.com',
    username: 'sara.social',
    firstName: 'Sara',
    lastName: 'Tesfaye',
    role: 'Teacher',
    teacherProfile: {
      department: 'Social Science',
      subjects: ['Geography', 'History', 'Civics'],
      qualifications: ['BA Social Studies'],
      classes: [{ grade: '9' }, { grade: '10' }]
    }
  },
  {
    email: 'nahom.econ@school.com',
    username: 'nahom.econ',
    firstName: 'Nahom',
    lastName: 'Demissie',
    role: 'Teacher',
    teacherProfile: {
      department: 'Social Science',
      subjects: ['Economics', 'Civics'],
      qualifications: ['BA Economics'],
      classes: [{ grade: '11', stream: 'Social' }, { grade: '12', stream: 'Social' }]
    }
  },
  {
    email: 'mimi.ict@school.com',
    username: 'mimi.ict',
    firstName: 'Mimi',
    lastName: 'Wolde',
    role: 'Teacher',
    teacherProfile: {
      department: 'Technology',
      subjects: ['Information Communication Technology (ICT)', 'Physical and Health Education (HPE)'],
      qualifications: ['BSc Computer Science'],
      classes: [{ grade: '9' }, { grade: '10' }, { grade: '11', stream: 'Social' }, { grade: '12', stream: 'Natural' }]
    }
  }
];

const extraParents = [
  { email: 'alemu.parent@school.com', username: 'alemu.parent', firstName: 'Alemu', lastName: 'Kassa', occupation: 'Merchant' },
  { email: 'rahel.parent@school.com', username: 'rahel.parent', firstName: 'Rahel', lastName: 'Mulu', occupation: 'Nurse' },
  { email: 'dawit.parent@school.com', username: 'dawit.parent', firstName: 'Dawit', lastName: 'Lema', occupation: 'Accountant' },
  { email: 'sara.parent@school.com', username: 'sara.parent', firstName: 'Saron', lastName: 'Abebe', occupation: 'Teacher' },
  { email: 'marta.parent@school.com', username: 'marta.parent', firstName: 'Marta', lastName: 'Getachew', occupation: 'Banker' },
  { email: 'mulu.parent@school.com', username: 'mulu.parent', firstName: 'Mulu', lastName: 'Negash', occupation: 'Government Employee' },
  { email: 'eyob.parent@school.com', username: 'eyob.parent', firstName: 'Eyob', lastName: 'Fekadu', occupation: 'Driver' },
  { email: 'liya.parent@school.com', username: 'liya.parent', firstName: 'Liya', lastName: 'Berhe', occupation: 'Doctor' }
].map((p) => ({
  email: p.email,
  username: p.username,
  password: DEFAULT_PASSWORD,
  firstName: p.firstName,
  lastName: p.lastName,
  role: 'Parent',
  parentProfile: {
    occupation: p.occupation,
    preferredContactMethod: 'Email'
  }
}));

const extraStudents = [
  { firstName: 'Aster', lastName: 'Tilahun', email: 'aster.g9@school.com', username: 'aster.g9', grade: '9', stream: '', gender: 'Female' },
  { firstName: 'Biruk', lastName: 'Hailu', email: 'biruk.g9@school.com', username: 'biruk.g9', grade: '9', stream: '', gender: 'Male' },
  { firstName: 'Naod', lastName: 'Tsegaye', email: 'naod.g9@school.com', username: 'naod.g9', grade: '9', stream: '', gender: 'Male' },
  { firstName: 'Selam', lastName: 'Mekuria', email: 'selam.g9@school.com', username: 'selam.g9', grade: '9', stream: '', gender: 'Female' },
  { firstName: 'Miki', lastName: 'Ayalew', email: 'miki.g10@school.com', username: 'miki.g10', grade: '10', stream: '', gender: 'Male' },
  { firstName: 'Ruth', lastName: 'Kiros', email: 'ruth.g10@school.com', username: 'ruth.g10', grade: '10', stream: '', gender: 'Female' },
  { firstName: 'Henok', lastName: 'Gebre', email: 'henok.g10@school.com', username: 'henok.g10', grade: '10', stream: '', gender: 'Male' },
  { firstName: 'Tsion', lastName: 'Asefa', email: 'tsion.g10@school.com', username: 'tsion.g10', grade: '10', stream: '', gender: 'Female' },
  { firstName: 'Kaleb', lastName: 'Mamo', email: 'kaleb.g11n@school.com', username: 'kaleb.g11n', grade: '11', stream: 'Natural', gender: 'Male' },
  { firstName: 'Lidiya', lastName: 'Kifle', email: 'lidiya.g11n@school.com', username: 'lidiya.g11n', grade: '11', stream: 'Natural', gender: 'Female' },
  { firstName: 'Danait', lastName: 'Yimer', email: 'danait.g11s@school.com', username: 'danait.g11s', grade: '11', stream: 'Social', gender: 'Female' },
  { firstName: 'Meron', lastName: 'Desta', email: 'meron.g11s@school.com', username: 'meron.g11s', grade: '11', stream: 'Social', gender: 'Female' },
  { firstName: 'Nati', lastName: 'Tesema', email: 'nati.g12n@school.com', username: 'nati.g12n', grade: '12', stream: 'Natural', gender: 'Male' },
  { firstName: 'Eden', lastName: 'Goshu', email: 'eden.g12n@school.com', username: 'eden.g12n', grade: '12', stream: 'Natural', gender: 'Female' },
  { firstName: 'Fitsum', lastName: 'Arega', email: 'fitsum.g12s@school.com', username: 'fitsum.g12s', grade: '12', stream: 'Social', gender: 'Male' },
  { firstName: 'Mahi', lastName: 'Belay', email: 'mahi.g12s@school.com', username: 'mahi.g12s', grade: '12', stream: 'Social', gender: 'Female' }
].map((s) => ({
  email: s.email,
  username: s.username,
  password: DEFAULT_PASSWORD,
  firstName: s.firstName,
  lastName: s.lastName,
  role: 'Student',
  studentProfile: {
    grade: s.grade,
    stream: s.stream,
    academicYear: '2025-2026',
    gender: s.gender
  }
}));

const allUsers = [
  ...coreUsers,
  ...extraTeachers,
  ...extraParents,
  ...extraStudents
];

const parentStudentLinks = [
  { parentEmail: 'parent@school.com', studentEmail: 'student@school.com' },
  { parentEmail: 'alemu.parent@school.com', studentEmail: 'aster.g9@school.com' },
  { parentEmail: 'rahel.parent@school.com', studentEmail: 'biruk.g9@school.com' },
  { parentEmail: 'dawit.parent@school.com', studentEmail: 'selam.g9@school.com' },
  { parentEmail: 'sara.parent@school.com', studentEmail: 'miki.g10@school.com' },
  { parentEmail: 'marta.parent@school.com', studentEmail: 'henok.g10@school.com' },
  { parentEmail: 'mulu.parent@school.com', studentEmail: 'kaleb.g11n@school.com' },
  { parentEmail: 'eyob.parent@school.com', studentEmail: 'danait.g11s@school.com' },
  { parentEmail: 'liya.parent@school.com', studentEmail: 'fitsum.g12s@school.com' },
  { parentEmail: 'liya.parent@school.com', studentEmail: 'eden.g12n@school.com' }
];

async function createUserIfMissing(userData) {
  const existing = await User.findOne({ email: userData.email });
  if (existing) {
    return { user: existing, created: false };
  }

  const hashedPassword = await bcrypt.hash(userData.password || DEFAULT_PASSWORD, 10);
  const user = new User({
    ...userData,
    password: hashedPassword,
    status: 'Active',
    isVerified: true,
    mustSetPassword: false
  });

  await user.save();
  return { user, created: true };
}

async function linkParentToStudent(parentEmail, studentEmail) {
  const parent = await User.findOne({ email: parentEmail, role: 'Parent' });
  const student = await User.findOne({ email: studentEmail, role: 'Student' });
  if (!parent || !student) return false;

  await User.updateOne(
    { _id: parent._id },
    { $addToSet: { 'parentProfile.linkedChildren': student._id } }
  );
  await User.updateOne(
    { _id: student._id },
    { $addToSet: { 'studentProfile.linkedParents': parent._id } }
  );
  return true;
}

async function seedAllUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    if (RESET_USERS) {
      const deleteResult = await User.deleteMany({});
      console.log(`RESET_USERS=true -> deleted ${deleteResult.deletedCount} users\n`);
    } else {
      console.log('Non-destructive mode: existing users are kept\n');
    }

    let createdCount = 0;
    let skippedCount = 0;

    for (const userData of allUsers) {
      const { created } = await createUserIfMissing(userData);
      if (created) {
        createdCount += 1;
        console.log(`+ Created ${userData.role}: ${userData.email} / ${userData.password || DEFAULT_PASSWORD}`);
      } else {
        skippedCount += 1;
        console.log(`- Kept existing ${userData.role}: ${userData.email}`);
      }
    }

    let linkedCount = 0;
    for (const link of parentStudentLinks) {
      const linked = await linkParentToStudent(link.parentEmail, link.studentEmail);
      if (linked) linkedCount += 1;
    }

    console.log('\n========================================');
    console.log('Seed completed successfully');
    console.log(`Created: ${createdCount}, Kept: ${skippedCount}, Links: ${linkedCount}`);
    console.log('========================================\n');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

seedAllUsers();
