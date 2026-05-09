const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const AcademicRecord = require('./models/AcademicRecord');
const SchoolClass = require('./models/SchoolClass');

async function repairGrades() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const students = await User.find({ role: 'Student' });
    const records = await AcademicRecord.find({});
    const classes = await SchoolClass.find({});

    const studentIdsWithGrades = new Set(records.map(r => r.student.toString()));
    const missingStudents = students.filter(s => !studentIdsWithGrades.has(s._id.toString()));

    console.log(`Total Students: ${students.length}`);
    console.log(`Students with Grades: ${studentIdsWithGrades.size}`);
    console.log(`Students missing ALL grades: ${missingStudents.length}`);

    // Find the default teacher for seeding
    const admin = await User.findOne({ role: { $in: ['SchoolAdmin', 'SystemAdmin'] } });
    if (!admin) throw new Error('Admin user not found');

    for (const student of missingStudents) {
      console.log(`Repairing grades for: ${student.firstName} ${student.lastName}`);
      
      const grade = String(student.studentProfile?.grade || student.grade || '').trim();
      const stream = String(student.studentProfile?.stream || student.stream || '').trim();
      
      const schoolClass = classes.find(c => 
        String(c.grade) === grade && 
        (grade < 11 || String(c.stream || '') === stream)
      );

      if (!schoolClass) {
        console.log(`  - No class found for grade ${grade} ${stream}`);
        continue;
      }

      const subjects = schoolClass.subjects || [];
      if (subjects.length === 0) {
        console.log(`  - No subjects found in class`);
        continue;
      }

      const newRecords = [];
      for (const semester of ['Semester 1', 'Semester 2']) {
        for (const subject of subjects) {
          const subName = typeof subject === 'string' ? subject : subject.name;
          const teacherId = subject.teacher || admin._id;

          newRecords.push({
            student: student._id,
            teacher: teacherId,
            subject: subName,
            gradeLevel: grade,
            academicYear: '2025-2026',
            semester,
            marks: {
              midExam: 15 + Math.floor(Math.random() * 5),
              finalExam: 30 + Math.floor(Math.random() * 10),
              classQuiz: 15 + Math.floor(Math.random() * 5),
              assignment: 15 + Math.floor(Math.random() * 5),
            },
            status: 'Approved',
            createdBy: admin._id
          });
        }
      }

      if (newRecords.length > 0) {
        await AcademicRecord.insertMany(newRecords);
        console.log(`  - Created ${newRecords.length} records`);
      }
    }

    // Final Check
    const finalRecordsCount = await AcademicRecord.countDocuments({});
    const finalUniqueStudents = await AcademicRecord.distinct('student');
    console.log(`\nFinal Records Count: ${finalRecordsCount}`);
    console.log(`Final Unique Students with Grades: ${finalUniqueStudents.length}`);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

repairGrades();
