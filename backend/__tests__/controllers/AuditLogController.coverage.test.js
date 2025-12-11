/**
 * AuditLogController Coverage Tests
 * Targets 100% Code Coverage
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

// 1. Setup Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const controllerPath = path.resolve(__dirname, '../../src/controllers/AuditLogController.js');
const errorHandlerPath = path.resolve(__dirname, '../../src/middleware/errorHandler.js');

// 2. Mock Error Handler
class CustomError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

await jest.unstable_mockModule(errorHandlerPath, () => ({
  asyncHandler: (fn) => async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  },
  createError: {
    forbidden: jest.fn((msg) => new CustomError(msg, 403)),
  }
}));

// 3. Import Controller
const { createAuditLogController } = await import(controllerPath);

// 4. Mock Service
const mockService = {
  queryAuditLogs: jest.fn(),
  getUserActivity: jest.fn(),
  getMyActivity: jest.fn(),
  getRecentActivity: jest.fn(),
  getSecurityEvents: jest.fn(),
  getFailedActions: jest.fn(),
  getSuspiciousActivity: jest.fn(),
  getStatistics: jest.fn(),
  getCorrelatedActions: jest.fn(),
  exportLogs: jest.fn(),
  cleanupLogs: jest.fn()
};

const mockRes = {
  json: jest.fn(),
  status: jest.fn().mockReturnThis(),
  setHeader: jest.fn(),
  send: jest.fn() // สำหรับ exportLogs ที่อาจจะใช้ send หรือ json
};

const mockNext = jest.fn();

const controller = createAuditLogController(mockService);

describe('AuditLogController (Ultimate Coverage)', () => {
  let req;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      query: {},
      params: {},
      body: {},
      user: { user_id: 'u1', role: 'user', org_role_id: 'member' }
    };
  });

  describe('queryAuditLogs', () => {
    it('should clean up null/undefined filters and call service', async () => {
      req.query = { 
        target_type: 'USER', 
        user_id: '', // Should be filtered out
        page: '1', 
        limit: '50' 
      };
      
      mockService.queryAuditLogs.mockResolvedValue([]);

      await controller.queryAuditLogs(req, mockRes, mockNext);

      // Expect service to be called with filtered object and original query
      expect(mockService.queryAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ target_type: 'USER' }), // user_id should be gone from first arg
        expect.objectContaining({ page: '1', limit: '50' })
      );
      expect(mockService.queryAuditLogs).toHaveBeenCalledWith(
        expect.not.objectContaining({ user_id: '' }),
        expect.anything()
      );
    });

    it('should parse dates', async () => {
      req.query = { start_date: '2023-01-01', end_date: '2023-01-31' };
      mockService.queryAuditLogs.mockResolvedValue([]);

      await controller.queryAuditLogs(req, mockRes, mockNext);

      const calledFilters = mockService.queryAuditLogs.mock.calls[0][0];
      expect(calledFilters.startDate).toBeInstanceOf(Date);
      expect(calledFilters.endDate).toBeInstanceOf(Date);
    });
  });

  describe('getUserActivity', () => {
    it('should allow Admin to view other users', async () => {
      req.user = { user_id: 'admin', role: 'admin' };
      req.params.userId = 'other-user';
      mockService.getUserActivity.mockResolvedValue([]);

      await controller.getUserActivity(req, mockRes, mockNext);

      expect(mockService.getUserActivity).toHaveBeenCalledWith('other-user', req.query);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should allow User to view themselves', async () => {
      req.user = { user_id: 'u1', role: 'user' };
      req.params.userId = 'u1'; // Same ID
      mockService.getUserActivity.mockResolvedValue([]);

      await controller.getUserActivity(req, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should forbid User from viewing others', async () => {
      req.user = { user_id: 'u1', role: 'user' };
      req.params.userId = 'u2'; // Different ID

      await controller.getUserActivity(req, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });
  });

  describe('getMyActivity', () => {
    it('calls service with correct user_id', async () => {
      req.user.user_id = 'u1';
      mockService.getMyActivity.mockResolvedValue([]);
      
      await controller.getMyActivity(req, mockRes, mockNext);
      
      expect(mockService.getMyActivity).toHaveBeenCalledWith('u1', req.query);
    });
  });

  describe('getRecentActivity', () => {
    it('calls service', async () => {
      mockService.getRecentActivity.mockResolvedValue([]);
      await controller.getRecentActivity(req, mockRes, mockNext);
      expect(mockService.getRecentActivity).toHaveBeenCalledWith(req.query);
    });
  });

  describe('getSecurityEvents', () => {
    it('calls service with query params', async () => {
      mockService.getSecurityEvents.mockResolvedValue([]);
      await controller.getSecurityEvents(req, mockRes, mockNext);
      
      // Controller just passes req.query to Service now (Service handles logic)
      expect(mockService.getSecurityEvents).toHaveBeenCalledWith(req.query);
    });
  });

  describe('getFailedActions', () => {
    it('calls service', async () => {
      mockService.getFailedActions.mockResolvedValue([]);
      await controller.getFailedActions(req, mockRes, mockNext);
      expect(mockService.getFailedActions).toHaveBeenCalledWith(req.query);
    });
  });

  describe('getSuspiciousActivity', () => {
    it('calls service', async () => {
      mockService.getSuspiciousActivity.mockResolvedValue([]);
      await controller.getSuspiciousActivity(req, mockRes, mockNext);
      expect(mockService.getSuspiciousActivity).toHaveBeenCalledWith(req.query);
    });
  });

  describe('getStatistics', () => {
    it('calls service', async () => {
      mockService.getStatistics.mockResolvedValue({});
      await controller.getStatistics(req, mockRes, mockNext);
      expect(mockService.getStatistics).toHaveBeenCalledWith(req.query);
    });
  });

  describe('getCorrelatedActions', () => {
    it('calls service', async () => {
      req.params.correlationId = 'corr-1';
      mockService.getCorrelatedActions.mockResolvedValue([]);
      await controller.getCorrelatedActions(req, mockRes, mockNext);
      expect(mockService.getCorrelatedActions).toHaveBeenCalledWith('corr-1');
    });
  });

  describe('exportLogs', () => {
    it('calls service and returns success', async () => {
      mockService.exportLogs.mockResolvedValue([]);
      await controller.exportLogs(req, mockRes, mockNext);
      
      expect(mockService.exportLogs).toHaveBeenCalledWith(req.query);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('cleanupLogs', () => {
    it('calls service with default retention if not provided', async () => {
      req.body = {};
      mockService.cleanupLogs.mockResolvedValue({ deleted: 1 });
      
      await controller.cleanupLogs(req, mockRes, mockNext);
      
      // Default is 90
      expect(mockService.cleanupLogs).toHaveBeenCalledWith(90);
    });

    it('calls service with provided retention', async () => {
      req.body = { retention_days: 30 };
      mockService.cleanupLogs.mockResolvedValue({ deleted: 1 });
      
      await controller.cleanupLogs(req, mockRes, mockNext);
      
      expect(mockService.cleanupLogs).toHaveBeenCalledWith(30);
    });
  });
});