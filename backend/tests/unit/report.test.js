const request = require('supertest');
const app = require('../../server');
const { createAdminUser, createTeacherUser, createStudentUser } = require('../helpers/testHelpers');
const Student = require('../../models/Student');

describe('Report Controller', () => {
  let adminUser, adminToken;
  let teacherUser, teacherToken;
  let studentUser, studentToken;
  let testStudent;

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

    testStudent = await Student.create({
      user: studentUser._id,
      enrollmentNumber: `ENR${Date.now()}`,
      grade: 'Grade 10',
      section: 'A',
      dateOfBirth: '2010-01-01',
      gender: 'Male'
    });
  });

  describe('GET /api/reports/student/:studentId - Generate student performance report', () => {
    it('should generate student performance report', async () => {
      const response = await request(app)
        .get(`/api/reports/student/${testStudent.user}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/reports/student/${testStudent.user}`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/reports/class/:className - Generate class performance report', () => {
    it('should generate class performance report', async () => {
      const response = await request(app)
        .get('/api/reports/class/Grade%2010')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/reports/attendance - Generate attendance report', () => {
    it('should generate attendance report', async () => {
      const response = await request(app)
        .get('/api/reports/attendance')
        .set('Authorization', `Bearer ${teacherToken}`)
        .query({ 
          startDate: '2025-01-01',
          endDate: '2025-12-31'
        });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/reports/:id/pdf - Export report as PDF', () => {
    it('should export report as PDF', async () => {
      const response = await request(app)
        .get('/api/reports/test-report-id/pdf')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(response.status);
    });
  });
});
