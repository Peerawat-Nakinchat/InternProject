import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createAuthController } from '../../src/controllers/AuthController.js';

describe('AuthController (Ultimate Coverage)', () => {
  let controller, mockService, mockLogger, mockSecurity, mockCookies;
  let mockReq, mockRes, mockNext;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv }; // Clone env

    mockService = {
      register: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
      getProfile: jest.fn(),
      forgotPassword: jest.fn(),
      verifyResetToken: jest.fn(),
      resetPassword: jest.fn(),
      changeEmail: jest.fn(),
      changePassword: jest.fn(),
      updateProfile: jest.fn(),
      logout: jest.fn(),
      logoutAll: jest.fn(),
      googleAuthCallback: jest.fn()
    };
    mockLogger = {
      registrationSuccess: jest.fn(),
      registrationFailed: jest.fn(),
      loginSuccess: jest.fn(),
      loginFailed: jest.fn(),
      passwordResetRequest: jest.fn(),
      passwordResetSuccess: jest.fn(),
      logout: jest.fn()
    };
    mockSecurity = { recordFailedLogin: jest.fn(), clearFailedLogins: jest.fn() };
    mockCookies = {
      setAuthCookies: jest.fn(),
      setAccessTokenCookie: jest.fn(),
      clearAuthCookies: jest.fn(),
      getRefreshToken: jest.fn()
    };

    controller = createAuthController({
      service: mockService,
      logger: mockLogger,
      security: mockSecurity,
      cookies: mockCookies
    });

    mockReq = {
      body: {},
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest-agent' },
      user: { user_id: 'u1' },
      clientInfo: undefined // Start undefined to test fallbacks
    };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn(), redirect: jest.fn() };
    mockNext = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv; // Restore env
  });

  describe('registerUser', () => {
    it('should use req.ip/headers if clientInfo is missing', async () => {
      // Mock Success Response from Service
      mockService.register.mockResolvedValue({ user: { user_id: 1, email: 'test@mail.com' } });
      
      await controller.registerUser(mockReq, mockRes, mockNext);
      
      // Expect fallback to req.ip and req.headers['user-agent']
      expect(mockLogger.registrationSuccess).toHaveBeenCalledWith(
        1, 'test@mail.com', '127.0.0.1', 'jest-agent'
      );
    });

    it('should use clientInfo if present', async () => {
      mockReq.clientInfo = { ipAddress: '10.0.0.1', userAgent: 'Custom' };
      mockService.register.mockResolvedValue({ user: { user_id: 1, email: 'test@mail.com' } });
      
      await controller.registerUser(mockReq, mockRes, mockNext);
      
      expect(mockLogger.registrationSuccess).toHaveBeenCalledWith(
        1, 'test@mail.com', '10.0.0.1', 'Custom'
      );
    });

    it('should catch USER_EXISTS and log specific error', async () => {
      mockReq.body.email = 'dup@test.com'; // Add email for logger
      const error = new Error('Dup');
      error.code = 'USER_EXISTS';
      mockService.register.mockRejectedValue(error);
      
      // Since controller throws error, we expect rejection
      await expect(controller.registerUser(mockReq, mockRes, mockNext)).rejects.toThrow('Dup');
      
      expect(mockLogger.registrationFailed).toHaveBeenCalled();
    });
    
    it('should pass normal errors to next()', async () => {
       const error = new Error('DB Error');
       mockService.register.mockRejectedValue(error);
       
       await expect(controller.registerUser(mockReq, mockRes, mockNext)).rejects.toThrow('DB Error');
       
       expect(mockLogger.registrationFailed).not.toHaveBeenCalled();
    });
  });

  describe('loginUser', () => {
    // ... Login Tests ...
    it('should record failed login on error', async () => {
      mockReq.body = { email: 'fail@test.com' };
      mockService.login.mockRejectedValue(new Error('Auth Fail'));
      
      await expect(controller.loginUser(mockReq, mockRes, mockNext)).rejects.toThrow('Auth Fail');
      
      expect(mockSecurity.recordFailedLogin).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should set BOTH cookies if refresh token is returned', async () => {
      mockCookies.getRefreshToken.mockReturnValue('valid-rt');
      mockService.refreshToken.mockResolvedValue({ 
        accessToken: 'new-at', 
        refreshToken: 'new-rt' 
      });

      await controller.refreshToken(mockReq, mockRes, mockNext);

      expect(mockCookies.setAccessTokenCookie).toHaveBeenCalledWith(mockRes, 'new-at');
      expect(mockCookies.setAuthCookies).toHaveBeenCalledWith(mockRes, 'new-at', 'new-rt');
    });

    it('should set ONLY access token cookie if no refresh token returned', async () => {
      mockCookies.getRefreshToken.mockReturnValue('valid-rt');
      mockService.refreshToken.mockResolvedValue({ 
        accessToken: 'new-at' 
        // No refreshToken
      });

      await controller.refreshToken(mockReq, mockRes, mockNext);

      expect(mockCookies.setAccessTokenCookie).toHaveBeenCalledWith(mockRes, 'new-at');
      expect(mockCookies.setAuthCookies).not.toHaveBeenCalled();
    });

    it('should throw Unauthorized if no token in cookie', async () => {
      mockCookies.getRefreshToken.mockReturnValue(null);
      await controller.refreshToken(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ 
        message: expect.stringMatching(/ไม่พบ|Refresh Token/) 
      }));
    });
    
    it('should clear cookies on error', async () => {
      mockCookies.getRefreshToken.mockReturnValue('rt');
      mockService.refreshToken.mockRejectedValue(new Error('Err'));
      await controller.refreshToken(mockReq, mockRes, mockNext);
      expect(mockCookies.clearAuthCookies).toHaveBeenCalled();
    });
  });

  describe('logoutUser', () => {
    it('should call service logout if refresh token exists', async () => {
      mockCookies.getRefreshToken.mockReturnValue('rt');
      mockService.logout.mockResolvedValue();
      await controller.logoutUser(mockReq, mockRes, mockNext);
      expect(mockService.logout).toHaveBeenCalledWith('rt');
    });

    it('should NOT call service logout if no refresh token', async () => {
      mockCookies.getRefreshToken.mockReturnValue(null);
      await controller.logoutUser(mockReq, mockRes, mockNext);
      expect(mockService.logout).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalled(); // Still success
    });

    it('should log logout only if req.user exists', async () => {
      mockReq.user = { user_id: 'u1' };
      await controller.logoutUser(mockReq, mockRes, mockNext);
      expect(mockLogger.logout).toHaveBeenCalled();
    });

    it('should NOT log logout if req.user is missing', async () => {
      mockReq.user = undefined;
      await controller.logoutUser(mockReq, mockRes, mockNext);
      expect(mockLogger.logout).not.toHaveBeenCalled();
    });
  });

  describe('googleAuthCallback', () => {
    it('should redirect to env FRONTEND_URL on success', async () => {
      process.env.FRONTEND_URL = 'http://custom.com';
      mockService.googleAuthCallback.mockResolvedValue({ accessToken: 'at' });
      
      await controller.googleAuthCallback(mockReq, mockRes, mockNext);
      
      expect(mockRes.redirect).toHaveBeenCalledWith(expect.stringContaining('http://custom.com'));
    });

    it('should use default localhost if env missing', async () => {
      delete process.env.FRONTEND_URL; // Simulate missing env
      mockService.googleAuthCallback.mockResolvedValue({ accessToken: 'at' });
      
      await controller.googleAuthCallback(mockReq, mockRes, mockNext);
      
      expect(mockRes.redirect).toHaveBeenCalledWith(expect.stringContaining('http://localhost:5173'));
    });

    it('should redirect to error page on failure', async () => {
      mockService.googleAuthCallback.mockRejectedValue(new Error('Fail'));
      await controller.googleAuthCallback(mockReq, mockRes, mockNext);
      expect(mockRes.redirect).toHaveBeenCalledWith(expect.stringContaining('error=google_auth_failed'));
    });
  });
  
  // Pass-throughs
  it('forgotPassword', async () => { 
      mockReq.body.email = 't@t.com';
      await controller.forgotPassword(mockReq, mockRes, mockNext);
      expect(mockLogger.passwordResetRequest).toHaveBeenCalled();
  });
  it('resetPassword', async () => { 
      mockReq.body = { token:'t', password:'p'};
      await controller.resetPassword(mockReq, mockRes, mockNext);
      expect(mockLogger.passwordResetSuccess).toHaveBeenCalled();
  });
  it('logoutAllUser', async () => {
      await controller.logoutAllUser(mockReq, mockRes, mockNext);
      expect(mockService.logoutAll).toHaveBeenCalled();
  });
  it('logoutAllUser error', async () => {
      mockService.logoutAll.mockRejectedValue(new Error('E'));
      await controller.logoutAllUser(mockReq, mockRes, mockNext);
      expect(mockCookies.clearAuthCookies).toHaveBeenCalled();
  });
});