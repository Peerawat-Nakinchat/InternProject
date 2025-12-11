/**
 * AuthMiddleware Coverage Tests (ESM Style Fixed)
 * Targets 100% Code Coverage
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

// ✅ 1. Setup Absolute Paths (แก้ปัญหาหาไฟล์ไม่เจอ)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authMiddlewarePath = path.resolve(__dirname, '../../src/middleware/authMiddleware.js');
const errorHandlerPath = path.resolve(__dirname, '../../src/middleware/errorHandler.js');

// ✅ 2. Mock Modules (ใช้ unstable_mockModule ตามสไตล์ ESM)
// Mock Error Handler
await jest.unstable_mockModule(errorHandlerPath, () => ({
  asyncHandler: (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next),
  createError: {
    unauthorized: jest.fn((msg) => { 
      const error = new Error(msg || 'Unauthorized'); 
      error.statusCode = 401; 
      return error; 
    }),
    forbidden: jest.fn((msg) => { 
      const error = new Error(msg || 'Forbidden'); 
      error.statusCode = 403; 
      return error; 
    }),
    badRequest: jest.fn((msg) => { 
      const error = new Error(msg || 'Bad Request'); 
      error.statusCode = 400; 
      return error; 
    }),
  }
}));

// Mock module อื่นๆ ที่ถูก import static ใน authMiddleware.js เพื่อกัน Error ตอนโหลดไฟล์
// (เรา Inject ของจริงผ่าน factory function อยู่แล้ว แต่ต้อง Mock ตรงนี้เพื่อให้ไฟล์โหลดผ่าน)
const tokenPath = path.resolve(__dirname, '../../src/utils/token.js');
const dbModelsPath = path.resolve(__dirname, '../../src/models/dbModels.js');
const cookieUtilsPath = path.resolve(__dirname, '../../src/utils/cookieUtils.js');

// Mock แบบ Dummy เพราะเราจะ Inject Mock ของจริงใน Test case
await jest.unstable_mockModule(tokenPath, () => ({ verifyAccessToken: jest.fn() }));
await jest.unstable_mockModule(dbModelsPath, () => ({ User: {}, OrganizationMember: {} }));
await jest.unstable_mockModule(cookieUtilsPath, () => ({ getAccessToken: jest.fn() }));

// ✅ 3. Import Module Under Test (Dynamic Import)
const { createAuthMiddleware } = await import(authMiddlewarePath);

describe('AuthMiddleware (100% Coverage ESM)', () => {
  let middleware;
  let mockVerifyToken, mockGetToken, mockUser, mockOrgMember;
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();

    // 4. Setup Local Mocks (Dependencies ที่เราจะ Inject)
    mockVerifyToken = jest.fn();
    mockGetToken = jest.fn();
    mockUser = { findByPk: jest.fn() };
    mockOrgMember = { findOne: jest.fn() };

    // 5. Create Middleware Instance (Dependency Injection)
    middleware = createAuthMiddleware({
      verifyAccessToken: mockVerifyToken,
      getAccessToken: mockGetToken,
      User: mockUser,
      OrganizationMember: mockOrgMember
    });

    // 6. Reset Req/Res/Next
    req = {
      headers: {},
      cookies: {},
      params: {},
      query: {},
      body: {},
      user: null
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    next = jest.fn();
  });

  // ==========================================
  // Test Suite: protect Middleware
  // ==========================================
  describe('protect', () => {
    it('should throw Unauthorized (401) if no token found', async () => {
      mockGetToken.mockReturnValue(null);

      await middleware.protect(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toMatch(/ไม่พบ Token/i);
    });

    it('should throw Unauthorized (401) if token is invalid/expired', async () => {
      mockGetToken.mockReturnValue('invalid-token');
      mockVerifyToken.mockImplementation(() => { throw new Error('Expired'); });

      await middleware.protect(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toMatch(/Token ไม่ถูกต้อง/i);
    });

    it('should throw Unauthorized (401) if token payload is invalid (no user_id)', async () => {
      mockGetToken.mockReturnValue('valid-token');
      mockVerifyToken.mockReturnValue({ role: 'admin' }); // Missing user_id

      await middleware.protect(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toMatch(/Invalid Payload/i);
    });

    it('should throw Unauthorized (401) if user not found in DB', async () => {
      mockGetToken.mockReturnValue('valid-token');
      mockVerifyToken.mockReturnValue({ user_id: 'user-1' });
      mockUser.findByPk.mockResolvedValue(null);

      await middleware.protect(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toMatch(/ไม่พบผู้ใช้งาน/i);
    });

    it('should throw Unauthorized (401) if user is inactive', async () => {
      mockGetToken.mockReturnValue('valid-token');
      mockVerifyToken.mockReturnValue({ user_id: 'user-1' });
      mockUser.findByPk.mockResolvedValue({ user_id: 'user-1', is_active: false });

      await middleware.protect(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toMatch(/ระงับการใช้งาน/i);
    });

    it('should call next() and attach user to req if authentication succeeds', async () => {
      const mockUserData = { 
        user_id: 'user-1', 
        is_active: true, 
        email: 'test@mail.com' 
      };
      mockGetToken.mockReturnValue('valid-token');
      mockVerifyToken.mockReturnValue({ user_id: 'user-1' });
      mockUser.findByPk.mockResolvedValue(mockUserData);

      await middleware.protect(req, res, next);

      expect(req.user).toEqual(mockUserData);
      expect(next).toHaveBeenCalledWith();
    });
  });

  // ==========================================
  // Test Suite: checkOrgRole Middleware
  // ==========================================
  describe('checkOrgRole', () => {
    const setupAuthUser = (orgId = null) => {
      req.user = { user_id: 'user-1', current_org_id: orgId };
    };

    it('should throw BadRequest (400) if orgId is missing', async () => {
      setupAuthUser(null);
      req.params = {}; 
      req.body = {};
      
      const mw = middleware.checkOrgRole(['ADMIN']);
      await mw(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].statusCode).toBe(400);
      expect(next.mock.calls[0][0].message).toBe('orgId required');
    });

    it('should resolve orgId from req.body if not in params', async () => {
      setupAuthUser(null);
      req.params = {};
      req.body = { orgId: 'org-body' };
      mockOrgMember.findOne.mockResolvedValue({ role_id: 'ADMIN' });

      const mw = middleware.checkOrgRole();
      await mw(req, res, next);

      expect(mockOrgMember.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ 
          where: expect.objectContaining({ 
            org_id: 'org-body' 
          }) 
        })
      );
      expect(next).toHaveBeenCalledWith();
    });

    it('should throw Forbidden (403) if user is not a member', async () => {
      setupAuthUser('org-1');
      mockOrgMember.findOne.mockResolvedValue(null);

      const mw = middleware.checkOrgRole(['ADMIN']);
      await mw(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].statusCode).toBe(403);
      expect(next.mock.calls[0][0].message).toMatch(/ไม่ได้เป็นสมาชิก/i);
    });

    it('should throw Forbidden (403) if role is insufficient', async () => {
      setupAuthUser('org-1');
      mockOrgMember.findOne.mockResolvedValue({ role_id: 'MEMBER' });

      const mw = middleware.checkOrgRole(['ADMIN', 'OWNER']); 
      await mw(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].statusCode).toBe(403);
      expect(next.mock.calls[0][0].message).toMatch(/ไม่มีสิทธิ์ดำเนินการ/i);
    });

    it('should succeed if role is allowed', async () => {
      setupAuthUser();
      req.params = { orgId: 'org-1' };
      mockOrgMember.findOne.mockResolvedValue({ role_id: 'ADMIN' });

      const mw = middleware.checkOrgRole(['ADMIN']);
      await mw(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user.current_org_id).toBe('org-1');
      expect(req.user.org_role_id).toBe('ADMIN');
    });

    it('should succeed if no specific roles required', async () => {
      setupAuthUser('org-1');
      mockOrgMember.findOne.mockResolvedValue({ role_id: 'MEMBER' });

      const mw = middleware.checkOrgRole([]); 
      await mw(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  // ==========================================
  // Test Suite: authorize Middleware
  // ==========================================
  describe('authorize', () => {
    it('should return Unauthorized (401) if req.user is missing', () => {
      req.user = null;
      
      const mw = middleware.authorize(['SUPER_ADMIN']);
      mw(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].statusCode).toBe(401);
      expect(next.mock.calls[0][0].message).toMatch(/ไม่พบผู้ใช้งาน/i);
    });

    it('should return Forbidden (403) if user role mismatch', () => {
      req.user = { role_id: 'USER' };
      
      const mw = middleware.authorize(['ADMIN']);
      mw(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].statusCode).toBe(403);
      expect(next.mock.calls[0][0].message).toMatch(/ไม่มีสิทธิ์เข้าถึง/i);
    });

    it('should succeed if user role matches', () => {
      req.user = { role_id: 'ADMIN' };
      
      const mw = middleware.authorize(['ADMIN']);
      mw(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });
});