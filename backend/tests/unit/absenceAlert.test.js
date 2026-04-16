const request = require('supertest');
const app = require('../../server');
const { createAdminUser, createTeacherUser, createStudentUser, createParentUser } = require('../helpers/testHelpers');
const { createAbsenceAlertData } = require('../helpers/testFactories');
const AbsenceAlert = require('../../models/AbsenceAlert');
const Student = require('../../models/Student');

describe('Absence Alert Controller', () => {
  let adminUser, adminToken;
  let teacherUser, teacherToken;
  let studentUser, studentToken;
  let parentUser, parentToken;
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

    const parent = await createParentUser(app);
    parentUser = parent.user;
    parentToken = parent.token;

    testStudent = await Student.create({
      user: studentUser._id,
      enrollmentNumber: `ENR${Date.now()}`,
      grade: 'Grade 10',
      section: 'A',
      dateOfBirth: '2010-01-01',
      gender: 'Male'
    });
  });

  describe('POST /api/absence-alerts - Create absence alert', () => {
    it('should create absence alert with valid data', async () => {
      const alertData = createAbsenceAlertData({
        student: testStudent.user
      });

      const response = await request(app)
        .post('/api/absence-alerts')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(alertData);

      expect([200, 201]).toContain(response.status);
    });

    it('should reject creation without authentication', async () => {
      const response = await request(app)
        .post('/api/absence-alerts')
        .send(createAbsenceAlertData());

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/absence-alerts/batch - Create batch absence alerts', () => {
    it('should create batch absence alerts', async () => {
      const batchData = {
        alerts: [
          {
            student: testStudent.user,
            date: new Date().toISOString().split('T')[0],
            reason: 'Absent without notice'
          }
        ]
      };

      const response = await request(app)
        .post('/api/absence-alerts/batch')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(batchData);

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('GET /api/absence-alerts - Get absence alerts', () => {
    it('should retrieve absence alerts', async () => {
      const response = await request(app)
        .get('/api/absence-alerts')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/absence-alerts/:id/notify - Send notification', () => {
    it('should send notification to parents', async () => {
      const alert = await AbsenceAlert.create({
        student: testStudent.user,
        date: new Date(),
        reason: 'Absent',
        status: 'Pending'
      });

      const response = await request(app)
        .put(`/api/absence-alerts/${alert._id}/notify`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('PUT /api/absence-alerts/:id/resolve - Resolve alert', () => {
    it('should resolve absence alert', async () => {
      const alert = await AbsenceAlert.create({
        student: testStudent.user,
        date: new Date(),
        reason: 'Absent',
        status: 'Pending'
      });

      const response = await request(app)
        .put(`/api/absence-alerts/${alert._id}/resolve`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ resolution: 'Excused absence' });

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('GET /api/absence-alerts/statistics - Get alert statistics', () => {
    it('should retrieve alert statistics', async () => {
      const response = await request(app)
        .get('/api/absence-alerts/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });
});
