import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  createAuditLogMiddleware, 
  inferTargetTable, 
  determineSeverity, 
  determineCategory 
} from '../../src/middleware/auditLogMiddleware.js';

describe('AuditLogMiddleware (100% Exact Coverage)', () => {
  let middleware;
  let mockAuditService;
  let mockUuid;
  let req, res, next;

  beforeEach(() => {
    mockAuditService = { log: jest.fn(), logDataChange: jest.fn() };
    mockUuid = jest.fn().mockReturnValue('test-uuid');
    
    middleware = createAuditLogMiddleware({ 
      AuditLogService: mockAuditService, 
      uuid: mockUuid 
    });

    req = {
      headers: {},
      params: {},
      query: {},
      method: 'GET',
      originalUrl: '/api/test',
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      user: { user_id: 'u1', email: 'test@mail.com' },
      clientInfo: {}
    };
    
    res = {
      statusCode: 200,
      setHeader: jest.fn(),
      send: jest.fn(), // จะถูก override
      on: jest.fn()
    };
    next = jest.fn();

    // Mock setImmediate ให้รันทันทีเพื่อให้ test จับผลลัพธ์ได้
    jest.spyOn(global, 'setImmediate').mockImplementation((cb) => cb());
    jest.spyOn(console, 'error').mockImplementation(() => {}); // ปิด log error
  });

  afterEach(() => { jest.clearAllMocks(); });

  // --- 1. Helper Functions Coverage ---
  describe('Helper Functions', () => {
    it('inferTargetTable should map keys correctly', () => {
      expect(inferTargetTable('USER')).toBe('sys_users');
      expect(inferTargetTable('COMPANY')).toBe('sys_organizations');
      expect(inferTargetTable('MEMBER')).toBe('sys_organization_members');
      expect(inferTargetTable('INVITATION')).toBe('sys_invitations');
      expect(inferTargetTable('TOKEN')).toBe('sys_refresh_tokens');
      expect(inferTargetTable('UNKNOWN')).toBeNull(); // Test default
    });

    it('determineSeverity should handle status codes and actions', () => {
      expect(determineSeverity(500)).toBe('ERROR');
      expect(determineSeverity(404)).toBe('WARNING');
      expect(determineSeverity(200, 'DELETE_USER')).toBe('WARNING');
      expect(determineSeverity(200, 'TRANSFER_OWNER')).toBe('WARNING');
      expect(determineSeverity(200, 'GET_USER')).toBe('INFO');
    });

    it('determineCategory should handle keywords', () => {
      expect(determineCategory(null)).toBe('BUSINESS');
      expect(determineCategory('USER_LOGIN')).toBe('SECURITY');
      expect(determineCategory('SYSTEM_BACKUP')).toBe('SYSTEM');
      expect(determineCategory('FAILED_LOGIN')).toBe('SECURITY');
      expect(determineCategory('SUSPICIOUS_ACT')).toBe('SECURITY');
      expect(determineCategory('CREATE_ORDER')).toBe('BUSINESS');
    });
  });

  // --- 2. Middleware Functions Coverage ---
  describe('Middleware Functions', () => {
    it('addCorrelationId should use header or generate new', () => {
      // Case 1: New
      middleware.addCorrelationId(req, res, next);
      expect(req.correlationId).toBe('test-uuid');
      expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'test-uuid');

      // Case 2: Existing
      req.headers['x-correlation-id'] = 'existing-id';
      middleware.addCorrelationId(req, res, next);
      expect(req.correlationId).toBe('existing-id');
    });

    it('addSessionId should check multiple sources', () => {
      // Source 1: Header
      req.headers['x-session-id'] = 'sess-1';
      middleware.addSessionId(req, res, next);
      expect(req.sessionId).toBe('sess-1');

      // Source 2: Cookie
      req.headers = {}; 
      req.cookies = { sessionId: 'sess-2' };
      middleware.addSessionId(req, res, next);
      expect(req.sessionId).toBe('sess-2');
    });

    it('clientInfoMiddleware should parse headers correctly', () => {
      req.headers['x-forwarded-for'] = '10.0.0.1, 10.0.0.2';
      req.headers['user-agent'] = 'TestAgent';
      req.headers['sec-ch-ua-platform'] = 'Windows';
      
      middleware.clientInfoMiddleware(req, res, next);

      expect(req.clientInfo.ipAddress).toBe('10.0.0.1');
      expect(req.clientInfo.userAgent).toBe('TestAgent');
      expect(req.clientInfo.platform).toBe('Windows');
    });
  });

  // --- 3. Main Logic (auditLog) Coverage ---
  describe('auditLog', () => {
    it('should intercept res.send and log success', () => {
      const handler = middleware.auditLog('TEST_ACTION', 'USER');
      handler(req, res, next);

      // Simulate Controller sending JSON
      const body = JSON.stringify({ data: { id: 999 } });
      res.send(body);

      expect(mockAuditService.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'TEST_ACTION',
        target_id: 999, // Extracted from parsedData.data.id
        status: 'SUCCESS',
        severity: 'INFO'
      }));
    });

    it('should log failure when status >= 400', () => {
      const handler = middleware.auditLog('TEST_FAIL', 'USER');
      handler(req, res, next);

      res.statusCode = 400;
      res.send(JSON.stringify({ error: 'Bad Request' }));

      expect(mockAuditService.log).toHaveBeenCalledWith(expect.objectContaining({
        status: 'FAILED',
        severity: 'WARNING',
        error_message: 'Bad Request'
      }));
    });

    it('should handle JSON parse error gracefully', () => {
      const handler = middleware.auditLog('TEST');
      handler(req, res, next);
      
      // Send raw string (not JSON)
      res.send('Raw String'); 
      
      expect(mockAuditService.log).toHaveBeenCalled(); // Should still log
    });

    it('should extract targetId from various sources (params)', () => {
      const handler = middleware.auditLog('TEST');
      req.params = { userId: 'u-123' }; // Test req.params.userId extraction
      handler(req, res, next);
      
      res.send('{}');
      
      expect(mockAuditService.log).toHaveBeenCalledWith(expect.objectContaining({
        target_id: 'u-123'
      }));
    });

    it('should catch error in log service', async () => {
      const handler = middleware.auditLog('TEST');
      mockAuditService.log.mockRejectedValue(new Error('DB Error'));
      handler(req, res, next);
      
      res.send('{}');
      // Expect console.error to be called (mocked) without crashing app
      expect(console.error).toHaveBeenCalled();
    });
  });

  // --- 4. auditChange Coverage ---
  describe('auditChange', () => {
    it('should fetch before-data and log change', async () => {
      const mockFind = jest.fn().mockResolvedValue({ id: 1, name: 'old' });
      const handler = middleware.auditChange('USER', mockFind);
      
      req.method = 'PUT';
      req.params.id = '1';

      await handler(req, res, next);
      
      expect(mockFind).toHaveBeenCalledWith('1');
      expect(req.auditBeforeData).toEqual({ id: 1, name: 'old' });

      // Simulate response
      res.send(JSON.stringify({ data: { id: 1, name: 'new' } }));

      expect(mockAuditService.logDataChange).toHaveBeenCalledWith(
        'USER_UPDATE',
        'USER',
        '1',
        'sys_users',
        { id: 1, name: 'old' },
        { id: 1, name: 'new' },
        'u1',
        expect.anything()
      );
    });

    it('should handle find resource error gracefully', async () => {
      const mockFind = jest.fn().mockRejectedValue(new Error('DB Error'));
      const handler = middleware.auditChange('USER', mockFind);
      req.method = 'DELETE';
      req.params.id = '1';

      await handler(req, res, next);
      // Should not crash, just continue without beforeData
      expect(next).toHaveBeenCalled();
    });
  });
});