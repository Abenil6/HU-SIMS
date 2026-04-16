const request = require('supertest');
const app = require('../../server');
const { createAdminUser, createTeacherUser, createStudentUser } = require('../helpers/testHelpers');
const { createAcademicRecordData } = require('../helpers/testFactories');
const AcademicRecord = require('../../models/AcademicRecord');

describe('Academic Records Controller', () => {
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

  describe('POST /api/academic-records - Create academic record', () => {
    it('should create academic record with valid data', async () => {
      const recordData = createAcademicRecordData({
        student: studentUser._id,
        teacher: teacherUser._id
      });

      const response = await request(app)
        .post('/api/academic-records')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(recordData);

      expect([200, 201]).toContain(response.status);
    });

    it('should reject creation without authentication', async () => {
      const recordData = createAcademicRecordData();

      const response = await request(app)
        .post('/api/academic-records')
        .send(recordData);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/academic-records - Get academic records', () => {
    it('should retrieve academic records with filters', async () => {
      const response = await request(app)
        .get('/api/academic-records')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ student: studentUser._id });

      expect(response.status).toBe(200);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/academic-records');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/academic-records/:id - Update academic record', () => {
    it('should update academic record marks', async () => {
      const record = await AcademicRecord.create({
        student: studentUser._id,
        teacher: teacherUser._id,
        subject: 'Mathematics',
        academicYear: '2025-2026',
        semester: 'Semester 1',
        marks: {
          midExam: 15,
          finalExam: 30,
          classQuiz: 7,
          continuousAssessment: 7,
          assignment: 16
        },
        status: 'Draft'
      });

      const response = await request(app)
        .put(`/api/academic-records/${record._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ 
          marks: {
            midExam: 18,
            finalExam: 36,
            classQuiz: 9,
            continuousAssessment: 9,
            assignment: 18
          }
        });

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('DELETE /api/academic-records/:id - Delete academic record', () => {
    it('should delete academic record', async () => {
      const record = await AcademicRecord.create({
        student: studentUser._id,
        teacher: teacherUser._id,
        subject: 'Science',
        academicYear: '2025-2026',
        semester: 'Semester 1',
        marks: {
          midExam: 16,
          finalExam: 32,
          classQuiz: 8,
          continuousAssessment: 8,
          assignment: 16
        },
        status: 'Draft'
      });

      const response = await request(app)
        .delete(`/api/academic-records/${record._id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect([200, 204]).toContain(response.status);
    });
  });

  describe('GET /api/academic-records/performance/student - Get student performance', () => {
    it('should get student performance with average calculation', async () => {
      const response = await request(app)
        .get('/api/academic-records/performance/student')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ 
          studentId: studentUser._id,
          academicYear: '2025-2026'
        });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/academic-records/performance/class - Get class performance', () => {
    it('should get class performance statistics', async () => {
      const response = await request(app)
        .get('/api/academic-records/performance/class')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          academicYear: '2025-2026',
          semester: 'Semester 1'
        });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/academic-records/honor-roll/status - Get honor roll status', () => {
    it('should get student honor roll status based on average', async () => {
      const response = await request(app)
        .get('/api/academic-records/honor-roll/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          studentId: studentUser._id,
          academicYear: '2025-2026',
          semester: 'Semester 1'
        });

      expect(response.status).toBe(200);
    });
  });
});
