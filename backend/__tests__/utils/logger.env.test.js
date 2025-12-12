/**
 * Logger Environment Configuration Tests
 * Target: Branch Coverage ≥ 96%
 * * Tests logger configuration for different NODE_ENV values
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Logger Environment Configuration', () => {
  let originalNodeEnv;
  let mockCreateLogger;
  let mockInfo;
  let mockWarn;
  let mockError;
  let mockDebug;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    jest.resetModules();

    // Setup mock logger
    mockInfo = jest.fn();
    mockWarn = jest.fn();
    mockError = jest.fn();
    mockDebug = jest.fn();

    mockCreateLogger = jest.fn(() => ({
      info: mockInfo,
      warn: mockWarn,
      error: mockError,
      debug: mockDebug,
    }));
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.resetModules();
  });

  describe('Development Environment', () => {
    it('should set log level to debug in development', async () => {
      process.env.NODE_ENV = 'development';

      // Mock winston
      jest.unstable_mockModule('winston', () => ({
        default: {
          createLogger: mockCreateLogger,
          format: {
            combine: jest.fn(() => 'combined-format'),
            timestamp: jest.fn(() => 'timestamp-format'),
            colorize: jest.fn(() => 'colorize-format'),
            printf: jest.fn((fn) => fn),
            json: jest.fn(() => 'json-format'),
            // ✅ เพิ่มตรงนี้
            errors: jest.fn(() => 'errors-format'),
            splat: jest.fn(() => 'splat-format'),
          },
          transports: {
            Console: jest.fn(),
            File: jest.fn(),
          },
          addColors: jest.fn(),
        },
      }));

      // Import logger after setting environment
      await import('../../src/utils/logger.js');

      // Check createLogger was called with debug level
      expect(mockCreateLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'debug',
        })
      );
    });
  });

  describe('Production Environment', () => {
    it('should set log level to info in production', async () => {
      process.env.NODE_ENV = 'production';

      jest.unstable_mockModule('winston', () => ({
        default: {
          createLogger: mockCreateLogger,
          format: {
            combine: jest.fn(() => 'combined-format'),
            timestamp: jest.fn(() => 'timestamp-format'),
            colorize: jest.fn(() => 'colorize-format'),
            printf: jest.fn((fn) => fn),
            json: jest.fn(() => 'json-format'),
            // ✅ เพิ่มตรงนี้
            errors: jest.fn(() => 'errors-format'),
            splat: jest.fn(() => 'splat-format'),
          },
          transports: {
            Console: jest.fn(),
            File: jest.fn(),
          },
          addColors: jest.fn(),
        },
      }));

      await import('../../src/utils/logger.js');

      expect(mockCreateLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
        })
      );
    });
  });

  describe('Test Environment', () => {
    it('should set log level to info in test', async () => {
      process.env.NODE_ENV = 'test';

      jest.unstable_mockModule('winston', () => ({
        default: {
          createLogger: mockCreateLogger,
          format: {
            combine: jest.fn(() => 'combined-format'),
            timestamp: jest.fn(() => 'timestamp-format'),
            colorize: jest.fn(() => 'colorize-format'),
            printf: jest.fn((fn) => fn),
            json: jest.fn(() => 'json-format'),
            // ✅ เพิ่มตรงนี้
            errors: jest.fn(() => 'errors-format'),
            splat: jest.fn(() => 'splat-format'),
          },
          transports: {
            Console: jest.fn(),
            File: jest.fn(),
          },
          addColors: jest.fn(),
        },
      }));

      await import('../../src/utils/logger.js');

      expect(mockCreateLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
        })
      );
    });
  });

  describe('Undefined Environment', () => {
    it('should set log level to info when NODE_ENV is undefined', async () => {
      delete process.env.NODE_ENV;

      jest.unstable_mockModule('winston', () => ({
        default: {
          createLogger: mockCreateLogger,
          format: {
            combine: jest.fn(() => 'combined-format'),
            timestamp: jest.fn(() => 'timestamp-format'),
            colorize: jest.fn(() => 'colorize-format'),
            printf: jest.fn((fn) => fn),
            json: jest.fn(() => 'json-format'),
            // ✅ เพิ่มตรงนี้
            errors: jest.fn(() => 'errors-format'),
            splat: jest.fn(() => 'splat-format'),
          },
          transports: {
            Console: jest.fn(),
            File: jest.fn(),
          },
          addColors: jest.fn(),
        },
      }));

      await import('../../src/utils/logger.js');

      expect(mockCreateLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
        })
      );
    });
  });
});