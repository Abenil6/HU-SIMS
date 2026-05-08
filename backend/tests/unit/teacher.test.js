const request = require('supertest');
const app = require('../../server');
const { createAdminUser, createTeacherUser } = require('../helpers/testHelpers');
const { createTeacherData } = require('../helpers/testFactories');
const VerificationToken = require('../../models/VerificationToken');

describe('Teacher Controller', () => {
  let adminUser, adminToken;
  let teacherUser, teacherToken;

  beforeEach(async () => {
    const admin = await createAdminUser(app);
    adminUser = admin.user;
    adminToken = admin.token;
    
    const teacher = await createTeacherUser(app);
    teacherUser = teacher.user;
    teacherToken = teacher.token;
  });

  describe('POST /api/admin/users - Create teacher (admin endpoint)', () => {
    it('should create teacher with valid data', async () => {
      const teacherData = createTeacherData();

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(teacherData);

      expect([200, 201]).toContain(response.status);
    });

    it('should reject creation without authentication', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .send(createTeacherData());

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/admin/users - Get teachers', () => {
    it('should retrieve all teachers', async () => {
      const response = await request(app)
        .get('/api/admin/users?role=Teacher')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/admin/users/:id - Get teacher by ID', () => {
    it('should retrieve teacher by ID', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${teacherUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/admin/users/:id - Update teacher', () => {
    it('should update teacher information', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${teacherUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Updated', lastName: 'Teacher' });

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('DELETE /api/admin/users/:id - Delete teacher', () => {
    it('should delete teacher (SystemAdmin only)', async () => {
      // Create a temporary teacher via admin endpoint
      const teacherData = createTeacherData();
      const createResponse = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(teacherData);

      expect([200, 201]).toContain(createResponse.status);
      
      const teacherId = createResponse.body.user._id || createResponse.body.user.id;

      // SchoolAdmin cannot delete users - only SystemAdmin can
      const response = await request(app)
        .delete(`/api/admin/users/${teacherId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(403); // Forbidden for SchoolAdmin
    });
  });

  describe('Teacher-specific endpoints', () => {
    it('should get teacher profile', async () => {
      const response = await request(app)
        .get('/api/teachers/profile')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
    });
  });
});
