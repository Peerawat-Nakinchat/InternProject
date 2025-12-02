/**
 * Integration Test Setup
 * Sets up test environment with real database connection
 */

import { afterAll, beforeAll } from '@jest/globals';

// Load environment variables
process.env.NODE_ENV = 'test';

// Set database to use test database
process.env.DB_NAME = process.env.DB_NAME ? `${process.env.DB_NAME}_test` : 'intern_project_test';

// Clean up after all tests
afterAll(async () => {
  // Close database connections
  try {
    const { default: sequelize } = await import('../../src/config/dbConnection.js');
    await sequelize.close();
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
});
