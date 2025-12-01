/**
 * Jest Test Setup
 * ISO 27001 Annex A.8 - Test Environment Configuration
 */

import { jest, afterAll } from '@jest/globals';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.SKIP_DB_CONNECTION = 'true'; // Skip DB connection test
process.env.ACCESS_TOKEN_SECRET = 'test-access-secret-key-for-jwt-testing-12345';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-key-for-jwt-testing-12345';
process.env.ACCESS_EXPIRES = '15m';
process.env.REFRESH_EXPIRES = '7d';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
process.env.BCRYPT_SALT_ROUNDS = '10';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.PORT = '3001';
process.env.ENABLE_TOKEN_ROTATION = 'false';

// Mock console to reduce noise during testing
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  group: jest.fn(),
  groupEnd: jest.fn()
};

// Restore console for debugging when needed
global.enableTestLogs = () => {
  global.console = originalConsole;
};

// Increase timeout for async operations
jest.setTimeout(30000);

// Clean up after all tests
afterAll(async () => {
  // Allow pending operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));
});
