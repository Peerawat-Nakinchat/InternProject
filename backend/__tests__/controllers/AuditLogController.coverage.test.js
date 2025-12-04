import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createAuditLogController } from '../../src/controllers/AuditLogController.js';

describe('AuditLogController (Ultimate Coverage)', () => {
  let controller, mockService, mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockService = {
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
    controller = createAuditLogController(mockService);
    
    mockReq = {
      user: { user_id: 'u1', role_id: 1 },
      query: {},
      params: {},
      body: {}
    };
    mockRes = { json: jest.fn(), setHeader: jest.fn() };
    mockNext = jest.fn();
  });

  describe('queryAuditLogs', () => {
    it('should clean up null/undefined filters and use defaults', async () => {
      // ส่ง null เพื่อ trigger logic "delete filters[key]"
      mockReq.query = { 
        user_id: null, 
        action: undefined, 
        target_type: 'USER' 
      };
      mockService.query.mockResolvedValue({ logs: [] });
      
      await controller.queryAuditLogs(mockReq, mockRes, mockNext);
      
      // ตรวจสอบว่า service ได้รับ object ที่ไม่มี user_id และ action
      expect(mockService.query).toHaveBeenCalledWith(
        { target_type: 'USER' }, // ค่า null/undefined ต้องหายไป
        expect.objectContaining({ limit: 50, page: 1, sortBy: 'created_at' }) // Defaults
      );
    });

    it('should parse dates and custom pagination', async () => {
      mockReq.query = { 
        start_date: '2023-01-01',
        end_date: '2023-01-31',
        limit: '100',
        page: '2',
        sort_by: 'action',
        sort_order: 'ASC'
      };
      mockService.query.mockResolvedValue({ logs: [] });

      await controller.queryAuditLogs(mockReq, mockRes, mockNext);

      expect(mockService.query).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date)
        }),
        expect.objectContaining({ limit: 100, page: 2, sortBy: 'action', sortOrder: 'ASC' })
      );
    });
  });

  describe('getUserActivity', () => {
    // Case 1: Admin ดูของคนอื่น (ผ่าน)
    it('should allow Admin to view other users', async () => {
      mockReq.user = { user_id: 'admin', role_id: 1 };
      mockReq.params.userId = 'other-user';
      mockService.getUserActivity.mockResolvedValue([]);

      await controller.getUserActivity(mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalled();
    });

    // Case 2: User ดูของตัวเอง (ผ่าน)
    it('should allow User to view themselves', async () => {
      mockReq.user = { user_id: 'me', role_id: 2 };
      mockReq.params.userId = 'me';
      mockService.getUserActivity.mockResolvedValue([]);

      await controller.getUserActivity(mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalled();
    });

    // Case 3: User ดูของคนอื่น (ไม่ผ่าน)
    it('should forbid User from viewing others', async () => {
      mockReq.user = { user_id: 'me', role_id: 2 }; // Not Admin
      mockReq.params.userId = 'other';
      
      await controller.getUserActivity(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 403 // หรือเช็ค message
      }));
    });
  });

  describe('getSecurityEvents', () => {
    it('should use default date range (7 days) if query empty', async () => {
      mockService.getSecurityEvents.mockResolvedValue([]);
      await controller.getSecurityEvents(mockReq, mockRes, mockNext);
      
      // เช็คว่าส่ง Date object ไปจริง (เป็นการ verify ว่า logic default ทำงาน)
      expect(mockService.getSecurityEvents).toHaveBeenCalledWith(
        expect.any(Date), expect.any(Date), 100
      );
    });

    it('should use provided date range', async () => {
      mockReq.query = { start_date: '2023-01-01', end_date: '2023-01-02' };
      mockService.getSecurityEvents.mockResolvedValue([]);
      await controller.getSecurityEvents(mockReq, mockRes, mockNext);
      
      const args = mockService.getSecurityEvents.mock.calls[0];
      expect(args[0]).toBeInstanceOf(Date);
      expect(args[1]).toBeInstanceOf(Date);
    });
  });

  describe('getStatistics', () => {
    it('should use default 30 days range', async () => {
      mockService.getStatistics.mockResolvedValue({});
      await controller.getStatistics(mockReq, mockRes, mockNext);
      expect(mockService.getStatistics).toHaveBeenCalledWith(expect.any(Date), expect.any(Date));
    });
  });

  describe('exportLogs', () => {
    it('should filter undefined query params', async () => {
      mockReq.query = { action: 'LOGIN', user_id: '' }; // empty string treated as falsy
      mockService.exportLogs.mockResolvedValue([]);
      
      await controller.exportLogs(mockReq, mockRes, mockNext);
      
      // user_id ควรหายไป
      expect(mockService.exportLogs).toHaveBeenCalledWith(expect.objectContaining({
        action: 'LOGIN'
      }));
      expect(mockService.exportLogs).not.toHaveBeenCalledWith(expect.objectContaining({
        user_id: ''
      }));
    });
  });

  // Covering simple methods to ensure 100% lines
  it('getMyActivity calls service', async () => {
    mockService.getUserActivity.mockResolvedValue([]);
    await controller.getMyActivity(mockReq, mockRes, mockNext);
    expect(mockService.getUserActivity).toHaveBeenCalledWith('u1', 50);
  });

  it('getRecentActivity calls service', async () => {
    mockService.getRecentActivity.mockResolvedValue([]);
    await controller.getRecentActivity(mockReq, mockRes, mockNext);
    expect(mockService.getRecentActivity).toHaveBeenCalled();
  });

  it('getFailedActions calls service', async () => {
    mockService.getFailedActions.mockResolvedValue([]);
    await controller.getFailedActions(mockReq, mockRes, mockNext);
    expect(mockService.getFailedActions).toHaveBeenCalled();
  });

  it('getSuspiciousActivity calls service', async () => {
    mockService.getSuspiciousActivity.mockResolvedValue({});
    await controller.getSuspiciousActivity(mockReq, mockRes, mockNext);
    expect(mockService.getSuspiciousActivity).toHaveBeenCalledWith(24);
  });

  it('getCorrelatedActions calls service', async () => {
    mockReq.params.correlationId = '123';
    mockService.getCorrelatedActions.mockResolvedValue({});
    await controller.getCorrelatedActions(mockReq, mockRes, mockNext);
    expect(mockService.getCorrelatedActions).toHaveBeenCalledWith('123');
  });

  it('cleanupLogs calls service', async () => {
    mockReq.body.retention_days = 90;
    mockService.cleanup.mockResolvedValue({ deleted: 1 });
    await controller.cleanupLogs(mockReq, mockRes, mockNext);
    expect(mockService.cleanup).toHaveBeenCalledWith(90);
  });
});