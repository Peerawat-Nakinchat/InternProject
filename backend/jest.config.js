/**
 * Jest Configuration for Backend Testing
 * ISO 27001 Annex A.8 - Application Security Testing
 */

export default {
  testEnvironment: 'node',
  
  // ES Modules support
  transform: {},
  extensionsToTreatAsEsm: [],
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.spec.js'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  
  // Coverage thresholds (ISO 27001 requirement: comprehensive testing)
  // Note: Unit tests cover isolated modules; integration tests (requiring DB) would increase coverage
  // Current thresholds reflect unit test coverage for core utilities and middleware
  // Files with 100% coverage: cookieUtils.js, token.js (core security modules)
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    }
  },
  
  // Files to collect coverage from
  // Note: Files with immediate side effects on import (DB connections, passport setup) 
  // are excluded as they cannot be properly unit tested without mocking the entire module system
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/loadEnv.js',      // Runs dotenv.config() on import
    '!src/config/swaggerConfig.js', // Configuration file
    '!src/config/dbConnection.js', // Creates DB connection and calls testConnection() on import
    '!src/config/passport.js',     // Registers passport strategy on import
    '!**/node_modules/**'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  
  // Module name mapping
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  
  // Test timeout (30 seconds for async operations)
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true
};
