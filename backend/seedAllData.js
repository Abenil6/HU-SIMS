/**
 * Master Seed Script - Users + Timetable + Attendance + Academic Records + Announcements
 * Run with: node seedAllData.js
 */

const { execSync } = require('child_process');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Timetable = require('./models/Timetable');
const Attendance = require('./models/Attendance');
const AcademicRecord = require('./models/AcademicRecord');
const Announcement = require('./models/Announcement');

const ACADEMIC_YEAR = '2025-2026';
const SEMESTER = 'Semester 1';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = [
  { period: 1, startTime: '08:30', endTime: '09:15' },
  { period: 2, startTime: '09:15', endTime: '10:00' },
  { period: 3, startTime: '10:00', endTime: '10:45' },
  { period: 4, startTime: '11:00', endTime: '11:45' },
  { period: 5, startTime: '11:45', endTime: '12:30' },
  { period: 6, startTime: '14:30', endTime: '15:15' },
  { period: 7, startTime: '15:15', endTime: '16:00' }
];

const SUBJECTS_BY_GRADE = {
  common_9_10: [
    'Mathematics',
    'English',
    'Biology',
    'Chemistry',
    'Physics',
    'Geography',
    'History',
    'Civics',
    'Information Communication Technology (ICT)',
    'Amharic',
    'Physical and Health Education (HPE)'
  ],
  natural_11_12: [
    'Mathematics',
    'English',
    'Biology',
    'Chemistry',
    'Physics',
    'Civics',
    'Information Communication Technology (ICT)',
    'Amharic',
    'Physical and Health Education (HPE)'
  ],
  social_11_12: [
    'Mathematics',
    'English',
    'Geography',
    'History',
    'Economics',
    'Civics',
    'Information Communication Technology (ICT)',
    'Amharic',
    'Physical and Health Education (HPE)'
  ]
};

const classConfigs = [
  { class: '9', stream: '' },
  { class: '10', stream: '' },
  { class: '11', stream: 'Natural' },
  { class: '11', stream: 'Social' },
  { class: '12', stream: 'Natural' },
  { class: '12', stream: 'Social' }
];

function normalizeSubjectName(subject = '') {
  const s = String(subject).trim().toLowerCase();
  if (!s) return '';
  if (s.includes('math')) return 'Mathematics';
  if (s.includes('english')) return 'English';
  if (s.includes('biology')) return 'Biology';
  if (s.includes('chem')) return 'Chemistry';
  if (s.includes('physics')) return 'Physics';
  if (s.includes('geography')) return 'Geography';
  if (s.includes('history')) return 'History';
  if (s.includes('civics')) return 'Civics';
  if (s.includes('ict') || s.includes('information communication')) return 'Information Communication Technology (ICT)';
  if (s.includes('amharic')) return 'Amharic';
  if (s.includes('physical') || s.includes('hpe') || s.includes('health')) return 'Physical and Health Education (HPE)';
  if (s.includes('economics')) return 'Economics';
  return subject;
}

function getSubjectsFor(className, stream) {
  const gradeNum = parseInt(String(className), 10);
  if (gradeNum === 11 || gradeNum === 12) {
    if (String(stream).toLowerCase() === 'social') return SUBJECTS_BY_GRADE.social_11_12;
    return SUBJECTS_BY_GRADE.natural_11_12;
  }
  return SUBJECTS_BY_GRADE.common_9_10;
}

function hashNum(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) % 100000;
  }
  return h;
}

function getLastWeekdays(count) {
  const result = [];
  const d = new Date();
  d.setHours(10, 0, 0, 0);

  while (result.length < count) {
    const day = d.getDay();
    if (day >= 1 && day <= 5) {
      result.push(new Date(d));
    }
    d.setDate(d.getDate() - 1);
  }

  return result.reverse();
}

function pickTeacher(subject, teacherBySubject, allTeachers) {
  const matches = teacherBySubject.get(subject) || [];
  if (matches.length > 0) {
    return matches[0]._id;
  }
  return allTeachers[0]._id;
}

