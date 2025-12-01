/**
 * AuthController Coverage Tests
 * Tests the REAL AuthController using dependency injection
 * This ensures actual code execution for coverage metrics (90%+ branch coverage)
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createAuthController } from '../../src/controllers/AuthController.js';

describe('AuthController (Real Coverage Tests)', () => {
  let controller;
  let mockAuthService;
  let mockSecurityLogger;
  let mockSecurity;
  let mockCookies;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock service
    mockAuthService = {
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

    // Create mock security logger
    mockSecurityLogger = {
      registrationSuccess: jest.fn(),
      registrationFailed: jest.fn(),
      loginSuccess: jest.fn(),
      loginFailed: jest.fn(),
      passwordResetRequest: jest.fn(),
      passwordResetSuccess: jest.fn(),
      logout: jest.fn()
    };

    // Create mock security monitoring
    mockSecurity = {
      recordFailedLogin: jest.fn(),
      clearFailedLogins: jest.fn()
    };

    // Create mock cookie utilities
    mockCookies = {
      setAuthCookies: jest.fn(),
      setAccessTokenCookie: jest.fn(),
      clearAuthCookies: jest.fn(),
      getRefreshToken: jest.fn()
    };

    // Create controller with all mock dependencies
    controller = createAuthController({
      service: mockAuthService,
      logger: mockSecurityLogger,
      security: mockSecurity,
      cookies: mockCookies
    });

    mockReq = {
      user: { user_id: 'user-123' },
      body: {},
      params: {},
      query: {},
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test-agent' },
      clientInfo: { ipAddress: '192.168.1.1', userAgent: 'custom-agent' }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis()
    };
  });

  describe('registerUser', () => {
    it('should register user successfully with clientInfo', async () => {
      const result = { 
        user: { user_id: 'new-user', email: 'test@test.com' },
        accessToken: 'token'
      };
      mockReq.body = { email: 'test@test.com', password: 'password123' };
      mockAuthService.register.mockResolvedValue(result);

      await controller.registerUser(mockReq, mockRes);

      expect(mockAuthService.register).toHaveBeenCalledWith(mockReq.body);
      expect(mockSecurityLogger.registrationSuccess).toHaveBeenCalledWith(
        'new-user', 'test@test.com', '192.168.1.1', 'custom-agent'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'ลงทะเบียนสำเร็จ',
        ...result
      });
    });

    it('should use req.ip and req.headers when clientInfo is empty', async () => {
      const result = { 
        user: { user_id: 'new-user', email: 'test@test.com' }
      };
      mockReq.body = { email: 'test@test.com', password: 'password123' };
      mockReq.clientInfo = {}; // Empty clientInfo
      mockAuthService.register.mockResolvedValue(result);

      await controller.registerUser(mockReq, mockRes);

      expect(mockSecurityLogger.registrationSuccess).toHaveBeenCalledWith(
        'new-user', 'test@test.com', '127.0.0.1', 'test-agent'
      );
    });

    it('should use req.ip and req.headers when clientInfo is undefined', async () => {
      const result = { 
        user: { user_id: 'new-user', email: 'test@test.com' }
      };
      mockReq.body = { email: 'test@test.com', password: 'password123' };
      mockReq.clientInfo = undefined;
      mockAuthService.register.mockResolvedValue(result);

      await controller.registerUser(mockReq, mockRes);

      expect(mockSecurityLogger.registrationSuccess).toHaveBeenCalledWith(
        'new-user', 'test@test.com', '127.0.0.1', 'test-agent'
      );
    });

    it('should return 400 and log failed registration for USER_EXISTS error', async () => {
      mockReq.body = { email: 'test@test.com', password: 'password123' };
      const error = new Error('User already exists');
      error.code = 'USER_EXISTS';
      mockAuthService.register.mockRejectedValue(error);

      await controller.registerUser(mockReq, mockRes);

      expect(mockSecurityLogger.registrationFailed).toHaveBeenCalledWith(
        'test@test.com', '192.168.1.1', 'custom-agent', 'Email already exists'
      );
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for USER_EXISTS with empty clientInfo', async () => {
      mockReq.body = { email: 'test@test.com', password: 'password123' };
      mockReq.clientInfo = {};
      const error = new Error('User already exists');
      error.code = 'USER_EXISTS';
      mockAuthService.register.mockRejectedValue(error);

      await controller.registerUser(mockReq, mockRes);

      expect(mockSecurityLogger.registrationFailed).toHaveBeenCalledWith(
        'test@test.com', '127.0.0.1', 'test-agent', 'Email already exists'
      );
    });

    it('should return 500 for non-USER_EXISTS errors (no registration failed log)', async () => {
      mockReq.body = { email: 'test@test.com', password: 'password123' };
      mockAuthService.register.mockRejectedValue(new Error('Database error'));

      await controller.registerUser(mockReq, mockRes);

      expect(mockSecurityLogger.registrationFailed).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('loginUser', () => {
    it('should login user successfully with clientInfo', async () => {
      const result = {
        user: { user_id: 'user-123', email: 'test@test.com' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      };
      mockReq.body = { email: 'test@test.com', password: 'password123' };
      mockAuthService.login.mockResolvedValue(result);

      await controller.loginUser(mockReq, mockRes);

      expect(mockAuthService.login).toHaveBeenCalledWith('test@test.com', 'password123');
      expect(mockSecurityLogger.loginSuccess).toHaveBeenCalledWith(
        'user-123', 'test@test.com', '192.168.1.1', 'custom-agent'
      );
      expect(mockSecurity.clearFailedLogins).toHaveBeenCalledWith('192.168.1.1');
      expect(mockCookies.setAuthCookies).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'เข้าสู่ระบบสำเร็จ',
        ...result
      });
    });

    it('should login user successfully with empty clientInfo (fallback to req.ip)', async () => {
      const result = {
        user: { user_id: 'user-123', email: 'test@test.com' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      };
      mockReq.body = { email: 'test@test.com', password: 'password123' };
      mockReq.clientInfo = {};
      mockAuthService.login.mockResolvedValue(result);

      await controller.loginUser(mockReq, mockRes);

      expect(mockSecurityLogger.loginSuccess).toHaveBeenCalledWith(
        'user-123', 'test@test.com', '127.0.0.1', 'test-agent'
      );
      expect(mockSecurity.clearFailedLogins).toHaveBeenCalledWith('127.0.0.1');
    });

    it('should return 401 for invalid credentials with clientInfo', async () => {
      mockReq.body = { email: 'test@test.com', password: 'wrong' };
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      await controller.loginUser(mockReq, mockRes);

      expect(mockSecurityLogger.loginFailed).toHaveBeenCalledWith(
        'test@test.com', '192.168.1.1', 'custom-agent', 'Invalid login'
      );
      expect(mockSecurity.recordFailedLogin).toHaveBeenCalledWith('192.168.1.1');
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 for invalid credentials with empty clientInfo', async () => {
      mockReq.body = { email: 'test@test.com', password: 'wrong' };
      mockReq.clientInfo = {};
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      await controller.loginUser(mockReq, mockRes);

      expect(mockSecurityLogger.loginFailed).toHaveBeenCalledWith(
        'test@test.com', '127.0.0.1', 'test-agent', 'Invalid login'
      );
      expect(mockSecurity.recordFailedLogin).toHaveBeenCalledWith('127.0.0.1');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully (no new refresh token)', async () => {
      const result = { accessToken: 'new-token' };
      mockCookies.getRefreshToken.mockReturnValue('old-refresh-token');
      mockAuthService.refreshToken.mockResolvedValue(result);

      await controller.refreshToken(mockReq, mockRes);

      expect(mockCookies.setAccessTokenCookie).toHaveBeenCalledWith(mockRes, 'new-token');
      expect(mockCookies.setAuthCookies).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        ...result
      });
    });

    it('should set new cookies when new refresh token is returned', async () => {
      const result = { accessToken: 'new-access', refreshToken: 'new-refresh' };
      mockCookies.getRefreshToken.mockReturnValue('old-refresh-token');
      mockAuthService.refreshToken.mockResolvedValue(result);

      await controller.refreshToken(mockReq, mockRes);

      expect(mockCookies.setAuthCookies).toHaveBeenCalledWith(mockRes, 'new-access', 'new-refresh');
    });

    it('should return 401 when no refresh token provided', async () => {
      mockCookies.getRefreshToken.mockReturnValue(null);

      await controller.refreshToken(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'ไม่พบ Refresh Token'
      });
    });

    it('should return 401 when getRefreshToken returns undefined', async () => {
      mockCookies.getRefreshToken.mockReturnValue(undefined);

      await controller.refreshToken(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 when getRefreshToken returns empty string', async () => {
      mockCookies.getRefreshToken.mockReturnValue('');

      await controller.refreshToken(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should clear cookies on error', async () => {
      mockCookies.getRefreshToken.mockReturnValue('invalid-token');
      mockAuthService.refreshToken.mockRejectedValue(new Error('Invalid token'));

      await controller.refreshToken(mockReq, mockRes);

      expect(mockCookies.clearAuthCookies).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('getProfile', () => {
    it('should get profile successfully', async () => {
      const user = { user_id: 'user-123', email: 'test@test.com' };
      mockAuthService.getProfile.mockResolvedValue(user);

      await controller.getProfile(mockReq, mockRes);

      expect(mockAuthService.getProfile).toHaveBeenCalledWith('user-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        user
      });
    });

    it('should return 404 for not found (ไม่พบ)', async () => {
      mockAuthService.getProfile.mockRejectedValue(new Error('ไม่พบผู้ใช้'));

      await controller.getProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 for other errors', async () => {
      mockAuthService.getProfile.mockRejectedValue(new Error('Database error'));

      await controller.getProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('forgotPassword', () => {
    it('should process forgot password request with clientInfo', async () => {
      mockReq.body = { email: 'test@test.com' };
      mockAuthService.forgotPassword.mockResolvedValue();

      await controller.forgotPassword(mockReq, mockRes);

      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith('test@test.com');
      expect(mockSecurityLogger.passwordResetRequest).toHaveBeenCalledWith(
        'test@test.com', '192.168.1.1', 'custom-agent', true
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'ถ้ามีอีเมลนี้ในระบบ จะส่งลิงก์รีเซ็ตรหัสผ่านให้'
      });
    });

    it('should process forgot password with empty clientInfo', async () => {
      mockReq.body = { email: 'test@test.com' };
      mockReq.clientInfo = {};
      mockAuthService.forgotPassword.mockResolvedValue();

      await controller.forgotPassword(mockReq, mockRes);

      expect(mockSecurityLogger.passwordResetRequest).toHaveBeenCalledWith(
        'test@test.com', '127.0.0.1', 'test-agent', true
      );
    });

    it('should return 500 for errors', async () => {
      mockReq.body = { email: 'test@test.com' };
      mockAuthService.forgotPassword.mockRejectedValue(new Error('Email error'));

      await controller.forgotPassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('verifyResetToken', () => {
    it('should verify reset token successfully', async () => {
      const result = { valid: true, email: 'test@test.com' };
      mockReq.query = { token: 'valid-token' };
      mockAuthService.verifyResetToken.mockResolvedValue(result);

      await controller.verifyResetToken(mockReq, mockRes);

      expect(mockAuthService.verifyResetToken).toHaveBeenCalledWith('valid-token');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        ...result
      });
    });

    it('should return 400 for invalid token', async () => {
      mockReq.query = { token: 'invalid-token' };
      mockAuthService.verifyResetToken.mockRejectedValue(new Error('Invalid token'));

      await controller.verifyResetToken(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        valid: false,
        error: 'Invalid token'
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully with clientInfo', async () => {
      mockReq.body = { token: 'valid-token', password: 'newpassword123' };
      mockAuthService.resetPassword.mockResolvedValue();

      await controller.resetPassword(mockReq, mockRes);

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith('valid-token', 'newpassword123');
      expect(mockSecurityLogger.passwordResetSuccess).toHaveBeenCalledWith(
        null, null, '192.168.1.1', 'custom-agent'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'เปลี่ยนรหัสผ่านสำเร็จ'
      });
    });

    it('should reset password with empty clientInfo', async () => {
      mockReq.body = { token: 'valid-token', password: 'newpassword123' };
      mockReq.clientInfo = {};
      mockAuthService.resetPassword.mockResolvedValue();

      await controller.resetPassword(mockReq, mockRes);

      expect(mockSecurityLogger.passwordResetSuccess).toHaveBeenCalledWith(
        null, null, '127.0.0.1', 'test-agent'
      );
    });

    it('should return 400 for invalid token', async () => {
      mockReq.body = { token: 'invalid-token', password: 'newpassword123' };
      mockAuthService.resetPassword.mockRejectedValue(new Error('Invalid token'));

      await controller.resetPassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('changeEmail', () => {
    it('should change email successfully', async () => {
      const result = { email: 'new@test.com' };
      mockReq.body = { newEmail: 'new@test.com', password: 'password123' };
      mockAuthService.changeEmail.mockResolvedValue(result);

      await controller.changeEmail(mockReq, mockRes);

      expect(mockAuthService.changeEmail).toHaveBeenCalledWith('user-123', 'new@test.com', 'password123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'เปลี่ยนอีเมลสำเร็จ',
        user: result
      });
    });

    it('should return 409 for email already in use (ถูกใช้งานแล้ว)', async () => {
      mockReq.body = { newEmail: 'new@test.com', password: 'password123' };
      mockAuthService.changeEmail.mockRejectedValue(new Error('อีเมลนี้ถูกใช้งานแล้ว'));

      await controller.changeEmail(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
    });

    it('should return 401 for wrong password (ไม่ถูกต้อง)', async () => {
      mockReq.body = { newEmail: 'new@test.com', password: 'wrong' };
      mockAuthService.changeEmail.mockRejectedValue(new Error('รหัสผ่านไม่ถูกต้อง'));

      await controller.changeEmail(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 404 for user not found (ไม่พบ)', async () => {
      mockReq.body = { newEmail: 'new@test.com', password: 'password123' };
      mockAuthService.changeEmail.mockRejectedValue(new Error('ไม่พบผู้ใช้'));

      await controller.changeEmail(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 for other errors', async () => {
      mockReq.body = { newEmail: 'new@test.com', password: 'password123' };
      mockAuthService.changeEmail.mockRejectedValue(new Error('Database error'));

      await controller.changeEmail(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockReq.body = { oldPassword: 'old123', newPassword: 'new123' };
      mockAuthService.changePassword.mockResolvedValue();

      await controller.changePassword(mockReq, mockRes);

      expect(mockAuthService.changePassword).toHaveBeenCalledWith('user-123', 'old123', 'new123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'เปลี่ยนรหัสผ่านสำเร็จ คุณต้องเข้าสู่ระบบใหม่'
      });
    });

    it('should return 401 for wrong password (ไม่ถูกต้อง)', async () => {
      mockReq.body = { oldPassword: 'wrong', newPassword: 'new123' };
      mockAuthService.changePassword.mockRejectedValue(new Error('รหัสผ่านไม่ถูกต้อง'));

      await controller.changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 404 for user not found (ไม่พบ)', async () => {
      mockReq.body = { oldPassword: 'old123', newPassword: 'new123' };
      mockAuthService.changePassword.mockRejectedValue(new Error('ไม่พบผู้ใช้'));

      await controller.changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 for other errors', async () => {
      mockReq.body = { oldPassword: 'old123', newPassword: 'new123' };
      mockAuthService.changePassword.mockRejectedValue(new Error('Database error'));

      await controller.changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updatedUser = { user_id: 'user-123', name: 'New Name' };
      mockReq.body = { name: 'New Name' };
      mockAuthService.updateProfile.mockResolvedValue(updatedUser);

      await controller.updateProfile(mockReq, mockRes);

      expect(mockAuthService.updateProfile).toHaveBeenCalledWith('user-123', { name: 'New Name' });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'บันทึกข้อมูลสำเร็จ',
        user: updatedUser
      });
    });

    it('should return 400 for SequelizeValidationError with single error', async () => {
      mockReq.body = { name: '' };
      const error = new Error('Validation error');
      error.name = 'SequelizeValidationError';
      error.errors = [{ message: 'Name is required' }];
      mockAuthService.updateProfile.mockRejectedValue(error);

      await controller.updateProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Name is required'
      });
    });

    it('should return 400 for SequelizeValidationError with multiple errors', async () => {
      mockReq.body = { name: '', email: '' };
      const error = new Error('Validation error');
      error.name = 'SequelizeValidationError';
      error.errors = [
        { message: 'Name is required' },
        { message: 'Email is required' }
      ];
      mockAuthService.updateProfile.mockRejectedValue(error);

      await controller.updateProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Name is required, Email is required'
      });
    });

    it('should return 400 for other errors (non-SequelizeValidationError)', async () => {
      mockReq.body = { name: 'New Name' };
      mockAuthService.updateProfile.mockRejectedValue(new Error('Update error'));

      await controller.updateProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('logoutUser', () => {
    it('should logout user successfully with refresh token and user', async () => {
      mockCookies.getRefreshToken.mockReturnValue('refresh-token');
      mockAuthService.logout.mockResolvedValue();

      await controller.logoutUser(mockReq, mockRes);

      expect(mockAuthService.logout).toHaveBeenCalledWith('refresh-token');
      expect(mockSecurityLogger.logout).toHaveBeenCalledWith(
        'user-123', '192.168.1.1', 'custom-agent'
      );
      expect(mockCookies.clearAuthCookies).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'ออกจากระบบสำเร็จ'
      });
    });

    it('should logout with empty clientInfo', async () => {
      mockCookies.getRefreshToken.mockReturnValue('refresh-token');
      mockReq.clientInfo = {};
      mockAuthService.logout.mockResolvedValue();

      await controller.logoutUser(mockReq, mockRes);

      expect(mockSecurityLogger.logout).toHaveBeenCalledWith(
        'user-123', '127.0.0.1', 'test-agent'
      );
    });

    it('should logout successfully without refresh token', async () => {
      mockCookies.getRefreshToken.mockReturnValue(null);

      await controller.logoutUser(mockReq, mockRes);

      expect(mockAuthService.logout).not.toHaveBeenCalled();
      expect(mockCookies.clearAuthCookies).toHaveBeenCalled();
    });

    it('should logout without logging when req.user is undefined', async () => {
      mockReq.user = undefined;
      mockCookies.getRefreshToken.mockReturnValue(null);

      await controller.logoutUser(mockReq, mockRes);

      expect(mockSecurityLogger.logout).not.toHaveBeenCalled();
    });

    it('should logout without logging when req.user is null', async () => {
      mockReq.user = null;
      mockCookies.getRefreshToken.mockReturnValue('refresh-token');
      mockAuthService.logout.mockResolvedValue();

      await controller.logoutUser(mockReq, mockRes);

      expect(mockSecurityLogger.logout).not.toHaveBeenCalled();
    });

    it('should clear cookies even on error', async () => {
      mockCookies.getRefreshToken.mockReturnValue('refresh-token');
      mockAuthService.logout.mockRejectedValue(new Error('Logout error'));

      await controller.logoutUser(mockReq, mockRes);

      expect(mockCookies.clearAuthCookies).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('logoutAllUser', () => {
    it('should logout all sessions successfully', async () => {
      mockAuthService.logoutAll.mockResolvedValue();

      await controller.logoutAllUser(mockReq, mockRes);

      expect(mockAuthService.logoutAll).toHaveBeenCalledWith('user-123');
      expect(mockCookies.clearAuthCookies).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'ออกจากระบบทุกอุปกรณ์สำเร็จ'
      });
    });

    it('should clear cookies even on error', async () => {
      mockAuthService.logoutAll.mockRejectedValue(new Error('Logout error'));

      await controller.logoutAllUser(mockReq, mockRes);

      expect(mockCookies.clearAuthCookies).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('googleAuthCallback', () => {
    it('should handle google auth callback successfully', async () => {
      const result = { accessToken: 'access-token', refreshToken: 'refresh-token' };
      mockReq.user = { id: 'google-user', email: 'google@test.com' };
      mockAuthService.googleAuthCallback.mockResolvedValue(result);

      await controller.googleAuthCallback(mockReq, mockRes);

      expect(mockAuthService.googleAuthCallback).toHaveBeenCalledWith(mockReq.user);
      expect(mockCookies.setAuthCookies).toHaveBeenCalledWith(mockRes, 'access-token', 'refresh-token');
      expect(mockRes.redirect).toHaveBeenCalledWith('http://localhost:5173/auth/callback?oauth=success');
    });

    it('should redirect to error page on failure', async () => {
      mockReq.user = { id: 'google-user' };
      mockAuthService.googleAuthCallback.mockRejectedValue(new Error('Google auth error'));

      await controller.googleAuthCallback(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith('http://localhost:5173/login?error=google_auth_failed');
    });
  });
});
