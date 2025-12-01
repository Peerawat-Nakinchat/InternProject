/**
 * AuditLogController Coverage Tests
 * Tests the REAL AuditLogController using dependency injection
 * This ensures actual code execution for coverage metrics (90%+ branch coverage)
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createAuditLogController } from '../../src/controllers/AuditLogController.js';

describe('AuditLogController (Real Coverage Tests)', () => {
  let controller;
  let mockAuditLogService;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock service
    mockAuditLogService = {
      query: jest.fn(),
      getUserActivity: jest.fn(),
      getRecentActivity: jest.fn(),
      getSecurityEvents: jest.fn(),
      getFailedActions: jest.fn(),
      getSuspiciousActivity: jest.fn(),
      getStatistics: jest.fn(),
      getCorrelatedActions: jest.fn(),
      exportLogs: jest.fn(),
      cleanup: jest.fn()
    };

    // Create controller with mock service using dependency injection
    controller = createAuditLogController(mockAuditLogService);

    mockReq = {
      user: { 
        user_id: 'user-123',
        role_id: 1 // admin
      },
      body: {},
      params: {},
      query: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis()
    };
  });

  describe('queryAuditLogs', () => {
    it('should query audit logs with all filters', async () => {
      const result = { data: [], total: 0 };
      mockReq.query = {
        user_id: 'user-1',
        user_email: 'test@test.com',
        action: 'LOGIN',
        target_type: 'USER',
        target_id: 'target-1',
        status: 'SUCCESS',
        severity: 'INFO',
        category: 'AUTH',
        organization_id: 'org-1',
        ip_address: '127.0.0.1',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        correlation_id: 'corr-123',
        page: '2',
        limit: '25',
        sort_by: 'action',
        sort_order: 'ASC'
      };
      mockAuditLogService.query.mockResolvedValue(result);

      await controller.queryAuditLogs(mockReq, mockRes);

      expect(mockAuditLogService.query).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        ...result
      });
    });

    it('should query with default options when not provided', async () => {
      const result = { data: [], total: 0 };
      mockReq.query = {};
      mockAuditLogService.query.mockResolvedValue(result);

      await controller.queryAuditLogs(mockReq, mockRes);

      expect(mockAuditLogService.query).toHaveBeenCalledWith(
        {},
        { page: 1, limit: 50, sortBy: 'created_at', sortOrder: 'DESC' }
      );
    });

    it('should remove null/undefined filters', async () => {
      const result = { data: [], total: 0 };
      mockReq.query = { user_id: 'user-1' };
      mockAuditLogService.query.mockResolvedValue(result);

      await controller.queryAuditLogs(mockReq, mockRes);

      const calledFilters = mockAuditLogService.query.mock.calls[0][0];
      expect(calledFilters.user_id).toBe('user-1');
      expect(calledFilters.user_email).toBeUndefined();
    });

    it('should return 500 for errors', async () => {
      mockReq.query = {};
      mockAuditLogService.query.mockRejectedValue(new Error('Database error'));

      await controller.queryAuditLogs(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('getUserActivity', () => {
    it('should get user activity for own user', async () => {
      const logs = [{ id: 1, action: 'LOGIN' }];
      mockReq.params = { userId: 'user-123' };
      mockReq.query = { limit: '25' };
      mockAuditLogService.getUserActivity.mockResolvedValue(logs);

      await controller.getUserActivity(mockReq, mockRes);

      expect(mockAuditLogService.getUserActivity).toHaveBeenCalledWith('user-123', 25);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: logs,
        total: logs.length
      });
    });

    it('should allow admin to view other user activity', async () => {
      const logs = [{ id: 1, action: 'LOGIN' }];
      mockReq.params = { userId: 'user-456' };
      mockReq.user.role_id = 1; // admin
      mockAuditLogService.getUserActivity.mockResolvedValue(logs);

      await controller.getUserActivity(mockReq, mockRes);

      expect(mockAuditLogService.getUserActivity).toHaveBeenCalledWith('user-456', 50);
    });

    it('should return 403 for non-admin viewing other user activity', async () => {
      mockReq.params = { userId: 'user-456' };
      mockReq.user = { user_id: 'user-123', role_id: 2 }; // non-admin

      await controller.getUserActivity(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'ไม่มีสิทธิ์ดูประวัติของผู้ใช้อื่น'
      });
    });

    it('should return 500 for errors', async () => {
      mockReq.params = { userId: 'user-123' };
      mockAuditLogService.getUserActivity.mockRejectedValue(new Error('Database error'));

      await controller.getUserActivity(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('getMyActivity', () => {
    it('should get my activity with custom limit', async () => {
      const logs = [{ id: 1, action: 'LOGIN' }];
      mockReq.query = { limit: '25' };
      mockAuditLogService.getUserActivity.mockResolvedValue(logs);

      await controller.getMyActivity(mockReq, mockRes);

      expect(mockAuditLogService.getUserActivity).toHaveBeenCalledWith('user-123', 25);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: logs,
        total: logs.length
      });
    });

    it('should use default limit', async () => {
      const logs = [{ id: 1, action: 'LOGIN' }];
      mockReq.query = {};
      mockAuditLogService.getUserActivity.mockResolvedValue(logs);

      await controller.getMyActivity(mockReq, mockRes);

      expect(mockAuditLogService.getUserActivity).toHaveBeenCalledWith('user-123', 50);
    });

    it('should return 500 for errors', async () => {
      mockReq.query = {};
      mockAuditLogService.getUserActivity.mockRejectedValue(new Error('Database error'));

      await controller.getMyActivity(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('getRecentActivity', () => {
    it('should get recent activity with custom limit', async () => {
      const logs = [{ id: 1, action: 'LOGIN' }];
      mockReq.query = { limit: '50' };
      mockAuditLogService.getRecentActivity.mockResolvedValue(logs);

      await controller.getRecentActivity(mockReq, mockRes);

      expect(mockAuditLogService.getRecentActivity).toHaveBeenCalledWith(50);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: logs,
        total: logs.length
      });
    });

    it('should use default limit of 100', async () => {
      const logs = [];
      mockReq.query = {};
      mockAuditLogService.getRecentActivity.mockResolvedValue(logs);

      await controller.getRecentActivity(mockReq, mockRes);

      expect(mockAuditLogService.getRecentActivity).toHaveBeenCalledWith(100);
    });

    it('should return 500 for errors', async () => {
      mockReq.query = {};
      mockAuditLogService.getRecentActivity.mockRejectedValue(new Error('Database error'));

      await controller.getRecentActivity(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('getSecurityEvents', () => {
    it('should get security events with custom dates', async () => {
      const logs = [{ id: 1, action: 'FAILED_LOGIN' }];
      mockReq.query = { 
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        limit: '50'
      };
      mockAuditLogService.getSecurityEvents.mockResolvedValue(logs);

      await controller.getSecurityEvents(mockReq, mockRes);

      expect(mockAuditLogService.getSecurityEvents).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: logs,
        total: logs.length
      });
    });

    it('should use default dates (last 7 days)', async () => {
      const logs = [];
      mockReq.query = {};
      mockAuditLogService.getSecurityEvents.mockResolvedValue(logs);

      await controller.getSecurityEvents(mockReq, mockRes);

      expect(mockAuditLogService.getSecurityEvents).toHaveBeenCalled();
      const call = mockAuditLogService.getSecurityEvents.mock.calls[0];
      expect(call[0]).toBeInstanceOf(Date);
      expect(call[1]).toBeInstanceOf(Date);
      expect(call[2]).toBe(100);
    });

    it('should return 500 for errors', async () => {
      mockReq.query = {};
      mockAuditLogService.getSecurityEvents.mockRejectedValue(new Error('Database error'));

      await controller.getSecurityEvents(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('getFailedActions', () => {
    it('should get failed actions with custom limit', async () => {
      const logs = [{ id: 1, action: 'FAILED_LOGIN', status: 'FAILED' }];
      mockReq.query = { limit: '50' };
      mockAuditLogService.getFailedActions.mockResolvedValue(logs);

      await controller.getFailedActions(mockReq, mockRes);

      expect(mockAuditLogService.getFailedActions).toHaveBeenCalledWith(50);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: logs,
        total: logs.length
      });
    });

    it('should use default limit of 100', async () => {
      const logs = [];
      mockReq.query = {};
      mockAuditLogService.getFailedActions.mockResolvedValue(logs);

      await controller.getFailedActions(mockReq, mockRes);

      expect(mockAuditLogService.getFailedActions).toHaveBeenCalledWith(100);
    });

    it('should return 500 for errors', async () => {
      mockReq.query = {};
      mockAuditLogService.getFailedActions.mockRejectedValue(new Error('Database error'));

      await controller.getFailedActions(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('getSuspiciousActivity', () => {
    it('should get suspicious activity with custom hours', async () => {
      const result = { suspicious: [], count: 0 };
      mockReq.query = { hours: '12' };
      mockAuditLogService.getSuspiciousActivity.mockResolvedValue(result);

      await controller.getSuspiciousActivity(mockReq, mockRes);

      expect(mockAuditLogService.getSuspiciousActivity).toHaveBeenCalledWith(12);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        ...result
      });
    });

    it('should use default 24 hours', async () => {
      const result = { suspicious: [], count: 0 };
      mockReq.query = {};
      mockAuditLogService.getSuspiciousActivity.mockResolvedValue(result);

      await controller.getSuspiciousActivity(mockReq, mockRes);

      expect(mockAuditLogService.getSuspiciousActivity).toHaveBeenCalledWith(24);
    });

    it('should return 500 for errors', async () => {
      mockReq.query = {};
      mockAuditLogService.getSuspiciousActivity.mockRejectedValue(new Error('Database error'));

      await controller.getSuspiciousActivity(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('getStatistics', () => {
    it('should get statistics with custom dates', async () => {
      const stats = { totalLogs: 100, byAction: {} };
      mockReq.query = { 
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };
      mockAuditLogService.getStatistics.mockResolvedValue(stats);

      await controller.getStatistics(mockReq, mockRes);

      expect(mockAuditLogService.getStatistics).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: stats
      });
    });

    it('should use default dates (last 30 days)', async () => {
      const stats = { totalLogs: 0 };
      mockReq.query = {};
      mockAuditLogService.getStatistics.mockResolvedValue(stats);

      await controller.getStatistics(mockReq, mockRes);

      expect(mockAuditLogService.getStatistics).toHaveBeenCalled();
      const call = mockAuditLogService.getStatistics.mock.calls[0];
      expect(call[0]).toBeInstanceOf(Date);
      expect(call[1]).toBeInstanceOf(Date);
    });

    it('should return 500 for errors', async () => {
      mockReq.query = {};
      mockAuditLogService.getStatistics.mockRejectedValue(new Error('Database error'));

      await controller.getStatistics(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('getCorrelatedActions', () => {
    it('should get correlated actions', async () => {
      const result = { logs: [], correlation_id: 'corr-123' };
      mockReq.params = { correlationId: 'corr-123' };
      mockAuditLogService.getCorrelatedActions.mockResolvedValue(result);

      await controller.getCorrelatedActions(mockReq, mockRes);

      expect(mockAuditLogService.getCorrelatedActions).toHaveBeenCalledWith('corr-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        ...result
      });
    });

    it('should return 500 for errors', async () => {
      mockReq.params = { correlationId: 'corr-123' };
      mockAuditLogService.getCorrelatedActions.mockRejectedValue(new Error('Database error'));

      await controller.getCorrelatedActions(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('exportLogs', () => {
    it('should export logs with all filters', async () => {
      const logs = [{ id: 1, action: 'LOGIN' }];
      mockReq.query = {
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        user_id: 'user-1',
        action: 'LOGIN',
        organization_id: 'org-1'
      };
      mockAuditLogService.exportLogs.mockResolvedValue(logs);

      await controller.exportLogs(mockReq, mockRes);

      expect(mockAuditLogService.exportLogs).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment; filename=audit-logs-')
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        exported_at: expect.any(Date),
        total: logs.length,
        logs
      });
    });

    it('should remove null/empty filters', async () => {
      const logs = [];
      mockReq.query = { user_id: 'user-1' };
      mockAuditLogService.exportLogs.mockResolvedValue(logs);

      await controller.exportLogs(mockReq, mockRes);

      const calledFilters = mockAuditLogService.exportLogs.mock.calls[0][0];
      expect(calledFilters.user_id).toBe('user-1');
      expect(calledFilters.startDate).toBeUndefined();
    });

    it('should return 500 for errors', async () => {
      mockReq.query = {};
      mockAuditLogService.exportLogs.mockRejectedValue(new Error('Database error'));

      await controller.exportLogs(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('cleanupLogs', () => {
    it('should cleanup logs with custom retention days', async () => {
      const result = { deleted: 100 };
      mockReq.body = { retention_days: 30 };
      mockAuditLogService.cleanup.mockResolvedValue(result);

      await controller.cleanupLogs(mockReq, mockRes);

      expect(mockAuditLogService.cleanup).toHaveBeenCalledWith(30);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'ลบ audit logs ที่เก่ากว่า 30 วัน สำเร็จ',
        deleted: 100
      });
    });

    it('should use default 90 days retention', async () => {
      const result = { deleted: 0 };
      mockReq.body = {};
      mockAuditLogService.cleanup.mockResolvedValue(result);

      await controller.cleanupLogs(mockReq, mockRes);

      expect(mockAuditLogService.cleanup).toHaveBeenCalledWith(90);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'ลบ audit logs ที่เก่ากว่า 90 วัน สำเร็จ',
        deleted: 0
      });
    });

    it('should return 500 for errors', async () => {
      mockReq.body = {};
      mockAuditLogService.cleanup.mockRejectedValue(new Error('Database error'));

      await controller.cleanupLogs(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });
});
