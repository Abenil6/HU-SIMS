const { connectTestDB, disconnectTestDB, clearTestDB } = require('../../config/testDb');
const Permission = require('../../models/Permission');

// Set test timeout to 30 seconds for database operations
jest.setTimeout(30000);

// Connect to test database before all tests
beforeAll(async () => {
  try {
    await connectTestDB();
    await clearTestDB(); // Start with clean database
    
    // Initialize default permissions for all roles
    await Permission.initializeDefaultPermissions();
    console.log('✓ Initialized default permissions');
  } catch (error) {
    console.error('Failed to set up test database:', error);
    process.exit(1);
  }
}, 30000);

// Clean up test data after each test
afterEach(async () => {
  try {
    // Clear all collections EXCEPT permissions
    const mongoose = require('mongoose');
    const collections = Object.keys(mongoose.connection.collections);
    
    for (const collectionName of collections) {
      if (collectionName !== 'permissions') { // Keep permissions between tests
        await mongoose.connection.collections[collectionName].deleteMany({});
      }
    }
    console.log('✓ Cleared all test database collections (kept permissions)');
  } catch (error) {
    console.error('Failed to clean up test data:', error);
    // Don't fail the test, but log the error
  }
});

// Disconnect from test database after all tests
afterAll(async () => {
  try {
    await disconnectTestDB();
  } catch (error) {
    console.error('Failed to disconnect from test database:', error);
  }
}, 30000);
