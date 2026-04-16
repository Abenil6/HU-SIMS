const request = require('supertest');
const app = require('../../server');
const { createAdminUser, createTeacherUser } = require('../helpers/testHelpers');
const { createAcademicYearData } = require('../helpers/testFactories');
const AcademicYear = require('../../models/AcademicYear');

describe('Academic Year Controller', () => {
  let adminUser, adminToken;
  let teacherUser, teacherToken;

  beforeAll(async () => {
    const admin = await createAdminUser(app);
    adminUser = admin.user;
    adminToken = admin.token;
    
    const teacher = await createTeacherUser(app);
    teacherUser = teacher.user;
    teacherToken = teacher.token;
  });

  describe('POST /api/academic-years - Create academic year', () => {
    it('should create academic year with valid data', async () => {
      const yearData = createAcademicYearData();

      const response = await request(app)
        .post('/api/academic-years')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(yearData);

      expect([200, 201]).toContain(response.status);
    });

    it('should reject creation without authentication', async () => {
      const response = await request(app)
        .post('/api/academic-years')
        .send(createAcademicYearData());

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/academic-years - Get academic years', () => {
    it('should retrieve all academic years', async () => {
      const response = await request(app)
        .get('/api/academic-years')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/academic-years/active - Get active academic year', () => {
    it('should retrieve active academic year', async () => {
      const response = await request(app)
        .get('/api/academic-years/active')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/academic-years/:id - Update academic year', () => {
    it('should update academic year', async () => {
      const year = await AcademicYear.create({
        year: '2025-2026',
        startDate: '2025-09-01',
        endDate: '2026-06-30',
        isActive: false
      });

      const response = await request(app)
        .put(`/api/academic-years/${year._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true });

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('DELETE /api/academic-years/:id - Delete academic year', () => {
    it('should delete academic year', async () => {
      const year = await AcademicYear.create({
        year: '2024-2025',
        startDate: '2024-09-01',
        endDate: '2025-06-30',
        isActive: false
      });

      const response = await request(app)
        .delete(`/api/academic-years/${year._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204]).toContain(response.status);
    });
  });
});
