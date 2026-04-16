const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: '.env.test' });

/**
 * Connects to the test database
 * @returns {Promise<void>}
 */
async function connectTestDB() {
  try {
    const mongoURI = process.env.TEST_MONGO_URI;
    
    if (!mongoURI) {
      throw new Error('TEST_MONGO_URI is not defined in .env.test');
    }

    // Ensure we're not connecting to production database
    if (mongoURI.includes('sims_db') && !mongoURI.includes('test')) {
      throw new Error('TEST_MONGO_URI appears to point to production database! Use a separate test database.');
    }

    await mongoose.connect(mongoURI);
    console.log('✓ Connected to test database');
  } catch (error) {
    console.error('✗ Failed to connect to test database:', error.message);
    throw error;
  }
}

/**
 * Disconnects from the test database
 * @returns {Promise<void>}
 */
async function disconnectTestDB() {
  try {
    await mongoose.connection.close();
    console.log('✓ Disconnected from test database');
  } catch (error) {
    console.error('✗ Failed to disconnect from test database:', error.message);
    throw error;
  }
}

/**
 * Clears all collections in the test database
 * @returns {Promise<void>}
 */
async function clearTestDB() {
  try {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    
    console.log('✓ Cleared all test database collections');
  } catch (error) {
    console.error('✗ Failed to clear test database:', error.message);
    throw error;
  }
}

/**
 * Clears specific collections in the test database
 * @param {string[]} collectionNames - Array of collection names to clear
 * @returns {Promise<void>}
 */
async function clearCollections(collectionNames) {
  try {
    const collections = mongoose.connection.collections;
    
    for (const name of collectionNames) {
      if (collections[name]) {
        await collections[name].deleteMany({});
      }
    }
    
    console.log(`✓ Cleared collections: ${collectionNames.join(', ')}`);
  } catch (error) {
    console.error('✗ Failed to clear collections:', error.message);
    throw error;
  }
}

module.exports = {
  connectTestDB,
  disconnectTestDB,
  clearTestDB,
  clearCollections
};
