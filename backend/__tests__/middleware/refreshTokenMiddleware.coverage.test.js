import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createRefreshTokenMiddleware } from '../../src/middleware/refreshTokenMiddleware.js';

describe('RefreshToken Middleware (100% Coverage)', () => {
  let middleware;
  let mockVerify, mockGenAccess, mockGenRefresh;
  let mockTokenModel, mockUser, mockLogger, mockGetToken, mockCookies;
  let req, res, next;
  let consoleSpy;

  beforeEach(() => {
    // 1. Mock Dependencies
    mockVerify = jest.fn();
    mockGenAccess = jest.fn().mockReturnValue('new-access-token');
    mockGenRefresh = jest.fn().mockReturnValue('new-refresh-token');
    
    mockTokenModel = {
      findRefreshToken: jest.fn(),
      rotateToken: jest.fn()
    };
    
    mockUser = { findById: jest.fn() };
    
    // ✅ Fix: Add error method to logger
    mockLogger = { 
      suspiciousActivity: jest.fn(),
      error: jest.fn() 
    };
    
    mockGetToken = jest.fn();
    
    mockCookies = {
      setAuthCookies: jest.fn(),
      setAccessTokenCookie: jest.fn(),
      clearAuthCookies: jest.fn()
    };

    // 2. Inject Mocks
    middleware = createRefreshTokenMiddleware({
      verifyRefreshToken: mockVerify,
      generateAccessToken: mockGenAccess,
      generateRefreshToken: mockGenRefresh,
      RefreshTokenModel: mockTokenModel,
      UserModel: mockUser,
      securityLogger: mockLogger,
      getRefreshToken: mockGetToken,
      cookieUtils: mockCookies,
      env: { ENABLE_TOKEN_ROTATION: 'false' } // Default env
    });

    // 3. Mock Express
    req = {
      headers: {},
      ip: '127.0.0.1',
      clientInfo: { ipAddress: '127.0.0.1', userAgent: 'Jest' }
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
  // 1. refreshAccessToken Tests
  // ==========================================
  describe('refreshAccessToken', () => {
    it('should return 400 if no refresh token', async () => {
      mockGetToken.mockReturnValue(null);
      await middleware.refreshAccessToken(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Refresh token required' }));
    });

    it('should return 401 if token invalid (verify fails)', async () => {
      mockGetToken.mockReturnValue('invalid');
      mockVerify.mockReturnValue(null);

      await middleware.refreshAccessToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith('Invalid refresh token attempt', expect.anything(), expect.anything(), expect.anything());
    });

    it('should return 401 if user not found', async () => {
      mockGetToken.mockReturnValue('valid');
      mockVerify.mockReturnValue({ user_id: 'u1' });
      mockUser.findById.mockResolvedValue(null);

      await middleware.refreshAccessToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith('Refresh token for non-existent user', expect.anything(), expect.anything(), expect.anything());
    });

    it('should return 401 if user is inactive', async () => {
      mockGetToken.mockReturnValue('valid');
      mockVerify.mockReturnValue({ user_id: 'u1' });
      mockUser.findById.mockResolvedValue({ user_id: 'u1', is_active: false });

      await middleware.refreshAccessToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Account is inactive' }));
    });

    it('should return 401 if token revoked (not in DB)', async () => {
      mockGetToken.mockReturnValue('valid');
      mockVerify.mockReturnValue({ user_id: 'u1' });
      mockUser.findById.mockResolvedValue({ user_id: 'u1', is_active: true });
      mockTokenModel.findRefreshToken.mockResolvedValue(null);

      await middleware.refreshAccessToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith('Revoked or non-existent refresh token used', expect.anything(), expect.anything(), expect.anything());
    });

    it('should refresh token successfully (No Rotation)', async () => {
      mockGetToken.mockReturnValue('valid');
      mockVerify.mockReturnValue({ user_id: 'u1' });
      mockUser.findById.mockResolvedValue({ user_id: 'u1', is_active: true });
      mockTokenModel.findRefreshToken.mockResolvedValue({ token: 'valid' });

      await middleware.refreshAccessToken(req, res);

      expect(mockGenAccess).toHaveBeenCalled();
      expect(mockCookies.setAccessTokenCookie).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, accessToken: 'new-access-token' });
    });

    it('should rotate token if enabled', async () => {
      // Re-create middleware with rotation enabled
      middleware = createRefreshTokenMiddleware({
        verifyRefreshToken: mockVerify,
        generateAccessToken: mockGenAccess,
        generateRefreshToken: mockGenRefresh,
        RefreshTokenModel: mockTokenModel,
        UserModel: mockUser,
        securityLogger: mockLogger,
        getRefreshToken: mockGetToken,
        cookieUtils: mockCookies,
        env: { ENABLE_TOKEN_ROTATION: 'true' }
      });

      mockGetToken.mockReturnValue('valid');
      mockVerify.mockReturnValue({ user_id: 'u1' });
      mockUser.findById.mockResolvedValue({ user_id: 'u1', is_active: true });
      mockTokenModel.findRefreshToken.mockResolvedValue({ token: 'valid' });

      await middleware.refreshAccessToken(req, res);

      expect(mockGenRefresh).toHaveBeenCalled();
      expect(mockTokenModel.rotateToken).toHaveBeenCalled();
      expect(mockCookies.setAuthCookies).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ refreshToken: 'new-refresh-token' }));
    });

    it('should handle JsonWebTokenError', async () => {
      mockGetToken.mockReturnValue('bad');
      mockVerify.mockImplementation(() => { 
        const e = new Error('Bad JWT');
        e.name = 'JsonWebTokenError';
        throw e; 
      });

      await middleware.refreshAccessToken(req, res);

      expect(mockCookies.clearAuthCookies).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid token format' }));
    });

    it('should handle TokenExpiredError', async () => {
      mockGetToken.mockReturnValue('expired');
      mockVerify.mockImplementation(() => { 
        const e = new Error('Expired');
        e.name = 'TokenExpiredError';
        throw e; 
      });

      await middleware.refreshAccessToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Refresh token expired' }));
    });

    it('should handle generic errors', async () => {
      mockGetToken.mockImplementation(() => { throw new Error('Boom'); });

      await middleware.refreshAccessToken(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(mockCookies.clearAuthCookies).toHaveBeenCalled();
    });
  });

  // ==========================================
  // 2. validateRefreshToken Tests
  // ==========================================
  describe('validateRefreshToken', () => {
    it('should return 400 if missing token', async () => {
      mockGetToken.mockReturnValue(null);
      await middleware.validateRefreshToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 401 if invalid token', async () => {
      mockGetToken.mockReturnValue('invalid');
      mockVerify.mockReturnValue(null);
      await middleware.validateRefreshToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 if revoked', async () => {
      mockGetToken.mockReturnValue('valid');
      mockVerify.mockReturnValue({ user_id: 'u1' });
      mockTokenModel.findRefreshToken.mockResolvedValue(null);
      
      await middleware.validateRefreshToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Token has been revoked' }));
    });

    it('should return 401 if user inactive', async () => {
      mockGetToken.mockReturnValue('valid');
      mockVerify.mockReturnValue({ user_id: 'u1' });
      mockTokenModel.findRefreshToken.mockResolvedValue({});
      mockUser.findById.mockResolvedValue({ is_active: false });

      await middleware.validateRefreshToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should pass if valid', async () => {
      mockGetToken.mockReturnValue('valid');
      mockVerify.mockReturnValue({ user_id: 'u1' });
      mockTokenModel.findRefreshToken.mockResolvedValue({});
      mockUser.findById.mockResolvedValue({ is_active: true });

      await middleware.validateRefreshToken(req, res, next);
      expect(req.tokenData).toEqual({ userId: 'u1', valid: true });
      expect(next).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockGetToken.mockImplementation(() => { throw new Error('Err'); });
      await middleware.validateRefreshToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});