const request = require('supertest');
const app = require('../../server');
const { createAdminUser, createTeacherUser } = require('../helpers/testHelpers');
const { createUserData } = require('../helpers/testFactories');

describe('User Management', () => {
  let adminUser;
  let adminToken;
  let testUserId;

  beforeAll(async () => {
    const result = await createAdminUser(app);
    adminUser = result.user;
    adminToken = result.token;
  });

  describe('POST /api/admin/users', () => {
    it('should create new user with admin token', async () => {
      const userData = createUserData({
        role: 'Teacher',
        subject: 'Mathematics'
      });

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(userData.email);
      
      testUserId = response.body.user._id || response.body.user.id;
    });

    it('should reject creation without admin token', async () => {
      const userData = createUserData();

      const response = await request(app)
        .post('/api/admin/users')
        .send(userData);

      expect(response.status).toBe(401);
    });

    it('should reject duplicate email', async () => {
      const userData = createUserData();
      
      // Create first user
      await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/already|exist|duplicate/i);
    });

    it('should reject creation with invalid email', async () => {
      const userData = createUserData({ email: 'invalid-email' });

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/admin/users', () => {
    it('should list all users for admin', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data || response.body.users)).toBe(true);
    });

    it('should filter users by role', async () => {
      // Create a teacher user
      await createTeacherUser(app);

      const response = await request(app)
        .get('/api/admin/users?role=Teacher')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const users = response.body.data || response.body.users;
      expect(Array.isArray(users)).toBe(true);
      
      if (users.length > 0) {
        users.forEach(user => {
          expect(user.role).toBe('Teacher');
        });
      }
    });

    it('should reject list request without authentication', async () => {
      const response = await request(app)
        .get('/api/admin/users');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/admin/users/:id', () => {
    it('should update user details', async () => {
      if (!testUserId) {
        // Create a user if we don't have one
        const userData = createUserData();
        const createResponse = await request(app)
          .post('/api/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(userData);
        testUserId = createResponse.body.user._id || createResponse.body.user.id;
      }

      const response = await request(app)
        .put(`/api/admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          firstName: 'Updated', 
          lastName: 'Name' 
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject update without authentication', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${testUserId}`)
        .send({ firstName: 'Updated' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('should delete user', async () => {
      // Create a user to delete
      const userData = createUserData();
      const createResponse = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);
      
      const userId = createResponse.body.user._id || createResponse.body.user.id;

      const response = await request(app)
        .delete(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should reject delete without authentication', async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${testUserId}`);

      expect(response.status).toBe(401);
    });
  });
});
