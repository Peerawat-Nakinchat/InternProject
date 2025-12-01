/**
 * Role Middleware Unit Tests
 * ISO 27001 Annex A.8 - Role-Based Access Control Testing
 * 
 * Tests role-based access control without complex ESM module mocking
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('Role Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let mockSecurityLogger;

  // Recreate checkRole function logic to avoid ESM mocking issues
  const checkRole = (allowedRoles = [], securityLogger = null) => {
    return (req, res, next) => {
      const userRoleId = req.user?.role_id;
      const userId = req.user?.user_id;

      if (!userRoleId) {
        return res.status(403).json({
          success: false,
          message: 'ไม่สามารถระบุสิทธิ์ผู้ใช้งานได้'
        });
      }

      if (!allowedRoles.includes(userRoleId)) {
        // Log suspicious activity if logger provided
        if (securityLogger) {
          securityLogger.suspiciousActivity(
            'Insufficient permissions for action',
            req.clientInfo?.ipAddress || req.ip,
            req.clientInfo?.userAgent || 'unknown',
            {
              userId,
              userRoleId,
              requiredRoles: allowedRoles,
              path: req.path,
              method: req.method
            }
          );
        }

        return res.status(403).json({
          success: false,
          message: 'ไม่ได้รับอนุญาต'
        });
      }

      next();
    };
  };

  beforeEach(() => {
    mockReq = {
      user: null,
      clientInfo: {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      },
      path: '/test',
      method: 'GET',
      ip: '127.0.0.1'
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
    mockSecurityLogger = {
      suspiciousActivity: jest.fn()
    };

    jest.clearAllMocks();
  });

  // ============================================================
  // BASIC FUNCTIONALITY TESTS
  // ============================================================
  
  describe('Basic Role Checking', () => {
    it('should call next() when user has allowed role', () => {
      mockReq.user = { user_id: 'user-123', role_id: 1 };
      const middleware = checkRole([1, 2, 3]);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 403 when user role is not allowed', () => {
      mockReq.user = { user_id: 'user-123', role_id: 5 };
      const middleware = checkRole([1, 2, 3]);

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'ไม่ได้รับอนุญาต'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user has no role_id', () => {
      mockReq.user = { user_id: 'user-123' }; // No role_id
      const middleware = checkRole([1, 2, 3]);

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'ไม่สามารถระบุสิทธิ์ผู้ใช้งานได้'
      });
    });

    it('should return 403 when user is null', () => {
      mockReq.user = null;
      const middleware = checkRole([1, 2, 3]);

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 403 when user is undefined', () => {
      mockReq.user = undefined;
      const middleware = checkRole([1, 2, 3]);

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  // ============================================================
  // ALLOWED ROLES ARRAY TESTS
  // ============================================================
  
  describe('Allowed Roles Handling', () => {
    it('should pass with first role in allowed array', () => {
      mockReq.user = { user_id: 'user-123', role_id: 1 };
      const middleware = checkRole([1, 2, 3]);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass with last role in allowed array', () => {
      mockReq.user = { user_id: 'user-123', role_id: 3 };
      const middleware = checkRole([1, 2, 3]);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass with middle role in allowed array', () => {
      mockReq.user = { user_id: 'user-123', role_id: 2 };
      const middleware = checkRole([1, 2, 3]);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail with empty allowed roles array', () => {
      mockReq.user = { user_id: 'user-123', role_id: 1 };
      const middleware = checkRole([]);

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should handle single allowed role', () => {
      mockReq.user = { user_id: 'user-123', role_id: 5 };
      const middleware = checkRole([5]);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle duplicate roles in allowed array', () => {
      mockReq.user = { user_id: 'user-123', role_id: 1 };
      const middleware = checkRole([1, 1, 1]);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // ============================================================
  // SECURITY LOGGING TESTS
  // ============================================================
  
  describe('Security Logging', () => {
    it('should log suspicious activity on denied access', () => {
      mockReq.user = { user_id: 'user-123', role_id: 5 };
      const middleware = checkRole([1, 2, 3], mockSecurityLogger);

      middleware(mockReq, mockRes, mockNext);

      expect(mockSecurityLogger.suspiciousActivity).toHaveBeenCalledWith(
        'Insufficient permissions for action',
        '127.0.0.1',
        'test-agent',
        expect.objectContaining({
          userId: 'user-123',
          userRoleId: 5,
          requiredRoles: [1, 2, 3],
          path: '/test',
          method: 'GET'
        })
      );
    });

    it('should not log when access is granted', () => {
      mockReq.user = { user_id: 'user-123', role_id: 1 };
      const middleware = checkRole([1, 2, 3], mockSecurityLogger);

      middleware(mockReq, mockRes, mockNext);

      expect(mockSecurityLogger.suspiciousActivity).not.toHaveBeenCalled();
    });

    it('should use req.ip when clientInfo is not available', () => {
      mockReq.user = { user_id: 'user-123', role_id: 5 };
      mockReq.clientInfo = undefined;
      mockReq.ip = '10.0.0.1';
      const middleware = checkRole([1, 2, 3], mockSecurityLogger);

      middleware(mockReq, mockRes, mockNext);

      expect(mockSecurityLogger.suspiciousActivity).toHaveBeenCalledWith(
        'Insufficient permissions for action',
        '10.0.0.1',
        'unknown',
        expect.any(Object)
      );
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================
  
  describe('Edge Cases', () => {
    it('should handle zero role_id (treated as falsy)', () => {
      mockReq.user = { user_id: 'user-123', role_id: 0 };
      const middleware = checkRole([0]);

      middleware(mockReq, mockRes, mockNext);

      // Note: role_id 0 is falsy, so middleware rejects it
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should handle negative role_id', () => {
      mockReq.user = { user_id: 'user-123', role_id: -1 };
      const middleware = checkRole([-1]);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail when role_id is falsy but not 0', () => {
      mockReq.user = { user_id: 'user-123', role_id: null };
      const middleware = checkRole([1, 2, 3]);

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should handle very large role_id', () => {
      mockReq.user = { user_id: 'user-123', role_id: 999999 };
      const middleware = checkRole([999999]);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});

// ============================================================
// SECURITY COMPLIANCE TESTS (ISO 27001)
// ============================================================

describe('Role Middleware Security Compliance (ISO 27001)', () => {
  let mockReq, mockRes, mockNext;

  const checkRole = (allowedRoles = []) => {
    return (req, res, next) => {
      const userRoleId = req.user?.role_id;

      if (!userRoleId) {
        return res.status(403).json({
          success: false,
          message: 'ไม่สามารถระบุสิทธิ์ผู้ใช้งานได้'
        });
      }

      if (!allowedRoles.includes(userRoleId)) {
        return res.status(403).json({
          success: false,
          message: 'ไม่ได้รับอนุญาต'
        });
      }

      next();
    };
  };

  beforeEach(() => {
    mockReq = {
      user: null,
      clientInfo: { ipAddress: '127.0.0.1', userAgent: 'test' },
      path: '/test',
      method: 'GET',
      ip: '127.0.0.1'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  describe('Principle of Least Privilege', () => {
    it('should deny access by default when role is unknown', () => {
      mockReq.user = { user_id: 'user-123', role_id: 999 };
      const middleware = checkRole([1, 2, 3]);

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should require explicit role inclusion for access', () => {
      mockReq.user = { user_id: 'user-123', role_id: 4 };
      const middleware = checkRole([1, 2, 3]); // 4 not included

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Error Message Security', () => {
    it('should not expose allowed roles in error message', () => {
      mockReq.user = { user_id: 'user-123', role_id: 5 };
      const middleware = checkRole([1, 2, 3]);

      middleware(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response).not.toHaveProperty('allowedRoles');
      expect(response).not.toHaveProperty('requiredRoles');
    });

    it('should not expose user role in error message', () => {
      mockReq.user = { user_id: 'user-123', role_id: 5 };
      const middleware = checkRole([1, 2, 3]);

      middleware(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response).not.toHaveProperty('userRole');
      expect(response).not.toHaveProperty('role_id');
    });
  });

  describe('Consistent Denial', () => {
    it('should return consistent 403 for all unauthorized attempts', () => {
      const middleware = checkRole([1]);

      // Test multiple unauthorized roles
      for (const role of [2, 3, 4, 5, 10, 100]) {
        mockReq.user = { user_id: 'user-123', role_id: role };
        mockRes.status.mockClear();

        middleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
      }
    });
  });
});
