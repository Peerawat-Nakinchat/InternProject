import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// 1. Mock errorHandler
jest.mock('../../src/middleware/errorHandler.js', () => ({
  createError: {
    forbidden: jest.fn((msg) => {
      const err = new Error(msg);
      err.statusCode = 403;
      return err;
    })
  }
}));

import { 
  createSecurityMonitoringMiddleware, 
  checkSqlInjection, 
  checkXss, 
  cleanIp 
} from '../../src/middleware/securityMonitoring.js';

describe('SecurityMonitoring Middleware (100% Coverage)', () => {
  let middleware;
  let mockLogger;
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockLogger = {
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn()
    };

    middleware = createSecurityMonitoringMiddleware({ logger: mockLogger });

    req = {
      headers: {},
      socket: { remoteAddress: '::ffff:127.0.0.1' },
      method: 'POST',
      path: '/login',
      body: {},
      query: {},
      params: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      on: jest.fn((event, cb) => {
        if (event === 'finish') res._finishCb = cb;
      }),
      statusCode: 200
    };

    next = jest.fn();
  });

  afterEach(() => {
    middleware.stopCleanup();
    jest.useRealTimers();
  });

  // --- Helpers ---
  describe('Helpers', () => {
    it('cleanIp should normalize IP', () => {
      expect(cleanIp('::ffff:192.168.1.1')).toBe('192.168.1.1');
      expect(cleanIp('10.0.0.1')).toBe('10.0.0.1');
      expect(cleanIp(null)).toBe('0.0.0.0');
    });

    it('checkSqlInjection should detect patterns', () => {
      // ✅ Regex ถูกปรับปรุงให้รองรับแล้ว
      expect(checkSqlInjection("' OR 1=1")).toBe(true); 
      expect(checkSqlInjection("UNION SELECT")).toBe(true);
      expect(checkSqlInjection("hello world")).toBe(false);
      expect(checkSqlInjection(123)).toBe(false); // Non-string
    });

    it('checkXss should detect patterns', () => {
      expect(checkXss("<script>alert(1)</script>")).toBe(true);
      expect(checkXss("javascript:void(0)")).toBe(true);
      expect(checkXss("Hello")).toBe(false);
      expect(checkXss(null)).toBe(false);
    });
  });

  // --- Middleware Functions ---
  
  describe('extractClientInfo', () => {
    it('should extract and clean IP', () => {
      req.headers['x-forwarded-for'] = '::ffff:10.0.0.5';
      req.headers['user-agent'] = 'Mozilla/5.0';
      
      middleware.extractClientInfo(req, res, next);

      expect(req.clientInfo.ipAddress).toBe('10.0.0.5');
      expect(req.clientInfo.userAgent).toBe('Mozilla/5.0');
      expect(next).toHaveBeenCalled();
    });

    it('should handle missing headers', () => {
        req.socket.remoteAddress = null;
        middleware.extractClientInfo(req, res, next);
        expect(req.clientInfo.ipAddress).toBe('0.0.0.0');
        expect(req.clientInfo.userAgent).toBe('unknown');
    });
  });

  describe('requestLogger', () => {
    it('should register finish listener', () => {
      middleware.requestLogger(req, res, next);
      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
      expect(next).toHaveBeenCalled();
    });

    it('should log suspicious status codes (>=400)', () => {
      middleware.requestLogger(req, res, next);
      
      res.statusCode = 401;
      // Trigger finish
      if (res._finishCb) res._finishCb();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Request failed'),
        expect.any(Object)
      );
    });

    it('should log error status codes (>=500)', () => {
        middleware.requestLogger(req, res, next);
        res.statusCode = 500;
        if (res._finishCb) res._finishCb();
        expect(mockLogger.error).toHaveBeenCalled();
      });

    it('should not log success status codes (<400)', () => {
      middleware.requestLogger(req, res, next);
      
      res.statusCode = 200;
      if (res._finishCb) res._finishCb();

      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('Brute Force', () => {
    it('should allow request if no failed attempts', () => {
      middleware.checkBruteForce(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should block after max attempts', () => {
      const ip = '127.0.0.1';
      // Simulate 5 failures
      for (let i = 0; i < 5; i++) {
        middleware.recordFailedLogin(ip);
      }

      middleware.checkBruteForce(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      // ✅ แก้ไข: ใช้ข้อความภาษาไทยตาม Code จริง
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
            error: expect.stringContaining('คุณทำรายการผิดพลาดเกินกำหนด') 
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow after lockout duration expires', () => {
      const ip = '127.0.0.1';
      for (let i = 0; i < 5; i++) middleware.recordFailedLogin(ip);

      // Verify blocked first
      middleware.checkBruteForce(req, res, next);
      expect(res.status).toHaveBeenCalledWith(429);
      jest.clearAllMocks();

      // Fast forward time > 15 mins
      jest.advanceTimersByTime(15 * 60 * 1000 + 100);

      // Should auto-reset on next recordFailedLogin call or manual check logic?
      // Note: In `recordFailedLogin` logic, it resets if `now > lockoutUntil`.
      // But `checkBruteForce` checks `lockoutUntil > now`.
      // If time passed, lockoutUntil > now is FALSE, so it should allow.
      
      middleware.checkBruteForce(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should clear attempts manually', () => {
      const ip = '127.0.0.1';
      middleware.recordFailedLogin(ip);
      // ✅ เรียกใช้ได้แล้วเพราะเรา return _failedLoginAttempts ออกมาจาก Factory
      expect(middleware._failedLoginAttempts.has(ip)).toBe(true);

      middleware.clearFailedLogins(ip);
      expect(middleware._failedLoginAttempts.has(ip)).toBe(false);
    });
  });

  describe('detectSuspiciousPatterns', () => {
    beforeEach(() => {
        // Setup clientInfo for detectSuspiciousPatterns
        req.clientInfo = { ipAddress: '1.2.3.4' };
    });

    it('should detect SQL Injection', () => {
      req.body = { query: "' OR 1=1" };
      middleware.detectSuspiciousPatterns(req, res, next);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Suspicious activity detected', 
        expect.objectContaining({ type: 'SQLi' })
      );
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });

    it('should detect XSS', () => {
      req.query = { q: "<script>alert('xss')</script>" };
      middleware.detectSuspiciousPatterns(req, res, next);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Suspicious activity detected', 
        expect.objectContaining({ type: 'XSS' })
      );
    });

    it('should detect suspicious user agent', () => {
      req.headers['user-agent'] = 'curl/7.64.1';
      middleware.detectSuspiciousPatterns(req, res, next);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Suspicious activity detected', 
        expect.objectContaining({ type: 'BadUA' })
      );
    });

    it('should handle missing body', () => {
      req.body = undefined;
      req.query = undefined;
      req.headers['user-agent'] = 'Mozilla';
      
      middleware.detectSuspiciousPatterns(req, res, next);
      expect(next).toHaveBeenCalledWith(); // Should pass with no args
    });
  });

  describe('Cleanup Interval', () => {
    it('should remove old entries periodically', () => {
      // Manually add old entry
      const oldIp = 'old-ip';
      middleware._failedLoginAttempts.set(oldIp, {
        count: 5,
        lockoutUntil: Date.now() - 10000, // Expired
        lastAttempt: Date.now() - 4000000 // Very old
      });

      // Fast forward cleanup interval (1 hour)
      jest.advanceTimersByTime(3600000 + 100);

      expect(middleware._failedLoginAttempts.has(oldIp)).toBe(false);
    });
  });
});