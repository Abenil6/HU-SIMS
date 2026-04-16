const request = require('supertest');
const app = require('../../server');
const { createAdminUser, createStudentUser } = require('../helpers/testHelpers');
const { createCertificateData } = require('../helpers/testFactories');
const Certificate = require('../../models/Certificate');
const Student = require('../../models/Student');

describe('Certificate Controller', () => {
  let adminUser, adminToken;
  let studentUser, studentToken;
  let testStudent;

  beforeAll(async () => {
    const admin = await createAdminUser(app);
    adminUser = admin.user;
    adminToken = admin.token;
    
    const student = await createStudentUser(app);
    studentUser = student.user;
    studentToken = student.token;

    testStudent = await Student.create({
      user: studentUser._id,
      enrollmentNumber: `ENR${Date.now()}`,
      grade: 'Grade 12',
      section: 'A',
      dateOfBirth: '2008-01-01',
      gender: 'Male'
    });
  });

  describe('POST /api/certificates - Generate certificate', () => {
    it('should generate certificate with valid data', async () => {
      const certificateData = createCertificateData({
        student: testStudent.user,
        type: 'Completion'
      });

      const response = await request(app)
        .post('/api/certificates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(certificateData);

      expect([200, 201]).toContain(response.status);
    });

    it('should reject generation without authentication', async () => {
      const response = await request(app)
        .post('/api/certificates')
        .send(createCertificateData());

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/certificates - Get certificates', () => {
    it('should retrieve certificates', async () => {
      const response = await request(app)
        .get('/api/certificates')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/certificates/:id/issue - Issue certificate', () => {
    it('should issue certificate', async () => {
      const certificate = await Certificate.create({
        student: testStudent.user,
        type: 'Completion',
        certificateNumber: `CERT${Date.now()}`,
        issueDate: new Date(),
        status: 'Draft'
      });

      const response = await request(app)
        .put(`/api/certificates/${certificate._id}/issue`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('PUT /api/certificates/:id/cancel - Cancel certificate', () => {
    it('should cancel certificate', async () => {
      const certificate = await Certificate.create({
        student: testStudent.user,
        type: 'Transfer',
        certificateNumber: `CERT${Date.now()}`,
        issueDate: new Date(),
        status: 'Issued'
      });

      const response = await request(app)
        .put(`/api/certificates/${certificate._id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('GET /api/certificates/:id/verify - Verify certificate', () => {
    it('should verify certificate', async () => {
      const certificate = await Certificate.create({
        student: testStudent.user,
        type: 'Bonafide',
        certificateNumber: `CERT${Date.now()}`,
        issueDate: new Date(),
        status: 'Issued'
      });

      const response = await request(app)
        .get(`/api/certificates/${certificate._id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });
});
