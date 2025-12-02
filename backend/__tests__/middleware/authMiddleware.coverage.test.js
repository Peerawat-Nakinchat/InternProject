// test/middleware/authMiddleware.coverage.test.js
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createAuthMiddleware } from '../../src/middleware/authMiddleware.js';

describe('AuthMiddleware (100% Coverage)', () => {
  let middleware;
  let mockVerifyToken, mockGetToken, mockUser, mockOrgMember;
  let req, res, next;
  let consoleSpy;

  beforeEach(() => {
    // 1. Mock Dependencies
    mockVerifyToken = jest.fn();
    mockGetToken = jest.fn();
    mockUser = { findByPk: jest.fn() };
    mockOrgMember = { findOne: jest.fn() };

    // 2. Inject Mocks
    middleware = createAuthMiddleware({
      verifyAccessToken: mockVerifyToken,
      getAccessToken: mockGetToken,
      User: mockUser,
      OrganizationMember: mockOrgMember
    });

    // 3. Mock Express Objects
    req = {
      headers: {},
      cookies: {},
      params: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();

    // 4. Silence Console
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // 1. Protect Middleware Tests
  // ==========================================
  describe('protect', () => {
    it('should return 401 if no token found', async () => {
      mockGetToken.mockReturnValue(null);

      await middleware.protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'ไม่พบ Token, กรุณาเข้าสู่ระบบ' }));
    });

    it('should return 401 if token invalid or no user_id', async () => {
      mockGetToken.mockReturnValue('invalid-token');
      mockVerifyToken.mockReturnValue({}); // No user_id

      await middleware.protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Token ไม่ถูกต้องหรือหมดอายุ' }));
    });

    it('should return 401 if verifyToken throws error', async () => {
      mockGetToken.mockReturnValue('bad-token');
      mockVerifyToken.mockImplementation(() => { throw new Error('Expired'); });

      await middleware.protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(consoleSpy).toHaveBeenCalledWith('💥 Auth check error:', expect.any(Error));
    });

    it('should return 401 if user not found in DB', async () => {
      mockGetToken.mockReturnValue('valid-token');
      mockVerifyToken.mockReturnValue({ user_id: 1 });
      mockUser.findByPk.mockResolvedValue(null);

      await middleware.protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'ไม่พบผู้ใช้งานในระบบ' }));
    });

    it('should return 401 if user is inactive', async () => {
      mockGetToken.mockReturnValue('valid-token');
      mockVerifyToken.mockReturnValue({ user_id: 1 });
      mockUser.findByPk.mockResolvedValue({ user_id: 1, is_active: false });

      await middleware.protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'บัญชีนี้ถูกระงับการใช้งาน' }));
    });

    it('should call next() and set req.user if success', async () => {
      const mockUserData = { user_id: 1, is_active: true, email: 'test@mail.com' };
      mockGetToken.mockReturnValue('valid-token');
      mockVerifyToken.mockReturnValue({ user_id: 1 });
      mockUser.findByPk.mockResolvedValue(mockUserData);

      await middleware.protect(req, res, next);

      expect(req.user).toEqual(mockUserData);
      expect(next).toHaveBeenCalled();
    });
  });

  // ==========================================
  // 2. CheckOrgRole Middleware Tests
  // ==========================================
  describe('checkOrgRole', () => {
    beforeEach(() => {
      // checkOrgRole runs after protect, so req.user exists
      req.user = { user_id: 1, current_org_id: 100 };
    });

    it('should return 400 if no orgId provided', async () => {
      req.params.orgId = undefined;
      req.user.current_org_id = undefined;

      const mw = middleware.checkOrgRole(['ADMIN']);
      await mw(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'orgId required' }));
    });

    it('should prioritize req.params.orgId over current_org_id', async () => {
        req.params.orgId = 999;
        req.user.current_org_id = 100;
        mockOrgMember.findOne.mockResolvedValue({ role_id: 'ADMIN' });
  
        const mw = middleware.checkOrgRole(['ADMIN']);
        await mw(req, res, next);
  
        expect(mockOrgMember.findOne).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ org_id: 999 })
        }));
      });

    it('should return 403 if not a member', async () => {
      mockOrgMember.findOne.mockResolvedValue(null);

      const mw = middleware.checkOrgRole(['ADMIN']);
      await mw(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'คุณไม่ได้เป็นสมาชิกองค์กรนี้' }));
    });

    it('should return 403 if role not allowed', async () => {
      mockOrgMember.findOne.mockResolvedValue({ role_id: 'MEMBER' });

      const mw = middleware.checkOrgRole(['ADMIN', 'OWNER']); // allowed
      await mw(req, res, next);

      expect(req.user.org_role_id).toBe('MEMBER'); // should still set role
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'คุณไม่มีสิทธิ์ในองค์กรนี้' }));
    });

    it('should call next() if role is allowed', async () => {
      mockOrgMember.findOne.mockResolvedValue({ role_id: 'ADMIN' });

      const mw = middleware.checkOrgRole(['ADMIN']);
      await mw(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle DB errors gracefully', async () => {
      mockOrgMember.findOne.mockRejectedValue(new Error('DB Fail'));

      const mw = middleware.checkOrgRole(['ADMIN']);
      await mw(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(consoleSpy).toHaveBeenCalledWith('💥 checkOrgRole error:', expect.any(Error));
    });
  });

  // ==========================================
  // 3. Authorize Middleware Tests
  // ==========================================
  describe('authorize', () => {
    it('should return 401 if req.user is missing', () => {
      req.user = null;
      const mw = middleware.authorize(['SUPER_ADMIN']);
      mw(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 if role mismatch', () => {
      req.user = { role_id: 'USER' };
      const mw = middleware.authorize(['ADMIN']);
      mw(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should allow if role matches (Array input)', () => {
      req.user = { role_id: 'ADMIN' };
      const mw = middleware.authorize(['ADMIN', 'SUPER_ADMIN']);
      mw(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow if role matches (String input)', () => {
      req.user = { role_id: 'ADMIN' };
      const mw = middleware.authorize('ADMIN'); // Pass string
      mw(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});