const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB\n');
    
    // Check for absence alerts
    const absenceAlertsCollection = mongoose.connection.collections['absencealerts'];
    const alertCount = absenceAlertsCollection ? await absenceAlertsCollection.countDocuments() : 0;
    console.log('Absence alerts in DB:', alertCount);
    
    if (alertCount > 0 && absenceAlertsCollection) {
      const alerts = await absenceAlertsCollection.find({}).limit(5).toArray();
      console.log('Sample alerts:', alerts.map(a => ({ student: a.student, alertType: a.alertType, status: a.status })));
    }
    
    // Check for messages
    const messagesCollection = mongoose.connection.collections['messages'];
    const messageCount = messagesCollection ? await messagesCollection.countDocuments() : 0;
    console.log('Messages in DB:', messageCount);
    
    // Check for attendance on April 11, 2025
    const attendancesCollection = mongoose.connection.collections['attendances'];
    if (attendancesCollection) {
      const april11 = new Date('2025-04-11');
      april11.setHours(0, 0, 0, 0);
      const april11End = new Date('2025-04-11');
      april11End.setHours(23, 59, 59);
      
      const attendanceCount = await attendancesCollection.countDocuments({
        date: { $gte: april11, $lte: april11End }
      });
      console.log('Attendance records on April 11, 2025:', attendanceCount);
      
      if (attendanceCount > 0) {
        const attendances = await attendancesCollection.find({
          date: { $gte: april11, $lte: april11End }
        }).toArray();
        console.log('Attendance statuses:', attendances.map(a => ({ status: a.status, student: a.student })));
      }
    } else {
      console.log('Attendance collection not found');
    }
    
    // Check for student 'pes' or similar
    const User = require('./models/User');
    const student = await User.findOne({ 
      role: 'Student',
      $or: [
        { firstName: /pes/i },
        { lastName: /pes/i },
        { 'studentProfile.studentId': /pes/i }
      ]
    });
    if (student) {
      console.log('Found student:', student.firstName, student.lastName);
      console.log('Linked parents:', student.studentProfile?.linkedParents?.length || 0);
    } else {
      console.log('No student found matching "pes"');
    }
    
    await mongoose.disconnect();
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
