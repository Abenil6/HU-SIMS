const request = require('supertest');
const app = require('../../server');
const { createAdminUser, createTeacherUser, createStudentUser } = require('../helpers/testHelpers');
const { createAttendanceData } = require('../helpers/testFactories');
const Attendance = require('../../models/Attendance');

describe('Attendance Controller', () => {
  let adminUser, adminToken;
  let teacherUser, teacherToken;
  let studentUser, studentToken;

  beforeAll(async () => {
    const admin = await createAdminUser(app);
    adminUser = admin.user;
    adminToken = admin.token;
    
    const teacher = await createTeacherUser(app);
    teacherUser = teacher.user;
    teacherToken = teacher.token;
    
    const student = await createStudentUser(app);
    studentUser = student.user;
    studentToken = student.token;
  });

  describe('POST /api/attendance/mark - Mark single attendance', () => {
    it('should mark attendance with valid data', async () => {
      const attendanceData = createAttendanceData({
        student: studentUser._id,
        teacher: teacherUser._id,
        date: new Date().toISOString().split('T')[0],
        status: 'Present',
        period: 1,
        subject: 'Mathematics'
      });

      const response = await request(app)
        .post('/api/attendance/mark')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(attendanceData);

      expect([200, 201]).toContain(response.status);
    });

    it('should reject marking attendance without authentication', async () => {
      const attendanceData = createAttendanceData({
        student: studentUser._id,
        date: new Date().toISOString().split('T')[0]
      });

      const response = await request(app)
        .post('/api/attendance/mark')
        .send(attendanceData);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/attendance/bulk - Bulk mark attendance', () => {
    it('should mark bulk attendance for multiple students', async () => {
      const bulkData = {
        date: new Date().toISOString().split('T')[0],
        period: 2,
        subject: 'Science',
        records: [
          {
            student: studentUser._id,
            status: 'Present',
            remarks: ''
          }
        ]
      };

      const response = await request(app)
        .post('/api/attendance/bulk')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(bulkData);

      expect([200, 201]).toContain(response.status);
    });

    it('should reject bulk marking without authentication', async () => {
      const bulkData = {
        date: new Date().toISOString().split('T')[0],
        records: []
      };

      const response = await request(app)
        .post('/api/attendance/bulk')
        .send(bulkData);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/attendance/sync - Sync offline records', () => {
    it('should sync offline attendance records', async () => {
      const offlineRecords = {
        offlineRecords: [
          {
            student: studentUser._id,
            teacher: teacherUser._id,
            date: new Date().toISOString().split('T')[0],
            status: 'Present',
            offlineId: `offline_${Date.now()}`
          }
        ]
      };

      const response = await request(app)
        .post('/api/attendance/sync')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(offlineRecords);

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('GET /api/attendance - Get attendance records', () => {
    it('should retrieve attendance records with filters', async () => {
      const response = await request(app)
        .get('/api/attendance')
        .set('Authorization', `Bearer ${teacherToken}`)
        .query({ student: studentUser._id });

      expect(response.status).toBe(200);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/attendance');

      expect(response.status).toBe(401);
    });

    it('should allow teacher to view only attendance records they personally took', async () => {
      const teacher1 = await createTeacherUser(app);
      const teacher2 = await createTeacherUser(app);
      const student = await createStudentUser(app);

      teacher1.user.teacherProfile = {
        ...(teacher1.user.teacherProfile || {}),
        classes: [{ grade: '9' }],
      };
      await teacher1.user.save();

      teacher2.user.teacherProfile = {
        ...(teacher2.user.teacherProfile || {}),
        classes: [{ grade: '9' }],
      };
      await teacher2.user.save();

      student.user.studentProfile = {
        ...(student.user.studentProfile || {}),
        grade: '9',
      };
      await student.user.save();

      await Attendance.create({
        student: student.user._id,
        teacher: teacher1.user._id,
        date: new Date('2026-04-10'),
        status: 'Present',
        period: 1,
      });

      await Attendance.create({
        student: student.user._id,
        teacher: teacher2.user._id,
        date: new Date('2026-04-11'),
        status: 'Absent',
        period: 1,
      });

      const response = await request(app)
        .get('/api/attendance')
        .set('Authorization', `Bearer ${teacher1.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].status).toBe('Present');
    });
  });

  describe('PUT /api/attendance/:id - Update attendance', () => {
    it('should update attendance record', async () => {
      const attendance = await Attendance.create({
        student: studentUser._id,
        teacher: teacherUser._id,
        date: new Date(),
        status: 'Present',
        period: 1
      });

      const response = await request(app)
        .put(`/api/attendance/${attendance._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ status: 'Late', remarks: 'Arrived 10 minutes late' });

      expect([200, 201]).toContain(response.status);
    });

    it('should reject update without authentication', async () => {
      const response = await request(app)
        .put('/api/attendance/507f1f77bcf86cd799439011')
        .send({ status: 'Late' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/attendance/:id - Delete attendance', () => {
    it('should delete attendance record', async () => {
      const attendance = await Attendance.create({
        student: studentUser._id,
        teacher: teacherUser._id,
        date: new Date(),
        status: 'Present',
        period: 1
      });

      const response = await request(app)
        .delete(`/api/attendance/${attendance._id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect([200, 204]).toContain(response.status);
    });
  });

  describe('GET /api/attendance/summary/student - Student attendance summary', () => {
    it('should get student attendance summary', async () => {
      const response = await request(app)
        .get('/api/attendance/summary/student')
        .set('Authorization', `Bearer ${teacherToken}`)
        .query({ studentId: studentUser._id });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/attendance/summary/class - Class attendance summary', () => {
    it('should get class attendance summary', async () => {
      const response = await request(app)
        .get('/api/attendance/summary/class')
        .set('Authorization', `Bearer ${teacherToken}`)
        .query({ className: 'Grade 10' });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/attendance/report/daily - Daily attendance report', () => {
    it('should get daily attendance report', async () => {
      const response = await request(app)
        .get('/api/attendance/report/daily')
        .set('Authorization', `Bearer ${teacherToken}`)
        .query({ date: new Date().toISOString().split('T')[0] });

      expect(response.status).toBe(200);
    });
  });
});
