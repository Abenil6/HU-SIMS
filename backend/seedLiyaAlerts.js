const mongoose = require('mongoose');
require('dotenv').config();

const AbsenceAlert = require('./models/AbsenceAlert');
const User = require('./models/User');

async function seedLiyaAbsenceAlerts() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Find Liya Berhe
    const liya = await User.findOne({ email: 'liya.parent@school.com' });
    if (!liya) {
      console.error('Liya Berhe not found');
      process.exit(1);
    }

    console.log('Found Liya Berhe with children:', liya.parentProfile?.linkedChildren?.length || 0);

    // Get Liya's children
    const children = await User.find({ _id: { $in: liya.parentProfile.linkedChildren } });
    console.log('Children:', children.map(c => `${c.firstName} ${c.lastName}`));

    // Delete existing alerts for Liya's children
    await AbsenceAlert.deleteMany({ student: { $in: liya.parentProfile.linkedChildren } });
    console.log('Deleted existing alerts for Liya\'s children\n');

    // Create alerts for each child
    const docs = [];
    const alertTypes = ['FirstAbsence', 'ConsecutiveAbsence', 'ThresholdReached'];
    const now = new Date();

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const alertType = alertTypes[i % alertTypes.length];
      const alertDate = new Date(now);
      alertDate.setDate(alertDate.getDate() - (i + 1)); // Different dates

      docs.push({
        student: child._id,
        academicYear: '2025-2026',
        grade: child.studentProfile?.grade,
        section: child.studentProfile?.stream || 'General',
        date: alertDate,
        period: 'Full Day',
        subject: 'Mathematics',
        teacher: null,
        reason: 'SEED: Sample absence alert for Liya Berhe\'s child',
        notificationStatus: 'Sent',
        notificationSentAt: alertDate,
        notificationMethod: 'InApp',
        parents: [{
          parent: liya._id,
          status: 'Sent',
          sentAt: alertDate
        }],
        alertType,
        consecutiveCount: alertType === 'ConsecutiveAbsence' ? 3 : 1,
        status: 'Active'
      });
    }

    await AbsenceAlert.insertMany(docs);
    console.log(`Created ${docs.length} absence alerts for Liya Berhe's children\n`);

    await mongoose.disconnect();
    console.log('========================================');
    console.log('Liya Berhe absence alerts seeded successfully');
    console.log('========================================\n');
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
}

seedLiyaAbsenceAlerts();
