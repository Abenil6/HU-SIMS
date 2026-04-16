const request = require('supertest');
const app = require('../../server');
const { createAdminUser } = require('../helpers/testHelpers');

describe('Authentication', () => {
  let adminUser;
  let adminToken;

  beforeAll(async () => {
    // Create an admin user for testing
    const result = await createAdminUser(app);
    adminUser = result.user;
    adminToken = result.token;
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ 
          email: adminUser.email, 
          password: 'Admin123!' 
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ 
          email: adminUser.email, 
          password: 'wrongpassword' 
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ 
          email: 'nonexistent@test.com', 
          password: 'password123' 
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject login with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ 
          password: 'Admin123!' 
        });

      expect(response.status).toBe(400);
    });

    it('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ 
          email: adminUser.email 
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.email).toBe(adminUser.email);
      expect(response.body.data.role).toBe('SystemAdmin');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_token_here');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('should change password with valid current password', async () => {
      // First, create a new user for this test
      const testUser = await createAdminUser(app);
      
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          currentPassword: 'Admin123!',
          newPassword: 'NewPassword123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.user.email,
          password: 'NewPassword123!'
        });
      
      expect(loginResponse.status).toBe(200);
    });

    it('should reject password change with invalid current password', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!'
        });

      expect(response.status).toBe(401);
    });

    it('should reject password change without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .send({
          currentPassword: 'Admin123!',
          newPassword: 'NewPassword123!'
        });

      expect(response.status).toBe(401);
    });
  });
});
