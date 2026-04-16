/**
 * Seed Script for Missing Data Types
 * Seeds: Messages, Certificates, Exam Schedules, Materials, Absence Alerts
 * Run after seedAllData.js: node seedMissingData.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Message = require('./models/Message');
const Certificate = require('./models/Certificate');
const ExamSchedule = require('./models/ExamSchedule');
const Material = require('./models/Material');
const AbsenceAlert = require('./models/AbsenceAlert');

const ACADEMIC_YEAR = '2025-2026';
const SEMESTER = 'Semester 1';

async function seedMessages(users) {
  console.log('Seeding messages...');
  
  const teachers = users.filter(u => u.role === 'Teacher');
  const students = users.filter(u => u.role === 'Student');
  const parents = users.filter(u => u.role === 'Parent');
  const schoolAdmin = users.find(u => u.role === 'SchoolAdmin') || users.find(u => u.role === 'SystemAdmin');

  await Message.deleteMany({});

  const docs = [];

  // Direct messages from teachers to students
  for (let i = 0; i < Math.min(teachers.length, students.length); i++) {
    docs.push({
      sender: teachers[i]._id,
      recipients: [students[i]._id],
      messageType: 'Direct',
      category: 'Academic',
      subject: 'Assignment Reminder',
      content: 'SEED: Please complete your Mathematics assignment by Friday.',
      priority: 'Normal',
      isActive: true
    });
  }

  // Broadcast message from SchoolAdmin
  if (schoolAdmin) {
    docs.push({
      sender: schoolAdmin._id,
      recipients: students.map(s => s._id),
      messageType: 'Broadcast',
      category: 'General',
      subject: 'School Event',
      content: 'SEED: Annual sports day will be held next month. All students are encouraged to participate.',
      broadcastFilters: { role: 'Student' },
      priority: 'High',
      isActive: true
    });

    // System notification (using school admin as sender since schema requires it)
    if (schoolAdmin) {
      docs.push({
        sender: schoolAdmin._id,
        recipients: [...teachers, ...students].map(u => u._id),
        messageType: 'System',
        category: 'Announcement',
        subject: 'System Maintenance',
        content: 'SEED: The system will undergo maintenance this weekend.',
        priority: 'Normal',
        isActive: true
      });
    }
  }

  // Parent-Teacher messages
  for (let i = 0; i < Math.min(parents.length, teachers.length); i++) {
    docs.push({
      sender: parents[i]._id,
      recipients: [teachers[i]._id],
      messageType: 'Direct',
      category: 'Academic',
      subject: 'Parent Inquiry',
      content: 'SEED: I would like to discuss my child\'s progress in Mathematics.',
      priority: 'Normal',
      isActive: true
    });
  }

  await Message.insertMany(docs);
  console.log(`Seeded messages: ${docs.length}`);
}

async function seedCertificates(users) {
  console.log('Seeding certificates...');
  
  const students = users.filter(u => u.role === 'Student');
  const schoolAdmin = users.find(u => u.role === 'SchoolAdmin') || users.find(u => u.role === 'SystemAdmin');

  if (!schoolAdmin || students.length === 0) {
    console.log('Skipping certificates: missing school admin or students');
    return;
  }

  try {
    await mongoose.connection.collections['certificates'].drop();
  } catch (error) {
    // Collection might not exist, ignore error
  }

  const docs = [];
  const certificateTypes = ['Completion', 'Character', 'Bonafide', 'GoodConduct'];

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const certType = certificateTypes[i % certificateTypes.length];

    if (certType === 'Completion') {
      docs.push({
        certificateType: 'Completion',
        student: student._id,
        academicYear: ACADEMIC_YEAR,
        issuedBy: schoolAdmin._id,
        title: 'Certificate of Completion',
        recipientName: `${student.firstName} ${student.lastName}`,
        description: `SEED: This is to certify that ${student.firstName} ${student.lastName} has successfully completed the academic year.`,
        completionDetails: {
          grade: student.studentProfile?.grade,
          section: student.studentProfile?.stream || '',
          academicPerformance: 'Excellent',
          attendancePercentage: 95,
          completedOn: new Date()
        },
        signedBy: {
          name: 'School Principal',
          title: 'Principal'
        },
        status: 'Issued',
        notes: 'SEED: Generated sample completion certificate'
      });
    } else if (certType === 'Character') {
      docs.push({
        certificateType: 'Character',
        student: student._id,
        academicYear: ACADEMIC_YEAR,
        issuedBy: schoolAdmin._id,
        title: 'Character Certificate',
        recipientName: `${student.firstName} ${student.lastName}`,
        description: 'SEED: This is to certify that the student has borne a good moral character.',
        signedBy: {
          name: 'School Principal',
          title: 'Principal'
        },
        status: 'Issued',
        notes: 'SEED: Generated sample character certificate'
      });
    } else if (certType === 'Bonafide') {
      docs.push({
        certificateType: 'Bonafide',
        student: student._id,
        academicYear: ACADEMIC_YEAR,
        issuedBy: schoolAdmin._id,
        title: 'Bonafide Certificate',
        recipientName: `${student.firstName} ${student.lastName}`,
        description: 'SEED: This is to certify that the student is a bonafide student of this institution.',
        completionDetails: {
          grade: student.studentProfile?.grade,
          section: student.studentProfile?.stream || ''
        },
        signedBy: {
          name: 'School Principal',
          title: 'Principal'
        },
        status: 'Issued',
        notes: 'SEED: Generated sample bonafide certificate'
      });
    } else {
      docs.push({
        certificateType: 'GoodConduct',
        student: student._id,
        academicYear: ACADEMIC_YEAR,
        issuedBy: schoolAdmin._id,
        title: 'Certificate of Good Conduct',
        recipientName: `${student.firstName} ${student.lastName}`,
        description: 'SEED: This is to certify good conduct and behavior during the academic year.',
        signedBy: {
          name: 'School Principal',
          title: 'Principal'
        },
        status: 'Issued',
        notes: 'SEED: Generated sample good conduct certificate'
      });
    }
  }

  await Certificate.insertMany(docs);
  console.log(`Seeded certificates: ${docs.length}`);
}

async function seedExamSchedules(users) {
  console.log('Seeding exam schedules...');
  
  const teachers = users.filter(u => u.role === 'Teacher');
  const schoolAdmin = users.find(u => u.role === 'SchoolAdmin') || users.find(u => u.role === 'SystemAdmin');

  if (!schoolAdmin) {
    console.log('Skipping exam schedules: missing school admin');
    return;
  }

  await ExamSchedule.deleteMany({});

  const docs = [];
  const subjects = ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography'];
  const grades = [9, 10, 11, 12];
  const examTypes = ['Midterm', 'Final'];

  const now = new Date();
  const examStartDate = new Date(now);
  examStartDate.setDate(examStartDate.getDate() + 30);

  for (const grade of grades) {
    for (const subject of subjects) {
      for (const examType of examTypes) {
        const teacher = teachers[Math.floor(Math.random() * teachers.length)] || teachers[0];
        const examDate = new Date(examStartDate);
        examDate.setDate(examDate.getDate() + Math.floor(Math.random() * 14));

        docs.push({
          examName: `${examType} Examination - ${subject}`,
          examType,
          subject,
          grade,
          section: grade >= 11 ? 'Natural' : undefined,
          academicYear: ACADEMIC_YEAR,
          semester: SEMESTER,
          date: examDate,
          startTime: '09:00',
          endTime: '11:00',
          duration: 120,
          room: `Exam-Hall-${grade}`,
          invigilator: `${teacher.firstName} ${teacher.lastName}`,
          instructions: 'Bring your student ID card. No electronic devices allowed.',
          maxMarks: 100,
          createdBy: schoolAdmin._id,
          status: 'Scheduled',
          notes: 'SEED: Generated sample exam schedule'
        });
      }
    }
  }

  await ExamSchedule.insertMany(docs);
  console.log(`Seeded exam schedules: ${docs.length}`);
}

async function seedMaterials(users) {
  console.log('Seeding materials...');
  
  const teachers = users.filter(u => u.role === 'Teacher');

  if (teachers.length === 0) {
    console.log('Skipping materials: no teachers found');
    return;
  }

  await Material.deleteMany({});

  const docs = [];
  const materialTypes = ['study_material', 'assignment', 'resource'];
  const subjects = ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology'];
  const grades = ['9', '10', '11', '12'];

  for (const teacher of teachers) {
    const teacherSubjects = teacher.teacherProfile?.subjects || subjects.slice(0, 2);
    const teacherClasses = teacher.teacherProfile?.classes || [{ grade: '9' }];

    for (const subject of teacherSubjects) {
      for (const classInfo of teacherClasses) {
        for (const materialType of materialTypes) {
          const dueDate = materialType === 'assignment' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null;

          docs.push({
            title: `${materialType.replace('_', ' ').toUpperCase()} - ${subject}`,
            description: `SEED: Sample ${materialType} for ${subject} class ${classInfo.grade}`,
            type: materialType,
            subject,
            grade: classInfo.grade,
            section: classInfo.stream || '',
            teacherId: teacher._id,
            fileUrl: '',
            fileName: '',
            fileSize: 0,
            fileMimeType: '',
            dueDate,
            status: 'published',
            views: Math.floor(Math.random() * 50),
            downloads: Math.floor(Math.random() * 20)
          });
        }
      }
    }
  }

  await Material.insertMany(docs);
  console.log(`Seeded materials: ${docs.length}`);
}

async function seedAbsenceAlerts(users) {
  console.log('Seeding absence alerts...');
  
  const students = users.filter(u => u.role === 'Student');
  const teachers = users.filter(u => u.role === 'Teacher');

  if (students.length === 0 || teachers.length === 0) {
    console.log('Skipping absence alerts: missing students or teachers');
    return;
  }

  await AbsenceAlert.deleteMany({});

  const docs = [];
  const alertTypes = ['FirstAbsence', 'ConsecutiveAbsence', 'ThresholdReached'];

  const now = new Date();

  for (let i = 0; i < Math.min(students.length, 10); i++) {
    const student = students[i];
    const teacher = teachers[i % teachers.length];
    const alertType = alertTypes[i % alertTypes.length];

    const alertDate = new Date(now);
    alertDate.setDate(alertDate.getDate() - Math.floor(Math.random() * 10));

    const linkedParents = student.studentProfile?.linkedParents || [];

    docs.push({
      student: student._id,
      academicYear: ACADEMIC_YEAR,
      grade: student.studentProfile?.grade,
      section: student.studentProfile?.stream || 'General',
      date: alertDate,
      period: 'Full Day',
      subject: 'Mathematics',
      teacher: teacher._id,
      reason: 'SEED: Sample absence alert for testing',
      notificationStatus: linkedParents.length > 0 ? 'Sent' : 'Pending',
      notificationSentAt: linkedParents.length > 0 ? alertDate : null,
      notificationMethod: 'InApp',
      parents: linkedParents.map(parentId => ({
        parent: parentId,
        status: 'Sent',
        sentAt: alertDate
      })),
      alertType,
      consecutiveCount: alertType === 'ConsecutiveAbsence' ? 3 : 1,
      status: 'Active'
    });
  }

  await AbsenceAlert.insertMany(docs);
  console.log(`Seeded absence alerts: ${docs.length}`);
}

async function seedAllMissingData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    const users = await User.find({ role: { $in: ['SystemAdmin', 'SchoolAdmin', 'Teacher', 'Student', 'Parent'] } });
    
    if (users.length === 0) {
      console.error('No users found. Please run seedAllUsers.js or seedAllData.js first.');
      process.exit(1);
    }

    await seedMessages(users);
    await seedCertificates(users);
    await seedExamSchedules(users);
    await seedMaterials(users);
    await seedAbsenceAlerts(users);

    await mongoose.disconnect();
    console.log('\n========================================');
    console.log('Missing data seed completed successfully');
    console.log('========================================\n');
  } catch (error) {
    console.error('\nSeed failed:', error.message);
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      // ignore disconnect errors in failure path
    }
    process.exit(1);
  }
}

seedAllMissingData();
