/**
 * Jest Configuration for Backend Testing
 * ISO 27001 Annex A.8 - Application Security Testing
 */

export default {
  testEnvironment: 'node',
  transform: {},

  roots: ['<rootDir>/__tests__', '<rootDir>/src'],
  moduleDirectories: ['node_modules', '<rootDir>/__tests__/__mocks__'],

  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.spec.js'
  ],

  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    }
  },

  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/loadEnv.js',
    '!src/config/swaggerConfig.js',
    '!src/config/dbConnection.js',
    '!src/config/passport.js',
    '!**/node_modules/**'
  ],

  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],

  moduleNameMapper: {
    '^isomorphic-dompurify$': '<rootDir>/__tests__/__mocks__/isomorphic-dompurify.js'
  },

  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  clearMocks: true,
  restoreMocks: true
};
