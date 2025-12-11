/**
 * AuthController Coverage Tests
 * Targets 100% Code Coverage (Branches, Statements, Functions, Lines)
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

// 1. Setup Absolute Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authControllerPath = path.resolve(__dirname, '../../src/controllers/AuthController.js');
const authServicePath = path.resolve(__dirname, '../../src/services/AuthService.js');
const mfaServicePath = path.resolve(__dirname, '../../src/services/MfaService.js');
const trustedDeviceModelPath = path.resolve(__dirname, '../../src/models/TrustedDeviceModel.js');
const deviceFingerprintPath = path.resolve(__dirname, '../../src/utils/deviceFingerprint.js');
const loggerPath = path.resolve(__dirname, '../../src/utils/logger.js');
const securityMonitoringPath = path.resolve(__dirname, '../../src/middleware/securityMonitoring.js');
const cookieUtilsPath = path.resolve(__dirname, '../../src/utils/cookieUtils.js');
const tokenUtilsPath = path.resolve(__dirname, '../../src/utils/token.js');
const errorHandlerPath = path.resolve(__dirname, '../../src/middleware/errorHandler.js');

// 2. Mock Modules

const mockLoggerFunctions = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  registrationSuccess: jest.fn(),
  loginSuccess: jest.fn(),
  loginFailed: jest.fn(),
  logout: jest.fn(),
  passwordResetRequest: jest.fn(),
  passwordResetSuccess: jest.fn(),
};

await jest.unstable_mockModule(loggerPath, () => ({
  default: mockLoggerFunctions,
  securityLogger: mockLoggerFunctions 
}));

await jest.unstable_mockModule(errorHandlerPath, () => ({
  asyncHandler: (fn) => fn, 
  createError: {
    unauthorized: jest.fn((msg) => new Error(msg)),
  }
}));

// Mock Services
await jest.unstable_mockModule(authServicePath, () => ({
  default: {
    register: jest.fn(),
    login: jest.fn(),
    generateTokens: jest.fn(),
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
    googleAuthCallback: jest.fn(),
  }
}));

await jest.unstable_mockModule(mfaServicePath, () => ({
  default: {
    verifyLoginMfa: jest.fn(),
    generateMfaSecret: jest.fn(),
    verifyAndEnableMfa: jest.fn(),
    disableMfa: jest.fn(),
    getMfaStatus: jest.fn(),
  }
}));

await jest.unstable_mockModule(trustedDeviceModelPath, () => ({
  default: {
    findByFingerprint: jest.fn(),
    updateLastUsed: jest.fn(),
    create: jest.fn(),
    findByUser: jest.fn(),
    deleteById: jest.fn(),
    deleteByUser: jest.fn(),
  }
}));

await jest.unstable_mockModule(deviceFingerprintPath, () => ({
  generateDeviceFingerprint: jest.fn(),
  parseUserAgent: jest.fn(),
}));

await jest.unstable_mockModule(securityMonitoringPath, () => ({
  recordFailedLogin: jest.fn(),
  clearFailedLogins: jest.fn(),
}));

await jest.unstable_mockModule(cookieUtilsPath, () => ({
  setAuthCookies: jest.fn(),
  setAccessTokenCookie: jest.fn(),
  clearAuthCookies: jest.fn(),
  getRefreshToken: jest.fn(),
}));

await jest.unstable_mockModule(tokenUtilsPath, () => ({
  signAccessToken: jest.fn(),
  verifyAccessToken: jest.fn(),
}));

// 3. Import Controller & Mocks
const { createAuthController, default: defaultController } = await import(authControllerPath);
const AuthService = (await import(authServicePath)).default;
const MfaService = (await import(mfaServicePath)).default;
const TrustedDeviceModel = (await import(trustedDeviceModelPath)).default;
const CookieUtils = (await import(cookieUtilsPath));
const TokenUtils = (await import(tokenUtilsPath));
const DeviceFingerprint = (await import(deviceFingerprintPath));
const SecurityMonitoring = (await import(securityMonitoringPath));
const LoggerMock = (await import(loggerPath)).default; 

describe('AuthController (100% Coverage)', () => {
  let controller;
  let req, res;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv }; // Reset env
    controller = createAuthController();

    req = {
      body: {},
      query: {},
      params: {},
      headers: { 'user-agent': 'Jest-User-Agent' }, // Default header
      ip: '127.0.0.1',
      clientInfo: { ipAddress: '127.0.0.1', userAgent: 'Jest-Agent' },
      user: { user_id: 'user-123', email: 'test@example.com' }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      redirect: jest.fn(),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Initialization', () => {
    it('should use default dependencies', () => {
      expect(defaultController).toBeDefined();
      expect(controller).toBeDefined();
    });
    
    it('should accept injected dependencies', () => {
        const customService = { register: jest.fn() };
        const customCtrl = createAuthController({ service: customService });
        expect(customCtrl).toBeDefined();
    });

    // 🎯 Branch Coverage: Partial Injection
    it('should handle partial dependency injection', () => {
      const customLogger = { info: jest.fn() };
      // Inject only logger, service should fallback to default
      const partialCtrl = createAuthController({ logger: customLogger });
      expect(partialCtrl).toBeDefined();
    });
  });

  describe('registerUser', () => {
    it('should register successfully', async () => {
      AuthService.register.mockResolvedValue({ user: { user_id: '1', email: 'test' } });
      await controller.registerUser(req, res);
      expect(LoggerMock.registrationSuccess).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    // 🎯 Branch Coverage: clientInfo missing -> fallback to req.headers
    it('should use fallback headers when clientInfo is missing', async () => {
      req.clientInfo = undefined;
      AuthService.register.mockResolvedValue({ user: { user_id: '1', email: 'test' } });
      await controller.registerUser(req, res);
      expect(LoggerMock.registrationSuccess).toHaveBeenCalledWith('1', 'test', '127.0.0.1', 'Jest-User-Agent');
    });

    // 🎯 Branch Coverage: clientInfo exists but is empty
    it('should use fallback headers when clientInfo properties are missing', async () => {
      req.clientInfo = {}; // Exists but empty
      req.ip = '9.9.9.9';
      req.headers['user-agent'] = 'Fallback-Agent';
      
      AuthService.register.mockResolvedValue({ user: { user_id: '1', email: 'test' } });
      await controller.registerUser(req, res);
      expect(LoggerMock.registrationSuccess).toHaveBeenCalledWith('1', 'test', '9.9.9.9', 'Fallback-Agent');
    });
  });

  describe('loginUser', () => {
    beforeEach(() => {
      req.body = { email: 'test@test.com', password: 'pass' };
      DeviceFingerprint.generateDeviceFingerprint.mockReturnValue('fp');
    });

    it('should login without MFA', async () => {
      AuthService.login.mockResolvedValue({
        user: { user_id: '1', email: 't', mfa_enabled: false },
        mfaRequired: false,
        accessToken: 'at',
        refreshToken: 'rt'
      });
      await controller.loginUser(req, res);
      expect(LoggerMock.loginSuccess).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    // 🎯 Branch Coverage: clientInfo missing -> fallback logic inside success
    it('should use fallback headers on login success when clientInfo is missing', async () => {
      req.clientInfo = undefined;
      AuthService.login.mockResolvedValue({
        user: { user_id: '1', email: 't', mfa_enabled: false },
        accessToken: 'at'
      });
      await controller.loginUser(req, res);
      expect(LoggerMock.loginSuccess).toHaveBeenCalledWith('1', 't', '127.0.0.1', 'Jest-User-Agent');
    });

    // 🎯 Branch Coverage: clientInfo missing -> fallback logic inside CATCH block
    it('should use fallback headers on login failure when clientInfo is missing', async () => {
      req.clientInfo = undefined;
      AuthService.login.mockRejectedValue(new Error('Fail'));
      await expect(controller.loginUser(req, res)).rejects.toThrow('Fail');
      expect(LoggerMock.loginFailed).toHaveBeenCalledWith(expect.anything(), '127.0.0.1', 'Jest-User-Agent', expect.anything());
    });

    it('should skip MFA if trusted device', async () => {
      AuthService.login.mockResolvedValue({
        user: { user_id: '1', mfa_enabled: true },
        mfaRequired: true
      });
      TrustedDeviceModel.findByFingerprint.mockResolvedValue({ device_id: 'd1' });
      AuthService.generateTokens.mockResolvedValue({ accessToken: 'at' });

      await controller.loginUser(req, res);
      expect(TrustedDeviceModel.updateLastUsed).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should require MFA if new device', async () => {
      AuthService.login.mockResolvedValue({
        user: { user_id: '1', mfa_enabled: true },
        mfaRequired: true,
        tempToken: 'temp'
      });
      TrustedDeviceModel.findByFingerprint.mockResolvedValue(null);

      await controller.loginUser(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ mfaRequired: true, isNewDevice: true }));
    });

    it('should handle login error', async () => {
      AuthService.login.mockRejectedValue(new Error('Fail'));
      await expect(controller.loginUser(req, res)).rejects.toThrow('Fail');
      expect(LoggerMock.loginFailed).toHaveBeenCalled();
    });
  });

  describe('verifyMfaLogin', () => {
    beforeEach(() => {
        req.body = { otp: '123' };
        req.headers.authorization = 'Bearer temp-token';
    });

    it('should error if no auth header', async () => {
        req.headers.authorization = undefined;
        await controller.verifyMfaLogin(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    // 🎯 Branch Coverage: Invalid Header Format
    it('should error if invalid auth header format', async () => {
        req.headers.authorization = 'Basic token';
        await controller.verifyMfaLogin(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should error if invalid token', async () => {
        TokenUtils.verifyAccessToken.mockReturnValue(null);
        await controller.verifyMfaLogin(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should error if user not found', async () => {
        TokenUtils.verifyAccessToken.mockReturnValue({ user_id: '1' });
        AuthService.getProfile.mockResolvedValue(null);
        await controller.verifyMfaLogin(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should error if OTP invalid', async () => {
        TokenUtils.verifyAccessToken.mockReturnValue({ user_id: '1' });
        AuthService.getProfile.mockResolvedValue({ id: '1' });
        MfaService.verifyLoginMfa.mockReturnValue(false);
        await controller.verifyMfaLogin(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should success and save trusted device', async () => {
        TokenUtils.verifyAccessToken.mockReturnValue({ user_id: '1', fingerprint: 'fp' });
        AuthService.getProfile.mockResolvedValue({ user_id: '1', email: 't' });
        MfaService.verifyLoginMfa.mockReturnValue(true);
        AuthService.generateTokens.mockResolvedValue({});
        
        await controller.verifyMfaLogin(req, res);
        expect(TrustedDeviceModel.create).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    // 🎯 Branch Coverage: No Fingerprint in Token
    it('should success but NOT save trusted device if no fingerprint', async () => {
        TokenUtils.verifyAccessToken.mockReturnValue({ user_id: '1' }); // no fingerprint
        AuthService.getProfile.mockResolvedValue({ user_id: '1', email: 't' });
        MfaService.verifyLoginMfa.mockReturnValue(true);
        AuthService.generateTokens.mockResolvedValue({});
        
        await controller.verifyMfaLogin(req, res);
        expect(TrustedDeviceModel.create).not.toHaveBeenCalled();
        expect(LoggerMock.warn).toHaveBeenCalled();
    });

    // 🎯 Branch Coverage: DB Error during save
    it('should ignore DB error during device save', async () => {
        TokenUtils.verifyAccessToken.mockReturnValue({ user_id: '1', fingerprint: 'fp' });
        AuthService.getProfile.mockResolvedValue({ user_id: '1', email: 't' });
        MfaService.verifyLoginMfa.mockReturnValue(true);
        AuthService.generateTokens.mockResolvedValue({});
        TrustedDeviceModel.create.mockRejectedValue(new Error('DB Fail'));
        
        await controller.verifyMfaLogin(req, res);
        expect(LoggerMock.error).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('refreshToken', () => {
    it('should error if no cookie', async () => {
        CookieUtils.getRefreshToken.mockReturnValue(null);
        await controller.refreshToken(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should refresh tokens (both new)', async () => {
        CookieUtils.getRefreshToken.mockReturnValue('rt');
        AuthService.refreshToken.mockResolvedValue({ accessToken: 'at2', refreshToken: 'rt2' });
        
        await controller.refreshToken(req, res);
        expect(CookieUtils.setAuthCookies).toHaveBeenCalledWith(res, 'at2', 'rt2');
    });

    // 🎯 Branch Coverage: `if (result.refreshToken)` is false
    it('should refresh only access token (no new refresh token)', async () => {
        CookieUtils.getRefreshToken.mockReturnValue('rt');
        AuthService.refreshToken.mockResolvedValue({ accessToken: 'at2', refreshToken: null });
        
        await controller.refreshToken(req, res);
        expect(CookieUtils.setAccessTokenCookie).toHaveBeenCalledWith(res, 'at2');
        expect(CookieUtils.setAuthCookies).not.toHaveBeenCalled(); 
    });

    it('should handle errors', async () => {
        CookieUtils.getRefreshToken.mockReturnValue('rt');
        AuthService.refreshToken.mockRejectedValue(new Error('Exp'));
        await expect(controller.refreshToken(req, res)).rejects.toThrow('Exp');
        expect(CookieUtils.clearAuthCookies).toHaveBeenCalled();
    });
  });

  describe('Other Methods', () => {
    // MFA Setup/Enable/Disable/Status
    it('setupMfa success', async () => {
        MfaService.generateMfaSecret.mockResolvedValue({ secret: 's', qrCodeUrl: 'q' });
        await controller.setupMfa(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });
    it('enableMfa success', async () => {
        await controller.enableMfa(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });
    it('disableMfa success', async () => {
        await controller.disableMfa(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });
    it('getMfaStatus success', async () => {
        await controller.getMfaStatus(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    // Profile & Pwd
    it('getProfile success', async () => {
        await controller.getProfile(req, res);
        expect(res.json).toHaveBeenCalled();
    });
    
    // 🎯 Branch Coverage: missing clientInfo in forgotPassword
    it('forgotPassword success (fallback header)', async () => {
        req.clientInfo = undefined;
        await controller.forgotPassword(req, res);
        expect(LoggerMock.passwordResetRequest).toHaveBeenCalled();
    });
    it('verifyResetToken success', async () => {
        await controller.verifyResetToken(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });
    // 🎯 Branch Coverage: missing clientInfo in resetPassword
    it('resetPassword success (fallback header)', async () => {
        req.clientInfo = undefined;
        await controller.resetPassword(req, res);
        expect(LoggerMock.passwordResetSuccess).toHaveBeenCalled();
    });
    it('changeEmail success', async () => {
        await controller.changeEmail(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });
    it('changePassword success', async () => {
        await controller.changePassword(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });
    it('updateProfile success', async () => {
        await controller.updateProfile(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    // Logout
    // 🎯 Branch Coverage: logoutUser with missing clientInfo
    it('logoutUser with token but missing clientInfo', async () => {
        CookieUtils.getRefreshToken.mockReturnValue('rt');
        req.clientInfo = undefined; 
        await controller.logoutUser(req, res);
        expect(LoggerMock.logout).toHaveBeenCalledWith('user-123', '127.0.0.1', 'Jest-User-Agent');
    });

    // 🎯 Branch Coverage: `if (req.user)` is false
    it('logoutUser without req.user', async () => {
        CookieUtils.getRefreshToken.mockReturnValue('rt');
        req.user = undefined; 
        await controller.logoutUser(req, res);
        expect(LoggerMock.logout).not.toHaveBeenCalled(); 
        expect(CookieUtils.clearAuthCookies).toHaveBeenCalled();
    });

    it('logoutAllUser success', async () => {
        await controller.logoutAllUser(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    // Google Auth
    // 🎯 Branch Coverage: process.env.FRONTEND_URL default fallback
    it('googleAuthCallback success with default URL fallback', async () => {
        delete process.env.FRONTEND_URL; // Force fallback
        AuthService.googleAuthCallback.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });
        await controller.googleAuthCallback(req, res);
        expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('http://localhost:5173'));
    });

    it('googleAuthCallback error', async () => {
        AuthService.googleAuthCallback.mockRejectedValue(new Error('fail'));
        await controller.googleAuthCallback(req, res);
        expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error'));
    });

    // Trusted Devices
    it('getTrustedDevices success', async () => {
        TrustedDeviceModel.findByUser.mockResolvedValue([]);
        await controller.getTrustedDevices(req, res);
        expect(res.json).toHaveBeenCalled();
    });
    it('deleteTrustedDevice success', async () => {
        TrustedDeviceModel.deleteById.mockResolvedValue(1);
        await controller.deleteTrustedDevice(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });
    it('deleteTrustedDevice fail (not found)', async () => {
        TrustedDeviceModel.deleteById.mockResolvedValue(0);
        await controller.deleteTrustedDevice(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
    it('deleteAllTrustedDevices success', async () => {
        await controller.deleteAllTrustedDevices(req, res);
        expect(res.json).toHaveBeenCalled();
    });
  });
});