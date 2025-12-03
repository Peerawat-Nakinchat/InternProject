/**
 * RoleMiddleware Coverage Tests (Refactored)
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createRoleMiddleware } from '../../src/middleware/roleMiddleware.js';

describe('RoleMiddleware (Refactored Coverage)', () => {
  let middleware;
  let mockLogger;
  let req, res, next;

  beforeEach(() => {
    mockLogger = { suspiciousActivity: jest.fn() };
    middleware = createRoleMiddleware({ securityLogger: mockLogger });

    req = {
      user: { user_id: 'u1', role_id: 1 },
      ip: '127.0.0.1',
      clientInfo: { ipAddress: '127.0.0.1' }
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    next = jest.fn();
  });

  afterEach(() => { jest.clearAllMocks(); });

  it('should allow access if role matches', () => {
    const checkRole = middleware.checkRole([1, 2]);
    checkRole(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('should call next(Forbidden) if role does not match', () => {
    req.user.role_id = 99;
    const checkRole = middleware.checkRole([1, 2]);
    checkRole(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  it('should call next(Forbidden) if role_id is missing', () => {
    req.user.role_id = undefined;
    const checkRole = middleware.checkRole([1]);
    checkRole(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });
});