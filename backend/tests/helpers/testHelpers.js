const request = require('supertest');
const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const VerificationToken = require('../../models/VerificationToken');
const { clearCollections } = require('../../config/testDb');
const { generateToken } = require('../../utils/emailService');
const { saveSystemSettings } = require('../../utils/systemSettings');

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
    console.error('Login failed for', email, ':', response.body);
    throw new Error(`Login failed: ${response.body.message || 'Unknown error'}`);
  }
  
  console.log('Login successful for', email, 'token length:', response.body.token?.length);
  return response.body.token;
}

/**
 * Creates a user following the production flow:
 * 1. Create user without password (status: Pending, isVerified: false, mustSetPassword: true)
 * 2. Generate verification token
 * 3. Verify email and set password
 * 4. Login and return token
 * @param {Object} app - Express application
 * @param {Object} userData - User data (email, username, role, firstName, lastName)
 * @param {string} password - Password to set after verification
 * @returns {Promise<{user: Object, token: string}>}
 */
async function createUserWithAuthFlow(app, userData, password) {
  // For tests, create user directly with hashed password to avoid email verification complexity
  // This is a common testing pattern - separate tests should cover the full email verification flow
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await User.create({
    ...userData,
    password: hashedPassword,
    status: 'Active',
    isVerified: true,
    mustSetPassword: false
  });
  
  const authToken = await getAuthToken(app, user.email, password);
  
  return { user, token: authToken };
}

/**
 * Creates an admin user and returns user + token
 * @param {Object} app - Express application
 * @returns {Promise<{user: Object, token: string}>}
 */
async function createAdminUser(app) {
  const password = 'Admin123!';
  const timestamp = Date.now();
  
  return createUserWithAuthFlow(app, {
    email: `admin${timestamp}@school.com`,
    username: `admin${timestamp}`,
    firstName: 'Admin',
    lastName: 'User',
    role: 'SchoolAdmin' // SchoolAdmin has all school operation permissions
  }, password);
}

/**
 * Creates a teacher user and returns user + token
 * @param {Object} app - Express application
 * @returns {Promise<{user: Object, token: string}>}
 */
async function createTeacherUser(app) {
  const password = 'Teacher123!';
  const timestamp = Date.now();
  
  return createUserWithAuthFlow(app, {
    email: `teacher${timestamp}@school.com`,
    username: `teacher${timestamp}`,
    firstName: 'Teacher',
    lastName: 'User',
    role: 'Teacher'
  }, password);
}

/**
 * Creates a student user and returns user + token
 * @param {Object} app - Express application
 * @returns {Promise<{user: Object, token: string}>}
 */
async function createStudentUser(app) {
  const password = 'Student123!';
  const timestamp = Date.now();
  
  return createUserWithAuthFlow(app, {
    email: `student${timestamp}@school.com`,
    username: `student${timestamp}`,
    firstName: 'Student',
    lastName: 'User',
    role: 'Student'
  }, password);
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
  const timestamp = Date.now();
  
  return createUserWithAuthFlow(app, {
    email: `parent${timestamp}@school.com`,
    username: `parent${timestamp}`,
    firstName: 'Parent',
    lastName: 'User',
    role: 'Parent'
  }, password);
}

module.exports = {
  getAuthToken,
  createAdminUser,
  createTeacherUser,
  createStudentUser,
  createParentUser,
  clearTestCollections
};
