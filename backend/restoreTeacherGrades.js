const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

async function restoreTeacherGrades() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Fix Abdi Alemu specifically
    const teacher = await User.findOne({ 
      firstName: 'Abdi',
      lastName: 'Alemu',
      role: 'Teacher'
    });
    
    if (!teacher) {
      console.log('Teacher Abdi Alemu not found');
      process.exit(1);
    }
    
    console.log('Current classes:', JSON.stringify(teacher.teacherProfile?.classes, null, 2));
    
    // Restore correct classes with proper grade and stream
    teacher.teacherProfile.classes = [
      { grade: '11', stream: 'Natural Science', section: 'Natural Science' },
      { grade: '12', stream: 'Social Science', section: 'Social Science' }
    ];
    
    await teacher.save();
    console.log('✓ Fixed Abdi Alemu classes:', teacher.teacherProfile.classes);
    
    // Also fix Zenabu Yilma
    const teacher2 = await User.findOne({ 
      firstName: 'Zenabu',
      lastName: 'Yilma',
      role: 'Teacher'
    });
    
    if (teacher2) {
      teacher2.teacherProfile.classes = [
        { grade: '11', stream: 'Social Science', section: 'Social Science' },
        { grade: '12', stream: 'Natural Science', section: 'Natural Science' }
      ];
      await teacher2.save();
      console.log('✓ Fixed Zenabu Yilma classes:', teacher2.teacherProfile.classes);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

restoreTeacherGrades();
