const request = require('supertest');
const app = require('../../server');
const { createAdminUser, createTeacherUser } = require('../helpers/testHelpers');
const { createTeacherData } = require('../helpers/testFactories');

describe('Teacher Controller', () => {
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

  describe('POST /api/teachers - Create teacher', () => {
    it('should create teacher with valid data', async () => {
      const teacherData = createTeacherData();

      const response = await request(app)
        .post('/api/teachers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(teacherData);

      expect([200, 201]).toContain(response.status);
    });

    it('should reject creation without authentication', async () => {
      const response = await request(app)
        .post('/api/teachers')
        .send(createTeacherData());

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/teachers - Get teachers', () => {
    it('should retrieve all teachers', async () => {
      const response = await request(app)
        .get('/api/teachers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/teachers/:id - Get teacher by ID', () => {
    it('should retrieve teacher by ID', async () => {
      const response = await request(app)
        .get(`/api/teachers/${teacherUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/teachers/:id - Update teacher', () => {
    it('should update teacher information', async () => {
      const response = await request(app)
        .put(`/api/teachers/${teacherUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ subject: 'Physics' });

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('DELETE /api/teachers/:id - Delete teacher', () => {
    it('should delete teacher', async () => {
      const tempTeacher = await createTeacherUser(app);

      const response = await request(app)
        .delete(`/api/teachers/${tempTeacher.user._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204]).toContain(response.status);
    });
  });
});
