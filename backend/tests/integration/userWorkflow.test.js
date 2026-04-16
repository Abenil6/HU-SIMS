const request = require('supertest');
const app = require('../../server');
const { createAdminUser } = require('../helpers/testHelpers');
const { createUserData } = require('../helpers/testFactories');

describe('User Workflow Integration Tests', () => {
  let adminToken;

  beforeAll(async () => {
    const result = await createAdminUser(app);
    adminToken = result.token;
  });

  describe('Complete user registration and login workflow', () => {
    it('should create user, login, and update profile', async () => {
      // Step 1: Admin creates a new user
      const userData = createUserData({
        role: 'Teacher',
        subject: 'Physics'
      });

      const createResponse = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);
      
      const userId = createResponse.body.user._id || createResponse.body.user.id;

      // Step 2: User logs in
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.token).toBeDefined();
      
      const userToken = loginResponse.body.token;

      // Step 3: User views their profile
      const profileResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.data.email).toBe(userData.email);

      // Step 4: User updates their profile
      const updateResponse = await request(app)
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Teacher'
        });

      expect(updateResponse.status).toBe(200);
    });
  });

  describe('Error handling in multi-step operations', () => {
    it('should handle invalid data gracefully', async () => {
      // Try to create user with invalid email
      const invalidUserData = createUserData({
        email: 'invalid-email-format'
      });

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidUserData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should prevent unauthorized access to protected resources', async () => {
      // Try to access admin endpoint without token
      const response = await request(app)
        .get('/api/admin/users');

      expect(response.status).toBe(401);
    });
  });

  describe('Data consistency across operations', () => {
    it('should maintain referential integrity', async () => {
      // Create a user
      const userData = createUserData();
      
      const createResponse = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      expect(createResponse.status).toBe(201);
      
      const userId = createResponse.body.user._id || createResponse.body.user.id;

      // Verify user exists in database
      const getUserResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getUserResponse.status).toBe(200);
      
      const users = getUserResponse.body.data || getUserResponse.body.users;
      const createdUser = users.find(u => u._id === userId || u.id === userId);
      
      expect(createdUser).toBeDefined();
      expect(createdUser.email).toBe(userData.email);
    });
  });
});
