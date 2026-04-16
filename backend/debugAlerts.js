const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB\n');
    
    const AbsenceAlert = require('./models/AbsenceAlert');
    const User = require('./models/User');
    
    // Get all absence alerts with populated data
    const alerts = await AbsenceAlert.find({})
      .populate('student', 'firstName lastName')
      .populate('teacher', 'firstName lastName')
      .populate('parents.parent', 'firstName lastName email');
    
    console.log('Total absence alerts:', alerts.length);
    
    for (const alert of alerts) {
      console.log('\n--- Alert ---');
      console.log('Student:', alert.student?.firstName, alert.student?.lastName);
      console.log('Alert Type:', alert.alertType);
      console.log('Status:', alert.status);
      console.log('Parents linked:', alert.parents?.length || 0);
      for (const p of alert.parents || []) {
        console.log('  - Parent:', p.parent?.firstName, p.parent?.lastName, '| Email:', p.parent?.email, '| Status:', p.status);
      }
    }
    
    // Get all parents
    const parents = await User.find({ role: 'Parent' });
    console.log('\n\nTotal parents in system:', parents.length);
    for (const parent of parents) {
      console.log('Parent:', parent.firstName, parent.lastName, '| Email:', parent.email);
      console.log('  Linked children:', parent.parentProfile?.linkedChildren?.length || 0);
    }
    
    await mongoose.disconnect();
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
