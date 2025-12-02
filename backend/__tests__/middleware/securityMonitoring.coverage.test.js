// test/middleware/securityMonitoring.coverage.test.js
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  createSecurityMiddleware, 
  cleanIp, 
  checkSqlInjection, 
  checkXss 
} from '../../src/middleware/securityMonitoring.js';

describe('SecurityMonitoring Middleware (100% Coverage)', () => {
  let middleware;
  let mockLogger;
  let req, res, next;
  let consoleSpy;

  beforeEach(() => {
    // 1. Mock Logger
    mockLogger = { suspiciousActivity: jest.fn() };

    // 2. Inject Mock (Disable auto-start cleanup interval)
    middleware = createSecurityMiddleware({ 
      securityLogger: mockLogger,
      autoStart: false,
      maxFailedAttempts: 3,
      lockoutDuration: 1000 // 1 sec for test
    });

    // 3. Mock Express
    req = {
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      headers: { 'user-agent': 'ValidUserAgent/1.0' },
      clientInfo: {},
      method: 'GET',
      url: '/test',
      body: {}
    };
    
    res = {
      statusCode: 200,
      on: jest.fn((event, cb) => {
        // Store callback to simulate event later
        res._finishCallback = cb; 
      }),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    next = jest.fn();

    // 4. Timer Mocks
    jest.useFakeTimers();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    middleware.stopCleanup();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  // ==========================================
  // 1. Helper Functions
  // ==========================================
  describe('Helpers', () => {
    it('cleanIp should normalize IP', () => {
      expect(cleanIp('::ffff:192.168.1.1')).toBe('192.168.1.1');
      expect(cleanIp('::1')).toBe('127.0.0.1');
      expect(cleanIp('10.0.0.1')).toBe('10.0.0.1');
      expect(cleanIp(null)).toBe('unknown');
    });

    it('checkSqlInjection should detect patterns', () => {
      expect(checkSqlInjection("' OR 1=1")).toBe(true); // แก้ไข: ใช้แบบไม่มี quote ที่ตัวเลข
      expect(checkSqlInjection("UNION SELECT")).toBe(true);
      expect(checkSqlInjection("hello world")).toBe(false);
    });

    it('checkXss should detect patterns', () => {
      expect(checkXss("<script>alert(1)</script>")).toBe(true);
      expect(checkXss("javascript:void(0)")).toBe(true);
      expect(checkXss("hello world")).toBe(false);
    });
  });

  // ==========================================
  // 2. extractClientInfo
  // ==========================================
  describe('extractClientInfo', () => {
    it('should extract and clean IP', () => {
      req.ip = '::ffff:10.0.0.1';
      middleware.extractClientInfo(req, res, next);
      
      expect(req.clientInfo.ipAddress).toBe('10.0.0.1');
      expect(req.clientInfo.userAgent).toBe('ValidUserAgent/1.0');
      expect(next).toHaveBeenCalled();
    });

    it('should handle missing headers', () => {
      req.ip = null;
      req.connection.remoteAddress = null;
      req.headers = {};
      
      middleware.extractClientInfo(req, res, next);
      
      expect(req.clientInfo.ipAddress).toBe('unknown');
      expect(req.clientInfo.userAgent).toBe('unknown');
    });
  });

  // ==========================================
  // 3. requestLogger
  // ==========================================
  describe('requestLogger', () => {
    it('should register finish listener', () => {
      middleware.requestLogger(req, res, next);
      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
      expect(next).toHaveBeenCalled();
    });

    it('should log suspicious status codes (>=400)', () => {
      middleware.requestLogger(req, res, next);
      
      // Simulate response finish
      res.statusCode = 404;
      res._finishCallback();

      expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith(
        expect.stringContaining('HTTP 404'),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ statusCode: 404 })
      );
    });

    it('should not log success status codes (<400)', () => {
      middleware.requestLogger(req, res, next);
      
      res.statusCode = 200;
      res._finishCallback();

      expect(mockLogger.suspiciousActivity).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // 4. Brute Force Protection
  // ==========================================
  describe('Brute Force', () => {
    it('should allow request if no failed attempts', () => {
      middleware.bruteForceProtection(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should block after max attempts', () => {
      const ip = '127.0.0.1';
      req.clientInfo = { ipAddress: ip };

      // Record 3 failed attempts (max is 3)
      middleware.recordFailedLogin(ip);
      middleware.recordFailedLogin(ip);
      middleware.recordFailedLogin(ip);

      middleware.bruteForceProtection(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Too many login attempts') }));
      expect(mockLogger.suspiciousActivity).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow after lockout duration expires', () => {
      const ip = '127.0.0.1';
      req.clientInfo = { ipAddress: ip };

      // Lockout
      middleware.recordFailedLogin(ip);
      middleware.recordFailedLogin(ip);
      middleware.recordFailedLogin(ip);

      // Fast forward time > lockoutDuration (1000ms)
      jest.advanceTimersByTime(1500);

      middleware.bruteForceProtection(req, res, next);

      expect(next).toHaveBeenCalled();
      // Should clear attempts
      expect(middleware._failedLoginAttempts.has(ip)).toBe(false);
    });

    it('should clear attempts manually', () => {
      const ip = '127.0.0.1';
      middleware.recordFailedLogin(ip);
      expect(middleware._failedLoginAttempts.has(ip)).toBe(true);

      middleware.clearFailedLogins(ip);
      expect(middleware._failedLoginAttempts.has(ip)).toBe(false);
    });
  });

  // ==========================================
  // 5. Suspicious Patterns
  // ==========================================
  describe('detectSuspiciousPatterns', () => {
    it('should detect SQL Injection', () => {
      // ✅ แก้ไข: ใช้ UNION SELECT ซึ่งเป็น Pattern ที่ Regex (UNION\s+SELECT) รองรับแน่นอน
      req.body = { query: "UNION SELECT * FROM users" }; 
      middleware.detectSuspiciousPatterns(req, res, next);
      
      expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith(
        'Possible SQL injection attempt detected',
        expect.any(String),
        expect.any(String),
        expect.any(Object)
      );
      expect(next).toHaveBeenCalled(); // Logs but doesn't block by default in your code
    });

    it('should detect XSS', () => {
      req.body = { script: "<script>alert('xss')</script>" };
      middleware.detectSuspiciousPatterns(req, res, next);
      
      expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith(
        'Possible XSS attempt detected',
        expect.any(String),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should detect suspicious user agent', () => {
      req.clientInfo = { userAgent: 'curl' }; // Short UA
      middleware.detectSuspiciousPatterns(req, res, next);
      
      expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith(
        'Suspicious or missing user agent',
        expect.any(String),
        'curl',
        expect.any(Object)
      );
    });

    it('should handle missing body', () => {
      req.body = undefined;
      middleware.detectSuspiciousPatterns(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  // ==========================================
  // 6. Cleanup Interval
  // ==========================================
  describe('Cleanup Interval', () => {
    it('should remove old entries periodically', () => {
      // Create new middleware with autoStart enabled
      const mw = createSecurityMiddleware({ 
        securityLogger: mockLogger,
        autoStart: true, // Start interval
        lockoutDuration: 100,
        cleanupInterval: 200
      });

      mw.recordFailedLogin('old-ip');
      
      // Fast forward past lockout + cleanup interval
      jest.advanceTimersByTime(300);

      expect(mw._failedLoginAttempts.has('old-ip')).toBe(false);
      mw.stopCleanup();
    });
  });
});