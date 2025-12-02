/**
 * Jest Configuration for Integration Tests
 * Tests that require database connection
 * Run with: npm run test:integration
 */

export default {
  testEnvironment: 'node',
  
  // ES Modules support
  transform: {},
  
  // Only run integration tests
  testMatch: [
    '**/__tests__/integration/**/*.test.js',
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Collect coverage from models
  collectCoverageFrom: [
    'src/models/**/*.js',
  ],
  
  // Setup files - no mocking for integration tests
  setupFilesAfterEnv: ['<rootDir>/__tests__/integration/setup.js'],
  
  // Longer timeout for DB operations
  testTimeout: 60000,
  
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  clearMocks: true,
};
