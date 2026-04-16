const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const Permission = require('../models/Permission');
const mongoose = require('mongoose');

describe('SystemAdmin Permission Tests', () => {
  let systemAdminToken;
  let schoolAdminToken;
  let systemAdminId;
  let schoolAdminId;

  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/sims_test';
    await mongoose.connect(mongoUri);
    
    // Initialize permissions
    await Permission.initializeDefaultPermissions();
  });

  afterAll(async () => {
    // Clean up and close connection
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up users
    await User.deleteMany({});
    
    // Create test users
    const systemAdmin = new User({
      username: 'systemadmin',
      email: 'systemadmin@test.com',
      password: 'password123',
      role: 'SystemAdmin',
      firstName: 'System',
      lastName: 'Admin',
      status: 'Active',
      isVerified: true,
      mustSetPassword: false
    });
    
    const schoolAdmin = new User({
      username: 'schooladmin',
      email: 'schooladmin@test.com',
      password: 'password123',
      role: 'SchoolAdmin',
      firstName: 'School',
      lastName: 'Admin',
      status: 'Active',
      isVerified: true,
      mustSetPassword: false
    });
    
    await systemAdmin.save();
    await schoolAdmin.save();
    
    systemAdminId = systemAdmin._id;
    schoolAdminId = schoolAdmin._id;
    
    // Get tokens
    const systemAdminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'systemadmin@test.com',
        password: 'password123'
      });
    
    const schoolAdminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'schooladmin@test.com',
        password: 'password123'
      });
    
    systemAdminToken = systemAdminLogin.body.token;
    schoolAdminToken = schoolAdminLogin.body.token;
  });

  describe('SystemAdmin should have access to technical resources', () => {
    test('Should access user management endpoints', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });

    test('Should access system monitoring endpoints', async () => {
      const response = await request(app)
        .get('/api/system/stats')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });

    test('Should access audit logs', async () => {
      const response = await request(app)
        .get('/api/system/audit-logs')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });

    test('Should access security alerts', async () => {
      const response = await request(app)
        .get('/api/system/security-alerts')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });
  });

  describe('SystemAdmin should NOT have access to school operational resources', () => {
    test('Should NOT access academic records', async () => {
      const response = await request(app)
        .get('/api/academic-records')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Permission denied');
    });

    test('Should NOT access attendance records', async () => {
      const response = await request(app)
        .get('/api/attendance')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Permission denied');
    });

    test('Should NOT access timetables', async () => {
      const response = await request(app)
        .get('/api/timetables')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Permission denied');
    });

    test('Should NOT access certificates', async () => {
      const response = await request(app)
        .get('/api/certificates')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Permission denied');
    });

    test('Should NOT access announcements', async () => {
      const response = await request(app)
        .get('/api/announcements/admin')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
    });

    test('Should NOT access reports', async () => {
      const response = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Permission denied');
    });

    test('Should NOT access messages', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send({
          recipientId: schoolAdminId,
          subject: 'Test Message',
          content: 'This should fail'
        })
        .expect(403);
      
      expect(response.body.success).toBe(false);
    });
  });

  describe('SchoolAdmin should still have access to school operational resources', () => {
    test('Should access academic records', async () => {
      const response = await request(app)
        .get('/api/academic-records')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });

    test('Should access attendance records', async () => {
      const response = await request(app)
        .get('/api/attendance')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });

    test('Should access certificates', async () => {
      const response = await request(app)
        .get('/api/certificates')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });

    test('Should access announcements', async () => {
      const response = await request(app)
        .get('/api/announcements/admin')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });
  });

  describe('SystemAdmin user management should work correctly', () => {
    test('Should create new users', async () => {
      const newUser = {
        username: 'newuser',
        email: 'newuser@test.com',
        password: 'password123',
        role: 'Teacher',
        firstName: 'New',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send(newUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe(newUser.username);
    });

    test('Should update user roles', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${schoolAdminId}`)
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send({
          role: 'Teacher'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('Should manage user accounts', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${schoolAdminId}/deactivate`)
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Audit logging should work', () => {
    test('Should create audit logs for user actions', async () => {
      // Perform an action
      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${systemAdminToken}`);

      // Check if audit log was created
      const response = await request(app)
        .get('/api/system/audit-logs')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });
});

// Permission validation helper
const validatePermissions = async (role, expectedPermissions) => {
  const permissions = await Permission.getRolePermissions(role);
  
  for (const [resource, actions] of Object.entries(expectedPermissions)) {
    if (actions.length === 0) {
      expect(permissions[resource]).toBeUndefined();
    } else {
      expect(permissions[resource]).toEqual(expect.arrayContaining(actions));
    }
  }
};

describe('Permission Configuration Tests', () => {
  beforeAll(async () => {
    await Permission.initializeDefaultPermissions();
  });

  test('SystemAdmin should have correct permissions', async () => {
    const expectedSystemAdminPermissions = {
      [require('../models/Permission').RESOURCES.USERS]: Object.values(require('../models/Permission').PERMISSIONS),
      [require('../models/Permission').RESOURCES.STUDENTS]: ['READ', 'WRITE', 'EDIT'],
      [require('../models/Permission').RESOURCES.TEACHERS]: ['READ', 'WRITE', 'EDIT'],
      [require('../models/Permission').RESOURCES.PARENTS]: ['READ', 'WRITE', 'EDIT'],
      [require('../models/Permission').RESOURCES.SETTINGS]: Object.values(require('../models/Permission').PERMISSIONS),
      // Should NOT have these permissions
      [require('../models/Permission').RESOURCES.ACADEMIC_RECORDS]: [],
      [require('../models/Permission').RESOURCES.ATTENDANCE]: [],
      [require('../models/Permission').RESOURCES.TIMETABLES]: [],
      [require('../models/Permission').RESOURCES.REPORTS]: [],
      [require('../models/Permission').RESOURCES.MESSAGES]: [],
      [require('../models/Permission').RESOURCES.CERTIFICATES]: []
    };

    await validatePermissions('SystemAdmin', expectedSystemAdminPermissions);
  });
});

module.exports = {
  validatePermissions
};
