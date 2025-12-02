// test/middleware/roleMiddleware.coverage.test.js
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createRoleMiddleware } from '../../src/middleware/roleMiddleware.js';

describe('RoleMiddleware (100% Coverage)', () => {
  let middleware;
  let mockLogger;
  let req, res, next;

  beforeEach(() => {
    // 1. Mock Logger
    mockLogger = { suspiciousActivity: jest.fn() };

    // 2. Inject Mock
    middleware = createRoleMiddleware({ securityLogger: mockLogger });

    // 3. Mock Express Objects
    req = {
      user: { user_id: 'u1', role_id: 1 },
      ip: '127.0.0.1',
      clientInfo: { ipAddress: '127.0.0.1', userAgent: 'Jest' },
      path: '/admin',
      method: 'POST'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // Core Logic Tests
  // ==========================================
  
  it('should allow access if role matches', () => {
    const checkRole = middleware.checkRole([1, 2]);
    checkRole(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(mockLogger.suspiciousActivity).not.toHaveBeenCalled();
  });

  it('should allow access if role matches (single role)', () => {
    const checkRole = middleware.checkRole([1]);
    checkRole(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should deny access if role does not match', () => {
    req.user.role_id = 99;
    const checkRole = middleware.checkRole([1, 2]);
    checkRole(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'ไม่ได้รับอนุญาต' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should log suspicious activity on denial', () => {
    req.user.role_id = 99;
    const checkRole = middleware.checkRole([1]);
    checkRole(req, res, next);

    expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith(
      'Insufficient permissions for action',
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        userRoleId: 99,
        requiredRoles: [1]
      })
    );
  });

  it('should return 403 if role_id is missing (undefined)', () => {
    req.user.role_id = undefined;
    const checkRole = middleware.checkRole([1]);
    checkRole(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'ไม่สามารถระบุสิทธิ์ผู้ใช้งานได้' }));
  });

  it('should return 403 if user object is missing', () => {
    req.user = null;
    const checkRole = middleware.checkRole([1]);
    checkRole(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  // ==========================================
  // Edge Case Tests
  // ==========================================

  it('should handle role_id = 0 correctly (if allowed)', () => {
    req.user.role_id = 0;
    const checkRole = middleware.checkRole([0, 1]);
    checkRole(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should handle role_id = 0 correctly (if denied)', () => {
    req.user.role_id = 0;
    const checkRole = middleware.checkRole([1, 2]);
    checkRole(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should use fallback IP if clientInfo missing', () => {
    req.clientInfo = undefined;
    req.user.role_id = 99;
    const checkRole = middleware.checkRole([1]);
    checkRole(req, res, next);

    expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith(
      expect.any(String),
      '127.0.0.1', // req.ip
      'unknown',   // fallback user agent
      expect.any(Object)
    );
  });
});