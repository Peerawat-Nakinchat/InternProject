import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createAuditLogService } from '../../src/services/AuditLogService.js';

describe('AuditLogService (Complete Coverage)', () => {
  let service, mockModel, mockUuid, consoleSpy;

  beforeEach(() => {
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
    service = createAuditLogService({ model: mockModel, uuid: mockUuid });
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => { 
    jest.clearAllMocks(); 
    consoleSpy.mockRestore();
  });

  describe('sanitizeData', () => {
    it('should redact password fields', () => {
      const result = service.sanitizeData({ password: '123', name: 'John' });
      expect(result.password).toBe('***REDACTED***');
      expect(result.name).toBe('John');
    });

    it('should redact nested sensitive fields', () => {
      const result = service.sanitizeData({ user: { password_hash: 'hash' } });
      expect(result.user.password_hash).toBe('***REDACTED***');
    });

    it('should handle arrays', () => {
      const result = service.sanitizeData([{ token: 'abc' }]);
      expect(result[0].token).toBe('***REDACTED***');
    });

    it('should handle null/non-object', () => {
      expect(service.sanitizeData(null)).toBeNull();
      expect(service.sanitizeData('string')).toBe('string');
    });

    it('should redact all sensitive field variations', () => {
      const data = {
        password: 'a', password_hash: 'b', token: 'c',
        refreshToken: 'd', accessToken: 'e', credit_card: 'f'
      };
      const result = service.sanitizeData(data);
      expect(Object.values(result).every(v => v === '***REDACTED***')).toBe(true);
    });
  });

  describe('calculateChanges', () => {
    it('should detect changes between objects', () => {
      const changes = service.calculateChanges(
        { name: 'Old', age: 30 },
        { name: 'New', age: 30 }
      );
      expect(changes).toEqual({ name: { old: 'Old', new: 'New' } });
    });

    it('should return null if no changes', () => {
      const changes = service.calculateChanges({ a: 1 }, { a: 1 });
      expect(changes).toBeNull();
    });

    it('should return null if oldData or newData is null', () => {
      expect(service.calculateChanges(null, { a: 1 })).toBeNull();
      expect(service.calculateChanges({ a: 1 }, null)).toBeNull();
    });

    it('should detect added and removed fields', () => {
      const changes = service.calculateChanges({ a: 1 }, { b: 2 });
      expect(changes.a).toEqual({ old: 1, new: undefined });
      expect(changes.b).toEqual({ old: undefined, new: 2 });
    });
  });

  describe('log', () => {
    it('should create log with defaults', async () => {
      mockModel.create.mockResolvedValue({ id: 1 });
      await service.log({ action: 'TEST' });
      
      expect(mockModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TEST',
          status: 'SUCCESS',
          severity: 'INFO'
        })
      );
    });

    it('should sanitize before_data and after_data', async () => {
      mockModel.create.mockResolvedValue({ id: 1 });
      await service.log({
        action: 'TEST',
        before_data: { password: '123' },
        after_data: { password: '456' }
      });

      const callArg = mockModel.create.mock.calls[0][0];
      expect(callArg.before_data.password).toBe('***REDACTED***');
      expect(callArg.after_data.password).toBe('***REDACTED***');
    });

    it('should sanitize request_body', async () => {
      mockModel.create.mockResolvedValue({ id: 1 });
      await service.log({
        action: 'TEST',
        request_body: { token: 'secret' }
      });

      const callArg = mockModel.create.mock.calls[0][0];
      expect(callArg.request_body.token).toBe('***REDACTED***');
    });

    it('should calculate changes if both before_data and after_data exist', async () => {
      mockModel.create.mockResolvedValue({ id: 1 });
      await service.log({
        action: 'TEST',
        before_data: { name: 'Old' },
        after_data: { name: 'New' }
      });

      const callArg = mockModel.create.mock.calls[0][0];
      expect(callArg.changes).toEqual({ name: { old: 'Old', new: 'New' } });
    });

    it('should generate correlation_id if generateCorrelationId is true', async () => {
      mockModel.create.mockResolvedValue({ id: 1 });
      await service.log({ action: 'TEST', generateCorrelationId: true });

      expect(mockUuid).toHaveBeenCalled();
      expect(mockModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ correlation_id: 'mock-uuid-1234' })
      );
    });

    it('should return null on error without crashing', async () => {
      mockModel.create.mockRejectedValue(new Error('DB Fail'));
      const result = await service.log({ action: 'TEST' });
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to create audit log:',
        expect.any(Error)
      );
    });

    it('should use provided status and severity', async () => {
      mockModel.create.mockResolvedValue({ id: 1 });
      await service.log({ action: 'TEST', status: 'FAILED', severity: 'ERROR' });

      expect(mockModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'FAILED', severity: 'ERROR' })
      );
    });

    it('should use provided created_at', async () => {
      mockModel.create.mockResolvedValue({ id: 1 });
      const customDate = new Date('2023-01-01');
      await service.log({ action: 'TEST', created_at: customDate });

      expect(mockModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ created_at: customDate })
      );
    });
  });

  describe('logAuth', () => {
    it('should create auth log with correct structure', async () => {
      mockModel.create.mockResolvedValue({ id: 1 });
      await service.logAuth('LOGIN', 'u1', 'test@test.com', 'John', '1.1.1.1', 'Chrome');

      expect(mockModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u1',
          user_email: 'test@test.com',
          user_name: 'John',
          action: 'LOGIN',
          target_type: 'USER',
          ip_address: '1.1.1.1',
          user_agent: 'Chrome',
          category: 'SECURITY',
          severity: 'INFO'
        })
      );
    });

    it('should set severity to WARNING for FAILED actions', async () => {
      mockModel.create.mockResolvedValue({ id: 1 });
      await service.logAuth('LOGIN_FAILED', 'u1', 'a@b.com', 'John', '1.1.1.1', 'Chrome');

      expect(mockModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'WARNING' })
      );
    });
  });

  describe('logDataChange', () => {
    it('should create data change log', async () => {
      mockModel.create.mockResolvedValue({ id: 1 });
      await service.logDataChange(
        'UPDATE', 'USER', 'u1', 'users',
        { name: 'Old' }, { name: 'New' }, 'admin1'
      );

      expect(mockModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'admin1',
          action: 'UPDATE',
          target_type: 'USER',
          target_id: 'u1',
          target_table: 'users',
          category: 'BUSINESS',
          severity: 'INFO'
        })
      );
    });
  });

  describe('logSecurity', () => {
    it('should create security log', async () => {
      mockModel.create.mockResolvedValue({ id: 1 });
      await service.logSecurity('SUSPICIOUS', 'Bot detected', 'u1', '1.1.1.1');

      expect(mockModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUSPICIOUS',
          action_description: 'Bot detected',
          category: 'SECURITY',
          severity: 'WARNING',
          tags: ['security', 'monitoring']
        })
      );
    });
  });

  describe('logSystem', () => {
    it('should create system log', async () => {
      mockModel.create.mockResolvedValue({ id: 1 });
      await service.logSystem('BACKUP', 'Daily backup completed');

      expect(mockModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BACKUP',
          action_description: 'Daily backup completed',
          target_type: 'SYSTEM',
          category: 'SYSTEM',
          severity: 'INFO'
        })
      );
    });
  });

  describe('cleanup', () => {
    it('should delete old logs and create system log', async () => {
      mockModel.deleteOldLogs.mockResolvedValue(100);
      mockModel.create.mockResolvedValue({ id: 1 });

      const result = await service.cleanup(90);

      expect(mockModel.deleteOldLogs).toHaveBeenCalledWith(90);
      expect(result).toEqual({ deleted: 100 });
      expect(mockModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DATABASE_CLEANUP',
          deleted_count: 100
        })
      );
    });

    it('should throw error on cleanup failure', async () => {
      mockModel.deleteOldLogs.mockRejectedValue(new Error('Cleanup failed'));

      await expect(service.cleanup(90)).rejects.toThrow('Cleanup failed');
    });
  });

  describe('query wrapper methods', () => {
    it('getUserActivity should call Model.findByUser', async () => {
      mockModel.findByUser.mockResolvedValue([]);
      await service.getUserActivity('u1', 50);
      expect(mockModel.findByUser).toHaveBeenCalledWith('u1', 50);
    });

    it('getRecentActivity should call Model.findRecent', async () => {
      mockModel.findRecent.mockResolvedValue([]);
      await service.getRecentActivity(100);
      expect(mockModel.findRecent).toHaveBeenCalledWith(100);
    });

    it('getSecurityEvents should call Model.findSecurityEvents', async () => {
      mockModel.findSecurityEvents.mockResolvedValue([]);
      const start = new Date();
      const end = new Date();
      await service.getSecurityEvents(start, end, 50);
      expect(mockModel.findSecurityEvents).toHaveBeenCalledWith(start, end, 50);
    });

    it('exportLogs should call Model.query with limit 10000', async () => {
      mockModel.query.mockResolvedValue({ logs: [] });
      await service.exportLogs({ action: 'LOGIN' }, { sortBy: 'created_at' });
      
      expect(mockModel.query).toHaveBeenCalledWith(
        { action: 'LOGIN' },
        expect.objectContaining({ limit: 10000, sortBy: 'created_at' })
      );
    });

    it('getSuspiciousActivity should query failed logins', async () => {
      mockModel.query.mockResolvedValue({ logs: [] });
      await service.getSuspiciousActivity(24);

      expect(mockModel.query).toHaveBeenCalledWith(
        expect.objectContaining({
          actions: ['FAILED_LOGIN'],
          severity: 'WARNING'
        }),
        { limit: 100 }
      );
    });

    it('getCorrelatedActions should query by correlation_id', async () => {
      mockModel.query.mockResolvedValue({ logs: [] });
      await service.getCorrelatedActions('corr-123');

      expect(mockModel.query).toHaveBeenCalledWith(
        { correlation_id: 'corr-123' },
        { sortBy: 'created_at' }
      );
    });
  });
});