function generateSchedule(className, stream, teacherBySubject, allTeachers) {
  const subjects = getSubjectsFor(className, stream);
  const schedule = [];

  for (let dayIndex = 0; dayIndex < DAYS.length; dayIndex += 1) {
    let previous = '';

    for (let periodIndex = 0; periodIndex < PERIODS.length; periodIndex += 1) {
      let subject = subjects[(dayIndex * PERIODS.length + periodIndex) % subjects.length];
      if (subject === previous) {
        subject = subjects[(dayIndex * PERIODS.length + periodIndex + 1) % subjects.length];
      }

      const slot = PERIODS[periodIndex];
      const teacherId = pickTeacher(subject, teacherBySubject, allTeachers);
      const roomSuffix = stream ? `-${stream[0].toUpperCase()}` : '';

      schedule.push({
        day: DAYS[dayIndex],
        period: slot.period,
        subject,
        teacher: teacherId,
        room: `G${className}${roomSuffix}-R1`,
        startTime: slot.startTime,
        endTime: slot.endTime
      });

      previous = subject;
    }
  }

  return schedule;
}

async function seedTimetables(users) {
  const teachers = users.filter((u) => u.role === 'Teacher');
  const schoolAdmin = users.find((u) => u.role === 'SchoolAdmin') || users.find((u) => u.role === 'SystemAdmin');

  if (!schoolAdmin || teachers.length === 0) {
    throw new Error('Cannot seed timetable: missing school admin or teachers');
  }

  const teacherBySubject = new Map();
  for (const teacher of teachers) {
    const subjects = teacher.teacherProfile?.subjects || [];
    for (const s of subjects) {
      const normalized = normalizeSubjectName(s);
      if (!normalized) continue;
      if (!teacherBySubject.has(normalized)) teacherBySubject.set(normalized, []);
      teacherBySubject.get(normalized).push(teacher);
    }
  }

  await Timetable.deleteMany({
    academicYear: ACADEMIC_YEAR,
    semester: SEMESTER,
    generatedBySystem: true
  });

  const docs = classConfigs.map((cfg) => ({
    class: cfg.class,
    section: cfg.stream || undefined,
    stream: cfg.stream || undefined,
    academicYear: ACADEMIC_YEAR,
    semester: SEMESTER,
    schedule: generateSchedule(cfg.class, cfg.stream, teacherBySubject, teachers),
    status: 'Published',
    isActive: true,
    version: 1,
    versionGroup: `${cfg.class}::${cfg.stream || ''}::${ACADEMIC_YEAR}::${SEMESTER}`,
    isLocked: false,
    generatedBySystem: true,
    generationWarnings: ['SEED: autogenerated timetable data'],
    createdBy: schoolAdmin._id
  }));

  await Timetable.insertMany(docs);
  console.log(`Seeded timetables: ${docs.length}`);
}

async function seedAcademicRecords(users) {
  // Query fresh data from database to ensure valid IDs
  const teachers = await User.find({ role: 'Teacher' });
  const students = await User.find({ role: 'Student' });

  if (teachers.length === 0 || students.length === 0) {
    throw new Error('Cannot seed academic records: missing teachers or students');
  }

  const teacherBySubject = new Map();
  for (const teacher of teachers) {
    const subjects = teacher.teacherProfile?.subjects || [];
    for (const s of subjects) {
      const normalized = normalizeSubjectName(s);
      if (!normalized) continue;
      if (!teacherBySubject.has(normalized)) teacherBySubject.set(normalized, []);
      teacherBySubject.get(normalized).push(teacher);
    }
  }

  await AcademicRecord.deleteMany({ comments: /^SEED:/i });

  const docs = [];
  for (const student of students) {
    const grade = student.studentProfile?.grade;
    const stream = student.studentProfile?.stream || '';
    const subjects = getSubjectsFor(grade, stream);

    for (const subject of subjects) {
      const teacher = (teacherBySubject.get(subject) || [teachers[0]])[0];
      const seed = hashNum(`${student.email}-${subject}`);
      const marks = {
        midExam: 10 + (seed % 11),
        finalExam: 22 + (seed % 19),
        classQuiz: 5 + (seed % 6),
        continuousAssessment: 5 + ((seed + 3) % 6),
        assignment: 10 + (seed % 11)
      };

      docs.push({
        student: student._id,
        teacher: teacher._id,
        subject,
        marks,
        status: 'Approved',
        isLocked: true,
        academicYear: ACADEMIC_YEAR,
        semester: SEMESTER,
        comments: 'SEED: generated sample grade',
        createdBy: teacher._id,
        updatedBy: teacher._id,
        approvedBy: teacher._id,
        approvedAt: new Date()
      });
    }
  }

  await AcademicRecord.insertMany(docs);
  console.log(`Seeded academic records: ${docs.length}`);
}

