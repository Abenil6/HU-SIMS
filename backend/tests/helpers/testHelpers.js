const request = require('supertest');
const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const { clearCollections } = require('../../config/testDb');

/**
 * Authenticates a user and returns JWT token
 * @param {Object} app - Express application
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<string>} JWT token
 */
async function getAuthToken(app, email, password) {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  
  if (response.status !== 200) {
    throw new Error(`Login failed: ${response.body.message || 'Unknown error'}`);
  }
  
  return response.body.token;
}

/**
 * Creates an admin user and returns user + token
 * @param {Object} app - Express application
 * @returns {Promise<{user: Object, token: string}>}
 */
async function createAdminUser(app) {
  const password = 'Admin123!';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await User.create({
    email: `admin${Date.now()}@school.com`,
    username: `admin${Date.now()}`,
    firstName: 'Admin',
    lastName: 'User',
    role: 'SchoolAdmin', // Changed from SystemAdmin - SchoolAdmin has all school operation permissions
    password: hashedPassword,
    status: 'Active',
    isVerified: true,
    mustSetPassword: false
  });
  
  const token = await getAuthToken(app, user.email, password);
  
  return { user, token };
}

/**
 * Creates a teacher user and returns user + token
 * @param {Object} app - Express application
 * @returns {Promise<{user: Object, token: string}>}
 */
async function createTeacherUser(app) {
  const password = 'Teacher123!';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await User.create({
    email: `teacher${Date.now()}@school.com`,
    username: `teacher${Date.now()}`,
    firstName: 'Teacher',
    lastName: 'User',
    role: 'Teacher',
    password: hashedPassword,
    status: 'Active',
    isVerified: true,
    mustSetPassword: false
  });
  
  const token = await getAuthToken(app, user.email, password);
  
  return { user, token };
}

/**
 * Creates a student user and returns user + token
 * @param {Object} app - Express application
 * @returns {Promise<{user: Object, token: string}>}
 */
async function createStudentUser(app) {
  const password = 'Student123!';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await User.create({
    email: `student${Date.now()}@school.com`,
    username: `student${Date.now()}`,
    firstName: 'Student',
    lastName: 'User',
    role: 'Student',
    password: hashedPassword,
    status: 'Active',
    isVerified: true,
    mustSetPassword: false
  });
  
  const token = await getAuthToken(app, user.email, password);
  
  return { user, token };
}

/**
 * Clears all data from specified collections
 * @param {string[]} collections - Array of collection names
 * @returns {Promise<void>}
 */
async function clearTestCollections(collections) {
  await clearCollections(collections);
}

/**
 * Creates a parent user and returns user + token
 * @param {Object} app - Express application
 * @returns {Promise<{user: Object, token: string}>}
 */
async function createParentUser(app) {
  const password = 'Parent123!';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await User.create({
    email: `parent${Date.now()}@school.com`,
    username: `parent${Date.now()}`,
    firstName: 'Parent',
    lastName: 'User',
    role: 'Parent',
    password: hashedPassword,
    status: 'Active',
    isVerified: true,
    mustSetPassword: false
  });
  
  const token = await getAuthToken(app, user.email, password);
  
  return { user, token };
}

module.exports = {
  getAuthToken,
  createAdminUser,
  createTeacherUser,
  createStudentUser,
  createParentUser,
  clearTestCollections
};
