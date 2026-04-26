const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const swaggerSpec = require('./config/swagger');
const swaggerUi = require('swagger-ui-express');    
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');  
const adminUserRoutes = require('./routes/adminUserRoutes');  
const academicRecordRoutes = require('./routes/academicRecordRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const reportRoutes = require('./routes/reportRoutes');
const messageRoutes = require('./routes/messageRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const parentRoutes = require('./routes/parentRoutes');
const absenceAlertRoutes = require('./routes/absenceAlertRoutes');
const examScheduleRoutes = require('./routes/examScheduleRoutes');
const academicYearRoutes = require('./routes/academicYearRoutes');
const systemRoutes = require('./routes/systemRoutes');
const notificationReadStateRoutes = require('./routes/notificationReadStateRoutes');
const materialRoutes = require('./routes/materialRoutes');
const contactRoutes = require('./routes/contactRoutes');
const classRoutes = require('./routes/classRoutes');
const { startBackupScheduler } = require('./utils/backupScheduler');

dotenv.config();
const app = express();
const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : ['http://localhost:3000', 'http://localhost:5173'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(express.json({ limit: '15mb' }));
app.use('/uploads/students/academic-documents', (_req, res) => {
  res.status(403).json({
    success: false,
    message: 'Academic document files require authenticated access'
  });
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/academic-records', academicRecordRoutes);
app.use('/api/timetables', timetableRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/absence-alerts', absenceAlertRoutes);
app.use('/api/exam-schedules', examScheduleRoutes);
app.use('/api/academic-years', academicYearRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/notification-read-states', notificationReadStateRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/classes', classRoutes);

// Routes placeholder
app.get('/', (req, res) => res.send('Backend started Running'));

// Error handling middleware - must be last
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Only connect to DB and start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  // Connect to database
  connectDB();

  // Start backup scheduler for automatic backups
  startBackupScheduler();

  // Start server
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// Export app for testing
module.exports = app;
