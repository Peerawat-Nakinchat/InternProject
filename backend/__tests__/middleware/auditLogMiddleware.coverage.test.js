// test/middleware/auditLogMiddleware.coverage.test.js
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createAuditLogMiddleware, inferTargetTable, determineCategory, determineSeverity } from '../../src/middleware/auditLogMiddleware.js';

describe('AuditLog Middleware (Coverage)', () => {
  let mockAuditService;
  let mockUuid;
  let middleware;
  let req, res, next;
  let consoleSpy;

  beforeEach(() => {
    // 1. Mock Dependencies
    mockAuditService = {
      log: jest.fn().mockResolvedValue(true),
      logDataChange: jest.fn().mockResolvedValue(true)
    };
    mockUuid = jest.fn().mockReturnValue('mock-uuid-1234');

    // 2. Inject Mocks via Factory
    middleware = createAuditLogMiddleware({
      AuditLogService: mockAuditService,
      uuid: mockUuid
    });

    // 3. Mock Req/Res/Next
    req = {
      headers: {},
      params: {},
      query: {},
      body: {},
      method: 'GET',
      url: '/test',
      originalUrl: '/test',
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      user: { user_id: 'user-1', email: 'test@mail.com' }
    };

    res = {
      statusCode: 200,
      setHeader: jest.fn(),
      send: jest.fn()
    };

    next = jest.fn();

    // 4. Setup Timers & Console
    jest.useFakeTimers();
    jest.spyOn(global, 'setImmediate');
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  // --- Tests ---
  
  describe('Helper Functions', () => {
    it('inferTargetTable should return correct tables', () => {
      expect(inferTargetTable('USER')).toBe('sys_users');
      expect(inferTargetTable('UNKNOWN')).toBeNull();
    });

    it('determineSeverity should handle all levels', () => {
      expect(determineSeverity(500, 'TEST')).toBe('ERROR');
      expect(determineSeverity(400, 'TEST')).toBe('WARNING');
      expect(determineSeverity(200, 'DELETE_USER')).toBe('WARNING');
      expect(determineSeverity(200, 'TRANSFER_MONEY')).toBe('WARNING');
      expect(determineSeverity(200, 'VIEW')).toBe('INFO');
    });

    it('determineCategory should handle all categories', () => {
      expect(determineCategory(null)).toBe('BUSINESS');
      expect(determineCategory('USER_LOGIN')).toBe('SECURITY');
      expect(determineCategory('SYSTEM_UPDATE')).toBe('SYSTEM');
      expect(determineCategory('SUSPICIOUS_ACTIVITY')).toBe('SECURITY');
      expect(determineCategory('ORDER_CREATE')).toBe('BUSINESS');
    });
  });
  
  describe('addCorrelationId', () => {
    it('should set new correlation id', () => {
      middleware.addCorrelationId(req, res, next);
      expect(mockUuid).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'mock-uuid-1234');
      expect(next).toHaveBeenCalled();
    });

    it('should use existing correlation id', () => {
      req.headers['x-correlation-id'] = 'existing';
      middleware.addCorrelationId(req, res, next);
      expect(req.correlationId).toBe('existing');
    });
  });

  describe('auditLog', () => {
    it('should log success response asynchronously', async () => {
      const mw = middleware.auditLog('VIEW', 'USER');
      await mw(req, res, next);

      res.send(JSON.stringify({ data: { id: 1 } }));
      
      jest.runAllTimers(); 

      expect(mockAuditService.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'VIEW',
        status: 'SUCCESS',
        user_id: 'user-1'
      }));
    });

    it('should log failure response when forceLog/logAll is enabled', async () => {
      // ✅ แก้ไข 1: เพิ่ม option { logAll: true } เพื่อบังคับให้ Log 500
      const mw = middleware.auditLog('VIEW', null, { logAll: true });
      await mw(req, res, next);

      res.statusCode = 500;
      res.send(JSON.stringify({ error: 'Boom' }));
      
      jest.runAllTimers();

      expect(mockAuditService.log).toHaveBeenCalledWith(expect.objectContaining({
        status: 'FAILED',
        severity: 'ERROR'
      }));
    });

    it('should handle non-JSON response gracefully', async () => {
      const mw = middleware.auditLog('VIEW');
      await mw(req, res, next);

      res.send('Plain Text');
      
      jest.runAllTimers();

      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should catch errors in logging service', async () => {
      mockAuditService.log.mockRejectedValue(new Error('DB Error'));
      const mw = middleware.auditLog('VIEW');
      await mw(req, res, next);
      
      res.send('{}');
      
      // ✅ แก้ไข 2: Flush Microtask Queue
      jest.runAllTimers(); 
      await Promise.resolve(); // รอให้ Promise rejection ใน setImmediate ทำงานจบ
      await Promise.resolve(); // เผื่อไว้สำหรับ chain ที่ซ้อนกัน

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('auditChange', () => {
    it('should log data changes', async () => {
      req.method = 'PUT';
      req.params.id = '1';
      const mockFind = jest.fn().mockResolvedValue({ id: 1, val: 'old' });
      
      const mw = middleware.auditChange('USER', mockFind);
      await mw(req, res, next);

      res.send(JSON.stringify({ data: { id: 1, val: 'new' } }));
      
      jest.runAllTimers();
      await Promise.resolve(); // Flush microtasks

      expect(mockFind).toHaveBeenCalledWith('1');
      expect(mockAuditService.logDataChange).toHaveBeenCalledWith(
        'USER_UPDATE', 
        'USER', 
        '1', 
        expect.any(String),
        { id: 1, val: 'old' },
        { id: 1, val: 'new' },
        'user-1',
        expect.any(Object)
      );
    });
  });
});