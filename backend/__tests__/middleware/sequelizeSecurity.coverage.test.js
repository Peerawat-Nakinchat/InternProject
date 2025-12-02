// test/middleware/sequelizeSecurity.coverage.test.js
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// ✅ MOCKING: ดัก isomorphic-dompurify เพื่อไม่ให้โหลด parse5 (ESM)
// ใช้ require ปกติใน jest.mock เพื่อความปลอดภัยใน CommonJS environment
jest.mock('isomorphic-dompurify', () => {
  return {
    __esModule: true,
    default: {
      sanitize: (val) => typeof val === 'string' ? val.replace(/<[^>]*>/g, '') : val
    },
    sanitize: (val) => typeof val === 'string' ? val.replace(/<[^>]*>/g, '') : val
  };
});

// Mock parse5 เผื่อหลุด
jest.mock('parse5', () => ({}), { virtual: true });

import { createSequelizeSecurityMiddleware } from '../../src/middleware/sequelizeSecurity.js';

describe('SequelizeSecurity Middleware (100% Coverage)', () => {
  let middleware;
  let mockValidator, mockPurifier, mockDb, mockLogger;
  let req, res, next;
  let mockTransaction;

  beforeEach(() => {
    mockValidator = jest.fn().mockReturnValue({ isEmpty: () => true });
    
    // Inject Mock Purifier (Regex Based)
    mockPurifier = {
      sanitize: jest.fn(val => typeof val === 'string' ? val.replace(/<[^>]*>/g, '') : val)
    };

    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn()
    };

    mockDb = {
      transaction: jest.fn().mockResolvedValue(mockTransaction)
    };

    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn()
    };

    middleware = createSequelizeSecurityMiddleware({
      validationResult: mockValidator,
      DOMPurify: mockPurifier,
      sequelize: mockDb,
      logger: mockLogger
    });

    req = {
      body: {},
      query: {},
      params: {},
      ip: '127.0.0.1',
      path: '/test',
      method: 'POST',
      user: { user_id: 'u1' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn(),
      headersSent: false
    };
    next = jest.fn();

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  // --- Tests ---

  describe('sanitizeInput', () => {
    it('should sanitize string in body, query, params', () => {
      // ✅ FIX: เปลี่ยน input เป็น Tag ธรรมดาเพื่อให้ Regex Mock ทำงานได้ถูกต้อง
      // จากเดิม: <script>alert</script>John -> alertJohn (เพราะ Mock ลบแค่ tag ไม่ลบ content)
      // เปลี่ยนเป็น: <b>John</b> -> John
      req.body = { name: '<b>John</b>' };
      req.query = { q: '<b>Search</b>' };
      req.params = { id: '123' };

      middleware.sanitizeInput(req, res, next);

      expect(mockPurifier.sanitize).toHaveBeenCalled();
      expect(req.body.name).toBe('John'); 
      expect(req.query.q).toBe('Search');
      expect(next).toHaveBeenCalled();
    });

    it('should handle nested objects and arrays', () => {
      req.body = { 
        data: { info: '<p>test</p>' },
        // รายการนี้จะผ่านแล้วเพราะแก้ logic ใน middleware แล้ว
        list: ['<a>link</a>', 123] 
      };

      middleware.sanitizeInput(req, res, next);

      expect(req.body.data.info).toBe('test');
      expect(req.body.list[0]).toBe('link'); // ตอนนี้จะถูก sanitize เป็น 'link' แล้ว
      expect(req.body.list[1]).toBe(123);
    });

    it('should handle errors gracefully', () => {
      mockPurifier.sanitize.mockImplementation(() => { throw new Error('Sanitize Fail'); });
      req.body = { name: 'test' };

      middleware.sanitizeInput(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  // ... (Test cases อื่นๆ เหมือนเดิม ไม่ต้องแก้) ...
  
  describe('handleValidationErrors', () => {
    it('should call next if no errors', () => {
      middleware.handleValidationErrors(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 400 if validation errors exist', () => {
      mockValidator.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ param: 'email', msg: 'Invalid', value: 'x' }]
      });

      middleware.handleValidationErrors(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
        error: 'Validation failed' 
      }));
    });
  });

  describe('preventMassAssignment', () => {
    it('should strip allowed fields', () => {
      req.body = { allowed: 'ok', forbidden: 'bad' };
      const mw = middleware.preventMassAssignment(['allowed']);
      mw(req, res, next);

      expect(req.body).toEqual({ allowed: 'ok' });
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Removed fields'), ['forbidden']);
      expect(next).toHaveBeenCalled();
    });

    it('should do nothing if body is not object', () => {
      req.body = null;
      const mw = middleware.preventMassAssignment(['field']);
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('withTransaction', () => {
    it('should commit transaction on success', async () => {
      const handler = jest.fn().mockResolvedValue('ok');
      const mw = middleware.withTransaction(handler);

      await mw(req, res, next);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(handler).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Fail'));
      const mw = middleware.withTransaction(handler);

      await mw(req, res, next);

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should not send response if headers already sent', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Fail'));
      res.headersSent = true;
      const mw = middleware.withTransaction(handler);

      await mw(req, res, next);

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('logSuspiciousQueries', () => {
    it('should block SQL Injection', () => {
      req.body = { q: "UNION SELECT * FROM users" };
      const mw = middleware.logSuspiciousQueries();
      mw(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should pass safe input', () => {
      req.body = { q: "Hello" };
      const mw = middleware.logSuspiciousQueries();
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('userRateLimit', () => {
    it('should allow request within limit', () => {
      const mw = middleware.userRateLimit({ max: 2 });
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should block request over limit', () => {
      const mw = middleware.userRateLimit({ max: 1 });
      mw(req, res, next);
      mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('should skip if no user', () => {
      req.user = null;
      const mw = middleware.userRateLimit();
      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('auditLog', () => {
    it('should log success response', () => {
      const mw = middleware.auditLog('TEST');
      mw(req, res, next);
      
      res.statusCode = 200;
      res.send({ data: 'ok' });

      expect(mockLogger.log).toHaveBeenCalledWith('📝 Audit:', expect.stringContaining('TEST'));
    });
  });
});