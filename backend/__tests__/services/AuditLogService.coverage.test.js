// test/services/AuditLogService.coverage.test.js
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createAuditLogService } from '../../src/services/AuditLogService.js';

describe('AuditLogService (100% Coverage)', () => {
  let service;
  let mockModel;
  let mockUuid;
  let consoleSpy;

  beforeEach(() => {
    // 1. Mock Dependencies
    mockModel = {
      create: jest.fn(),
      query: jest.fn(),
      findByUser: jest.fn(),
      findRecent: jest.fn(),
      findSecurityEvents: jest.fn(),
      findFailedActions: jest.fn(),
      getStats: jest.fn(),
      deleteOldLogs: jest.fn()
    };

    mockUuid = jest.fn().mockReturnValue('mock-uuid-1234');

    // 2. Create Service
    service = createAuditLogService({
      model: mockModel,
      uuid: mockUuid
    });

    // 3. Spy on Console
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- Sanitize Tests ---
  describe('sanitizeData', () => {
    it('should sanitize sensitive fields', () => {
      const data = {
        password: '123',
        nested: { credit_card: '456' },
        normal: 'ok'
      };
      const result = service.sanitizeData(data);
      expect(result.password).toBe('***REDACTED***');
      expect(result.nested.credit_card).toBe('***REDACTED***');
      expect(result.normal).toBe('ok');
    });

    it('should handle non-object inputs', () => {
      expect(service.sanitizeData(null)).toBeNull();
      expect(service.sanitizeData('string')).toBe('string');
    });

    it('should handle arrays', () => {
      const data = [{ password: '123' }];
      // Note: Current implementation treats arrays as object with numeric keys,
      // which is technically valid JS but produces object output for array input if strictly followed logic
      // However, let's verify sensitive data is hidden regardless of structure
      // Wait, your logic `const sanitized = Array.isArray(data) ? [] : {};` handles array correctly!
      const result = service.sanitizeData(data);
      expect(result[0].password).toBe('***REDACTED***');
    });
  });

  // --- Calculate Changes Tests ---
  describe('calculateChanges', () => {
    it('should detect changes', () => {
      const oldData = { a: 1, b: 2 };
      const newData = { a: 1, b: 3 };
      const result = service.calculateChanges(oldData, newData);
      expect(result).toEqual({
        b: { old: 2, new: 3 }
      });
    });

    it('should return null if no changes', () => {
      const oldData = { a: 1 };
      const newData = { a: 1 };
      expect(service.calculateChanges(oldData, newData)).toBeNull();
    });

    it('should return null if input invalid', () => {
      expect(service.calculateChanges(null, {})).toBeNull();
    });
  });

  // --- Log Tests ---
  describe('log', () => {
    it('should create log entry', async () => {
      mockModel.create.mockResolvedValue({ id: 1 });
      await service.log({ action: 'TEST' });
      expect(mockModel.create).toHaveBeenCalledWith(expect.objectContaining({
        action: 'TEST',
        status: 'SUCCESS'
      }));
    });

    it('should sanitize data before logging', async () => {
      mockModel.create.mockResolvedValue({});
      await service.log({ 
        action: 'TEST', 
        request_body: { password: '123' } 
      });
      const calledArg = mockModel.create.mock.calls[0][0];
      expect(calledArg.request_body.password).toBe('***REDACTED***');
    });

    it('should calculate changes automatically', async () => {
      mockModel.create.mockResolvedValue({});
      await service.log({ 
        action: 'TEST', 
        before_data: { a: 1 }, 
        after_data: { a: 2 } 
      });
      const calledArg = mockModel.create.mock.calls[0][0];
      expect(calledArg.changes).toEqual({ a: { old: 1, new: 2 } });
    });

    it('should generate correlation ID if requested', async () => {
      mockModel.create.mockResolvedValue({});
      await service.log({ action: 'TEST', generateCorrelationId: true });
      const calledArg = mockModel.create.mock.calls[0][0];
      expect(calledArg.correlation_id).toBe('mock-uuid-1234');
    });

    it('should handle errors gracefully', async () => {
      mockModel.create.mockRejectedValue(new Error('DB Fail'));
      const result = await service.log({ action: 'TEST' });
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  // --- Helper Method Tests ---
  describe('Helper Loggers', () => {
    it('logAuth', async () => {
      await service.logAuth('LOGIN_SUCCESS', 'u1', 'e@e.com', 'n', 'ip', 'ua');
      expect(mockModel.create).toHaveBeenCalledWith(expect.objectContaining({
        action: 'LOGIN_SUCCESS',
        category: 'SECURITY'
      }));
    });

    it('logDataChange', async () => {
      await service.logDataChange('UPDATE', 'USER', 'u1', 'users', {}, {}, 'admin');
      expect(mockModel.create).toHaveBeenCalledWith(expect.objectContaining({
        action: 'UPDATE',
        category: 'BUSINESS'
      }));
    });

    it('logSecurity', async () => {
      await service.logSecurity('ALERT', 'desc', 'u1', 'ip');
      expect(mockModel.create).toHaveBeenCalledWith(expect.objectContaining({
        tags: ['security', 'monitoring']
      }));
    });

    it('logSystem', async () => {
      await service.logSystem('STARTUP', 'boot');
      expect(mockModel.create).toHaveBeenCalledWith(expect.objectContaining({
        target_type: 'SYSTEM'
      }));
    });
  });

  // --- Read & Cleanup Tests ---
  describe('Read Operations', () => {
    it('query', async () => {
      await service.query({ id: 1 });
      expect(mockModel.query).toHaveBeenCalled();
    });

    it('getUserActivity', async () => {
      await service.getUserActivity('u1');
      expect(mockModel.findByUser).toHaveBeenCalledWith('u1', 50);
    });

    it('getRecentActivity', async () => {
      await service.getRecentActivity();
      expect(mockModel.findRecent).toHaveBeenCalled();
    });

    it('getSecurityEvents', async () => {
      await service.getSecurityEvents();
      expect(mockModel.findSecurityEvents).toHaveBeenCalled();
    });

    it('getFailedActions', async () => {
      await service.getFailedActions();
      expect(mockModel.findFailedActions).toHaveBeenCalled();
    });

    it('getStatistics', async () => {
      await service.getStatistics();
      expect(mockModel.getStats).toHaveBeenCalled();
    });

    it('cleanup', async () => {
      mockModel.deleteOldLogs.mockResolvedValue(10);
      mockModel.create.mockResolvedValue({}); // for logSystem inside cleanup
      
      const res = await service.cleanup();
      expect(mockModel.deleteOldLogs).toHaveBeenCalled();
      expect(res.deleted).toBe(10);
    });

    it('cleanup error', async () => {
      mockModel.deleteOldLogs.mockRejectedValue(new Error('Fail'));
      await expect(service.cleanup()).rejects.toThrow('Fail');
    });

    it('exportLogs', async () => {
      mockModel.query.mockResolvedValue({ logs: [] });
      await service.exportLogs();
      expect(mockModel.query).toHaveBeenCalledWith({}, expect.objectContaining({ limit: 10000 }));
    });

    it('getSuspiciousActivity', async () => {
      mockModel.query.mockResolvedValue({});
      await service.getSuspiciousActivity(24);
      expect(mockModel.query).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'WARNING' }),
        expect.anything()
      );
    });

    it('trackSession', async () => {
      await service.trackSession('sess1', 'u1');
      expect(mockModel.query).toHaveBeenCalledWith(
        expect.objectContaining({ session_id: 'sess1' }),
        expect.anything()
      );
    });

    it('getCorrelatedActions', async () => {
      await service.getCorrelatedActions('corr1');
      expect(mockModel.query).toHaveBeenCalledWith(
        expect.objectContaining({ correlation_id: 'corr1' }),
        expect.anything()
      );
    });
  });
});