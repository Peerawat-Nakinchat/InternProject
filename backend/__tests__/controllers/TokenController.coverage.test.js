/**
 * TokenController Coverage Tests
 * Targets 100% Code Coverage
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

// ✅ 1. Setup Absolute Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tokenControllerPath = path.resolve(__dirname, '../../src/controllers/TokenController.js');
const authServicePath = path.resolve(__dirname, '../../src/services/AuthService.js');
const responseHandlerPath = path.resolve(__dirname, '../../src/utils/responseHandler.js');
const errorHandlerPath = path.resolve(__dirname, '../../src/middleware/errorHandler.js');

// ✅ 2. Mock Modules
await jest.unstable_mockModule(authServicePath, () => ({
  default: {}
}));

await jest.unstable_mockModule(responseHandlerPath, () => ({
  ResponseHandler: {
    success: jest.fn(),
    error: jest.fn((res, msg, code) => res.status(code).json({ error: msg }))
  }
}));

await jest.unstable_mockModule(errorHandlerPath, () => ({
  asyncHandler: (fn) => fn // Pass-through
}));

// ✅ 3. Import Module Under Test
const { createTokenController, default: DefaultController } = await import(tokenControllerPath);
const { ResponseHandler } = await import(responseHandlerPath);

describe('TokenController', () => {
  let mockAuthService;
  let controller;
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    // Prepare Dependencies
    mockAuthService = {
      refreshToken: jest.fn()
    };

    // Inject Dependencies
    controller = createTokenController({ authService: mockAuthService });

    // Mock Req/Res
    req = {
      body: {},
      cookies: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('Initialization', () => {
    it('should use default dependencies if none provided', () => {
      // Test default parameter: (deps = {}) -> const authService = deps.authService || AuthService;
      const defaultCtrl = createTokenController();
      expect(defaultCtrl).toBeDefined();
      expect(defaultCtrl.createNewAccessToken).toBeDefined();
      expect(DefaultController).toBeDefined();
    });
  });

  describe('createNewAccessToken', () => {
    it('should return 401 if no token provided (cookies undefined, body empty)', async () => {
      // Test Branch: token is undefined (req.cookies is undefined)
      req.cookies = undefined;
      req.body = {};

      await controller.createNewAccessToken(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "Refresh Token Required", 401);
    });

    it('should return 401 if no token provided (cookies empty, body empty)', async () => {
      // Test Branch: token is undefined (req.cookies exists but empty)
      req.cookies = {};
      req.body = {};

      await controller.createNewAccessToken(req, res);

      expect(ResponseHandler.error).toHaveBeenCalledWith(res, "Refresh Token Required", 401);
    });

    it('should retrieve token from cookies (Priority 1)', async () => {
      // Test Branch: req.cookies.refreshToken exists
      req.cookies = { refreshToken: 'cookie-token' };
      req.body = { token: 'body-token' }; // Should be ignored in favor of cookie

      const mockResult = { accessToken: 'new-access' };
      mockAuthService.refreshToken.mockResolvedValue(mockResult);

      await controller.createNewAccessToken(req, res);

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('cookie-token');
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, mockResult);
    });

    it('should retrieve token from body if cookie missing (Priority 2)', async () => {
      // Test Branch: req.cookies.refreshToken missing, use req.body.token
      req.cookies = {};
      req.body = { token: 'body-token' };

      const mockResult = { accessToken: 'new-access' };
      mockAuthService.refreshToken.mockResolvedValue(mockResult);

      await controller.createNewAccessToken(req, res);

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('body-token');
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, mockResult);
    });

    it('should handle service errors', async () => {
      req.body = { token: 'invalid-token' };
      const error = new Error('Invalid Token');
      mockAuthService.refreshToken.mockRejectedValue(error);

      // เนื่องจากเราใช้ asyncHandler แบบ pass-through เราจึง expect ให้มัน throw error ออกมา
      await expect(controller.createNewAccessToken(req, res)).rejects.toThrow('Invalid Token');
    });
  });
});