async function seedAttendance(users) {
  const teachers = users.filter((u) => u.role === 'Teacher');
  const students = users.filter((u) => u.role === 'Student');
  const days = getLastWeekdays(25);

  if (teachers.length === 0 || students.length === 0) {
    throw new Error('Cannot seed attendance: missing teachers or students');
  }

  await Attendance.deleteMany({});

  const docs = [];
  for (const student of students) {
    const teacher = teachers[hashNum(student.email) % teachers.length];

    for (const day of days) {
      const seed = hashNum(`${student.email}-${day.toISOString().slice(0, 10)}`);
      const roll = seed % 100;
      let status = 'Present';
      if (roll >= 85 && roll < 93) status = 'Late';
      if (roll >= 93 && roll < 98) status = 'Absent';
      if (roll >= 98) status = 'Excused';

      docs.push({
        student: student._id,
        teacher: teacher._id,
        date: day,
        status,
        period: 1,
        subject: 'Mathematics',
        remarks: 'SEED: generated attendance',
        synced: true
      });
    }
  }

  await Attendance.insertMany(docs);
  console.log(`Seeded attendance records: ${docs.length}`);
}

async function seedAnnouncements(users) {
  const schoolAdmin = users.find((u) => u.role === 'SchoolAdmin') || users.find((u) => u.role === 'SystemAdmin');
  if (!schoolAdmin) {
    throw new Error('Cannot seed announcements: missing school admin/system admin');
  }

  await Announcement.deleteMany({ title: /^\[SEED\]/i });

  const now = new Date();
  const in30Days = new Date(now);
  in30Days.setDate(in30Days.getDate() + 30);

  const docs = [
    {
      title: '[SEED] Welcome Back Students',
      content: 'Welcome to the new semester. Please check your timetable and attendance regularly.',
      type: 'General',
      priority: 'Normal',
      targetRoles: ['Teacher', 'Student', 'Parent'],
      targetGrades: ['All'],
      createdBy: schoolAdmin._id,
      published: true,
      publishStartDate: now,
      publishEndDate: in30Days
    },
    {
      title: '[SEED] Mid Exam Schedule Notice',
      content: 'Mid exam timetable draft is now available. Teachers and students should review and report conflicts.',
      type: 'Academic',
      priority: 'High',
      targetRoles: ['Teacher', 'Student'],
      targetGrades: ['9', '10', '11', '12'],
      createdBy: schoolAdmin._id,
      published: true,
      publishStartDate: now,
      publishEndDate: in30Days
    },
    {
      title: '[SEED] Parent Meeting Reminder',
      content: 'Parent-teacher meeting will be held next Friday at 2:30 PM.',
      type: 'Event',
      priority: 'Normal',
      targetRoles: ['Parent', 'Teacher'],
      targetGrades: ['All'],
      createdBy: schoolAdmin._id,
      published: true,
      publishStartDate: now,
      publishEndDate: in30Days
    },
    {
      title: '[SEED] Attendance Policy Update',
      content: 'Please note that recurring absences will trigger automated absence alerts.',
      type: 'Academic',
      priority: 'Urgent',
      targetRoles: ['Student', 'Parent', 'Teacher'],
      targetGrades: ['All'],
      createdBy: schoolAdmin._id,
      published: true,
      publishStartDate: now,
      publishEndDate: in30Days
    }
  ];

  await Announcement.insertMany(docs);
  console.log(`Seeded announcements: ${docs.length}`);
}

async function seedAllData() {
  try {
    console.log('Step 1/2: Seeding users (seedAllUsers.js)...');
    execSync('node seedAllUsers.js', { cwd: __dirname, stdio: 'inherit' });

    console.log('\nStep 2/2: Seeding data models...');
    await mongoose.connect(process.env.MONGO_URI);

    const users = await User.find({ role: { $in: ['SystemAdmin', 'SchoolAdmin', 'Teacher', 'Student', 'Parent'] } });

    await seedTimetables(users);
    await seedAcademicRecords(users);
    await seedAttendance(users);
    await seedAnnouncements(users);

    await mongoose.disconnect();
    console.log('\n========================================');
    console.log('Master seed completed successfully');
    console.log('========================================\n');
  } catch (error) {
    console.error('\nMaster seed failed:', error.message);
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      // ignore disconnect errors in failure path
    }
    process.exit(1);
  }
}

seedAllData();
