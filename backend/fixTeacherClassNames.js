const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

async function fixTeacherClassNames() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Fix all teacher class assignments to use full stream names
    const teachers = await User.find({ role: 'Teacher' });
    
    let updatedCount = 0;
    
    for (const teacher of teachers) {
      if (!teacher.teacherProfile || !Array.isArray(teacher.teacherProfile.classes)) {
        continue;
      }
      
      let needsUpdate = false;
      const updatedClasses = teacher.teacherProfile.classes.map(cls => {
        let stream = cls.stream || cls.section;
        const grade = cls.grade;
        
        // Normalize stream names to match student profiles
        if (stream === 'Natural' || stream === 'natural') {
          stream = 'Natural Science';
          needsUpdate = true;
        } else if (stream === 'Social' || stream === 'social') {
          stream = 'Social Science';
          needsUpdate = true;
        }
        
        return {
          grade,
          stream,
          section: stream // Also update section to match
        };
      });
      
      if (needsUpdate) {
        teacher.teacherProfile.classes = updatedClasses;
        await teacher.save();
        updatedCount++;
        console.log(`✓ Updated ${teacher.firstName} ${teacher.lastName}'s class assignments`);
        console.log('  New classes:', updatedClasses.map(c => `Grade ${c.grade} - ${c.stream}`));
      }
    }
    
    console.log(`\nTotal teachers updated: ${updatedCount}`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixTeacherClassNames();
