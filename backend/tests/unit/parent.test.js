const request = require('supertest');
const app = require('../../server');
const { createAdminUser, createParentUser, createStudentUser } = require('../helpers/testHelpers');
const { createParentData } = require('../helpers/testFactories');

describe('Parent Controller', () => {
  let adminUser, adminToken;
  let parentUser, parentToken;
  let studentUser, studentToken;

  beforeAll(async () => {
    const admin = await createAdminUser(app);
    adminUser = admin.user;
    adminToken = admin.token;
    
    const parent = await createParentUser(app);
    parentUser = parent.user;
    parentToken = parent.token;

    const student = await createStudentUser(app);
    studentUser = student.user;
    studentToken = student.token;
  });

  describe('POST /api/parents - Create parent', () => {
    it('should create parent with valid data', async () => {
      const parentData = createParentData();

      const response = await request(app)
        .post('/api/parents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(parentData);

      expect([200, 201]).toContain(response.status);
    });

    it('should reject creation without authentication', async () => {
      const response = await request(app)
        .post('/api/parents')
        .send(createParentData());

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/parents - Get parents', () => {
    it('should retrieve all parents', async () => {
      const response = await request(app)
        .get('/api/parents')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/parents/:id - Get parent by ID', () => {
    it('should retrieve parent by ID', async () => {
      const response = await request(app)
        .get(`/api/parents/${parentUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/parents/:id - Update parent', () => {
    it('should update parent information', async () => {
      const response = await request(app)
        .put(`/api/parents/${parentUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ occupation: 'Doctor' });

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('DELETE /api/parents/:id - Delete parent', () => {
    it('should delete parent', async () => {
      const tempParent = await createParentUser(app);

      const response = await request(app)
        .delete(`/api/parents/${tempParent.user._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204]).toContain(response.status);
    });
  });
});
