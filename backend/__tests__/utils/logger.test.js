/**
 * Logger Utilities Unit Tests
 * Target: Branch Coverage ≥ 96%
 * * Tests winston logger configuration and security logging functions
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Store the printf callback for testing
let printfCallback = null;

// Mock winston before importing logger
const mockInfo = jest.fn();
const mockWarn = jest.fn();
const mockError = jest.fn();
const mockDebug = jest.fn();

const mockLogger = {
  info: mockInfo,
  warn: mockWarn,
  error: mockError,
  debug: mockDebug,
};

const mockConsoleTransport = jest.fn();
const mockFileTransport = jest.fn();

const mockFormat = {
  combine: jest.fn(() => 'combined-format'),
  timestamp: jest.fn(() => 'timestamp-format'),
  colorize: jest.fn(() => 'colorize-format'),
  printf: jest.fn((fn) => {
    // Store the printf function to test format logic
    printfCallback = fn;
    return 'printf-format';
  }),
  json: jest.fn(() => 'json-format'),
  // ✅ เพิ่ม Mock errors และ splat ที่ขาดหายไป
  errors: jest.fn(() => 'errors-format'),
  splat: jest.fn(() => 'splat-format'),
};

jest.unstable_mockModule('winston', () => ({
  default: {
    createLogger: jest.fn(() => mockLogger),
    format: mockFormat,
    transports: {
      Console: mockConsoleTransport,
      File: mockFileTransport,
    },
    addColors: jest.fn(),
  },
  createLogger: jest.fn(() => mockLogger),
  format: mockFormat,
  transports: {
    Console: mockConsoleTransport,
    File: mockFileTransport,
  },
  addColors: jest.fn(),
}));

// Import after mocking
const { securityLogger, default: logger } = await import('../../src/utils/logger.js');

describe('Logger Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Date for consistent timestamps
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================================
  // SECURITY LOGGER TESTS
  // ============================================================

  describe('securityLogger', () => {
    describe('loginSuccess', () => {
      it('should log successful login with all required fields', () => {
        const userId = 'user-123';
        const email = 'test@example.com';
        const ipAddress = '192.168.1.1';
        const userAgent = 'Mozilla/5.0';

        securityLogger.loginSuccess(userId, email, ipAddress, userAgent);

        expect(mockInfo).toHaveBeenCalledTimes(1);
        expect(mockInfo).toHaveBeenCalledWith('LOGIN_SUCCESS', {
          userId,
          email,
          ipAddress,
          userAgent,
          timestamp: expect.any(String),
        });
      });

      it('should include ISO timestamp', () => {
        securityLogger.loginSuccess('user-1', 'test@test.com', '127.0.0.1', 'Chrome');

        const call = mockInfo.mock.calls[0];
        expect(call[1].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });

      it('should handle empty string values', () => {
        securityLogger.loginSuccess('', '', '', '');

        expect(mockInfo).toHaveBeenCalledWith('LOGIN_SUCCESS', {
          userId: '',
          email: '',
          ipAddress: '',
          userAgent: '',
          timestamp: expect.any(String),
        });
      });

      it('should handle null/undefined values', () => {
        securityLogger.loginSuccess(null, undefined, null, undefined);

        expect(mockInfo).toHaveBeenCalledWith('LOGIN_SUCCESS', {
          userId: null,
          email: undefined,
          ipAddress: null,
          userAgent: undefined,
          timestamp: expect.any(String),
        });
      });
    });

    describe('loginFailed', () => {
      it('should log failed login with all required fields', () => {
        const email = 'test@example.com';
        const ipAddress = '192.168.1.1';
        const userAgent = 'Mozilla/5.0';
        const reason = 'Invalid password';

        securityLogger.loginFailed(email, ipAddress, userAgent, reason);

        expect(mockWarn).toHaveBeenCalledTimes(1);
        expect(mockWarn).toHaveBeenCalledWith('LOGIN_FAILED', {
          email,
          ipAddress,
          userAgent,
          reason,
          timestamp: expect.any(String),
        });
      });

      it('should handle various failure reasons', () => {
        const reasons = ['Invalid password', 'Account locked', 'User not found', 'Too many attempts'];
        
        reasons.forEach(reason => {
          mockWarn.mockClear();
          securityLogger.loginFailed('test@test.com', '127.0.0.1', 'Chrome', reason);
          expect(mockWarn).toHaveBeenCalledWith('LOGIN_FAILED', expect.objectContaining({ reason }));
        });
      });
    });

    describe('registrationSuccess', () => {
      it('should log successful registration with all required fields', () => {
        const userId = 'new-user-456';
        const email = 'newuser@example.com';
        const ipAddress = '10.0.0.1';
        const userAgent = 'Safari/17.0';

        securityLogger.registrationSuccess(userId, email, ipAddress, userAgent);

        expect(mockInfo).toHaveBeenCalledWith('REGISTRATION_SUCCESS', {
          userId,
          email,
          ipAddress,
          userAgent,
          timestamp: expect.any(String),
        });
      });
    });

    describe('registrationFailed', () => {
      it('should log failed registration with reason', () => {
        const email = 'existing@example.com';
        const ipAddress = '10.0.0.1';
        const userAgent = 'Firefox/120';
        const reason = 'Email already exists';

        securityLogger.registrationFailed(email, ipAddress, userAgent, reason);

        expect(mockWarn).toHaveBeenCalledWith('REGISTRATION_FAILED', {
          email,
          ipAddress,
          userAgent,
          reason,
          timestamp: expect.any(String),
        });
      });
    });

    describe('passwordResetRequest', () => {
      it('should log password reset request when user exists', () => {
        const email = 'user@example.com';
        const ipAddress = '192.168.0.100';
        const userAgent = 'Chrome/120';
        const userExists = true;

        securityLogger.passwordResetRequest(email, ipAddress, userAgent, userExists);

        expect(mockInfo).toHaveBeenCalledWith('PASSWORD_RESET_REQUEST', {
          email,
          ipAddress,
          userAgent,
          userExists: true,
          timestamp: expect.any(String),
        });
      });

      it('should log password reset request when user does not exist', () => {
        securityLogger.passwordResetRequest('unknown@test.com', '127.0.0.1', 'Mozilla', false);

        expect(mockInfo).toHaveBeenCalledWith('PASSWORD_RESET_REQUEST', {
          email: 'unknown@test.com',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla',
          userExists: false,
          timestamp: expect.any(String),
        });
      });
    });

    describe('passwordResetSuccess', () => {
      it('should log successful password reset', () => {
        const userId = 'user-789';
        const email = 'reset@example.com';
        const ipAddress = '10.10.10.10';
        const userAgent = 'Edge/120';

        securityLogger.passwordResetSuccess(userId, email, ipAddress, userAgent);

        expect(mockInfo).toHaveBeenCalledWith('PASSWORD_RESET_SUCCESS', {
          userId,
          email,
          ipAddress,
          userAgent,
          timestamp: expect.any(String),
        });
      });
    });

    describe('passwordResetFailed', () => {
      it('should log failed password reset with reason', () => {
        const email = 'fail@example.com';
        const ipAddress = '172.16.0.1';
        const userAgent = 'Opera/100';
        const reason = 'Token expired';

        securityLogger.passwordResetFailed(email, ipAddress, userAgent, reason);

        expect(mockWarn).toHaveBeenCalledWith('PASSWORD_RESET_FAILED', {
          email,
          ipAddress,
          userAgent,
          reason,
          timestamp: expect.any(String),
        });
      });

      it('should handle invalid token reason', () => {
        securityLogger.passwordResetFailed('test@test.com', '1.1.1.1', 'Chrome', 'Invalid token');

        expect(mockWarn).toHaveBeenCalledWith('PASSWORD_RESET_FAILED', 
          expect.objectContaining({ reason: 'Invalid token' })
        );
      });
    });

    describe('tokenRefresh', () => {
      it('should log token refresh event', () => {
        const userId = 'user-refresh-123';
        const ipAddress = '192.168.100.50';
        const userAgent = 'Mobile Safari';

        securityLogger.tokenRefresh(userId, ipAddress, userAgent);

        expect(mockInfo).toHaveBeenCalledWith('TOKEN_REFRESH', {
          userId,
          ipAddress,
          userAgent,
          timestamp: expect.any(String),
        });
      });
    });

    describe('logout', () => {
      it('should log logout event', () => {
        const userId = 'user-logout-456';
        const ipAddress = '10.20.30.40';
        const userAgent = 'Chrome Mobile';

        securityLogger.logout(userId, ipAddress, userAgent);

        expect(mockInfo).toHaveBeenCalledWith('LOGOUT', {
          userId,
          ipAddress,
          userAgent,
          timestamp: expect.any(String),
        });
      });
    });

    describe('suspiciousActivity', () => {
      it('should log suspicious activity with metadata', () => {
        const description = 'Multiple failed login attempts';
        const ipAddress = '203.0.113.50';
        const userAgent = 'curl/7.88.1';
        const metadata = { attempts: 10, timeWindow: '5 minutes' };

        securityLogger.suspiciousActivity(description, ipAddress, userAgent, metadata);

        expect(mockError).toHaveBeenCalledWith('SUSPICIOUS_ACTIVITY', {
          description,
          ipAddress,
          userAgent,
          metadata,
          timestamp: expect.any(String),
        });
      });

      it('should handle empty metadata', () => {
        securityLogger.suspiciousActivity('Brute force detected', '8.8.8.8', 'Bot/1.0');

        expect(mockError).toHaveBeenCalledWith('SUSPICIOUS_ACTIVITY', {
          description: 'Brute force detected',
          ipAddress: '8.8.8.8',
          userAgent: 'Bot/1.0',
          metadata: {},
          timestamp: expect.any(String),
        });
      });

      it('should handle complex metadata objects', () => {
        const complexMetadata = {
          attackType: 'SQL injection',
          payload: "'; DROP TABLE users; --",
          severity: 'critical',
          blocked: true,
        };

        securityLogger.suspiciousActivity('SQL Injection attempt', '1.2.3.4', 'sqlmap', complexMetadata);

        expect(mockError).toHaveBeenCalledWith('SUSPICIOUS_ACTIVITY', 
          expect.objectContaining({ metadata: complexMetadata })
        );
      });
    });

    describe('unauthorizedAccess', () => {
      it('should log unauthorized access attempt', () => {
        const userId = 'user-unauth-789';
        const email = 'hacker@evil.com';
        const resource = '/admin/users';
        const ipAddress = '66.66.66.66';
        const userAgent = 'Postman/10.0';

        securityLogger.unauthorizedAccess(userId, email, resource, ipAddress, userAgent);

        expect(mockWarn).toHaveBeenCalledWith('UNAUTHORIZED_ACCESS', {
          userId,
          email,
          resource,
          ipAddress,
          userAgent,
          timestamp: expect.any(String),
        });
      });

      it('should handle various protected resources', () => {
        const resources = ['/admin/settings', '/api/v1/secrets', '/internal/debug'];

        resources.forEach(resource => {
          mockWarn.mockClear();
          securityLogger.unauthorizedAccess('user-1', 'test@test.com', resource, '127.0.0.1', 'Chrome');
          expect(mockWarn).toHaveBeenCalledWith('UNAUTHORIZED_ACCESS', 
            expect.objectContaining({ resource })
          );
        });
      });
    });

    describe('accountLockout', () => {
      it('should log account lockout event', () => {
        const userId = 'locked-user-001';
        const email = 'locked@example.com';
        const ipAddress = '99.99.99.99';
        const reason = 'Too many failed login attempts';

        securityLogger.accountLockout(userId, email, ipAddress, reason);

        expect(mockError).toHaveBeenCalledWith('ACCOUNT_LOCKOUT', {
          userId,
          email,
          ipAddress,
          reason,
          timestamp: expect.any(String),
        });
      });

      it('should handle various lockout reasons', () => {
        const lockoutReasons = [
          'Too many failed login attempts',
          'Suspicious activity detected',
          'Admin action',
          'Policy violation',
        ];

        lockoutReasons.forEach(reason => {
          mockError.mockClear();
          securityLogger.accountLockout('user-x', 'x@x.com', '0.0.0.0', reason);
          expect(mockError).toHaveBeenCalledWith('ACCOUNT_LOCKOUT', 
            expect.objectContaining({ reason })
          );
        });
      });
    });
  });

  // ============================================================
  // LOGGER INSTANCE TESTS
  // ============================================================

  describe('logger instance', () => {
    it('should export default logger', () => {
      expect(logger).toBeDefined();
    });

    it('should have info method', () => {
      expect(typeof logger.info).toBe('function');
    });

    it('should have warn method', () => {
      expect(typeof logger.warn).toBe('function');
    });

    it('should have error method', () => {
      expect(typeof logger.error).toBe('function');
    });

    it('should have debug method', () => {
      expect(typeof logger.debug).toBe('function');
    });
  });
});

// ============================================================
// FORMAT FUNCTION TESTS
// ============================================================

describe('Logger Format Functions', () => {
  describe('printf format', () => {
    it('should format log message with timestamp and level', () => {
      // The printfCallback should have been captured during module load
      expect(printfCallback).toBeDefined();
      expect(typeof printfCallback).toBe('function');
      
      const formatted = printfCallback({
        timestamp: '2024-01-01 12:00:00:000',
        level: 'info',
        message: 'Test message',
      });

      expect(formatted).toContain('2024-01-01 12:00:00:000');
      expect(formatted).toContain('info');
      expect(formatted).toContain('Test message');
    });

    it('should include metadata in formatted output when meta exists', () => {
      expect(printfCallback).toBeDefined();
      
      const formatted = printfCallback({
        timestamp: '2024-01-01 12:00:00:000',
        level: 'info',
        message: 'Test message',
        userId: 'user-123',
        action: 'login',
      });

      expect(formatted).toContain('user-123');
      expect(formatted).toContain('login');
      // Metadata should be on new line and formatted as JSON
      expect(formatted).toContain('\n');
    });

    it('should handle empty metadata (no extra fields)', () => {
      expect(printfCallback).toBeDefined();
      
      const formatted = printfCallback({
        timestamp: '2024-01-01 12:00:00:000',
        level: 'warn',
        message: 'Warning message',
      });

      expect(formatted).toContain('Warning message');
      expect(formatted).toBe('2024-01-01 12:00:00:000 warn: Warning message');
    });

    it('should format complex nested metadata', () => {
      expect(printfCallback).toBeDefined();
      
      const formatted = printfCallback({
        timestamp: '2024-01-01 12:00:00:000',
        level: 'error',
        message: 'Error occurred',
        error: {
          code: 'ERR_001',
          details: { field: 'email' }
        },
        stack: 'Error: ...'
      });

      expect(formatted).toContain('ERR_001');
      expect(formatted).toContain('field');
      expect(formatted).toContain('email');
    });
  });
});

// ============================================================
// SECURITY COMPLIANCE TESTS
// ============================================================

describe('Logger Security Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Audit Trail Requirements', () => {
    it('should include timestamp in all security logs', () => {
      securityLogger.loginSuccess('user-1', 'email@test.com', '127.0.0.1', 'Chrome');
      securityLogger.loginFailed('email@test.com', '127.0.0.1', 'Chrome', 'Invalid');
      securityLogger.logout('user-1', '127.0.0.1', 'Chrome');

      const allCalls = [...mockInfo.mock.calls, ...mockWarn.mock.calls];
      allCalls.forEach(call => {
        expect(call[1]).toHaveProperty('timestamp');
        expect(call[1].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });
    });

    it('should include IP address in security-sensitive logs', () => {
      securityLogger.loginSuccess('user-1', 'test@test.com', '192.168.1.100', 'Chrome');
      
      expect(mockInfo).toHaveBeenCalledWith('LOGIN_SUCCESS', 
        expect.objectContaining({ ipAddress: '192.168.1.100' })
      );
    });

    it('should include user agent in security-sensitive logs', () => {
      securityLogger.loginFailed('test@test.com', '127.0.0.1', 'Mozilla/5.0 (Windows)', 'Invalid');
      
      expect(mockWarn).toHaveBeenCalledWith('LOGIN_FAILED', 
        expect.objectContaining({ userAgent: 'Mozilla/5.0 (Windows)' })
      );
    });
  });

  describe('Log Level Appropriateness', () => {
    it('should use INFO level for successful operations', () => {
      securityLogger.loginSuccess('user-1', 'test@test.com', '127.0.0.1', 'Chrome');
      securityLogger.registrationSuccess('user-2', 'new@test.com', '127.0.0.1', 'Chrome');
      securityLogger.passwordResetSuccess('user-3', 'reset@test.com', '127.0.0.1', 'Chrome');
      securityLogger.tokenRefresh('user-4', '127.0.0.1', 'Chrome');
      securityLogger.logout('user-5', '127.0.0.1', 'Chrome');

      expect(mockInfo).toHaveBeenCalledTimes(5);
    });

    it('should use WARN level for failed attempts', () => {
      securityLogger.loginFailed('test@test.com', '127.0.0.1', 'Chrome', 'Invalid');
      securityLogger.registrationFailed('test@test.com', '127.0.0.1', 'Chrome', 'Exists');
      securityLogger.passwordResetFailed('test@test.com', '127.0.0.1', 'Chrome', 'Expired');
      securityLogger.unauthorizedAccess('user-1', 'test@test.com', '/admin', '127.0.0.1', 'Chrome');

      expect(mockWarn).toHaveBeenCalledTimes(4);
    });

    it('should use ERROR level for security incidents', () => {
      securityLogger.suspiciousActivity('Attack detected', '127.0.0.1', 'Malicious', {});
      securityLogger.accountLockout('user-1', 'test@test.com', '127.0.0.1', 'Locked');

      expect(mockError).toHaveBeenCalledTimes(2);
    });
  });
});