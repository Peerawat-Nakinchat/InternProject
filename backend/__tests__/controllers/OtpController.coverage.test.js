/**
 * OtpController Coverage Tests
 * Targets 100% Code Coverage
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

// ✅ 1. Setup Absolute Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const otpControllerPath = path.resolve(__dirname, '../../src/controllers/OtpController.js');
const otpServicePath = path.resolve(__dirname, '../../src/services/OtpService.js');
const userModelPath = path.resolve(__dirname, '../../src/models/UserModel.js');
const responseHandlerPath = path.resolve(__dirname, '../../src/utils/responseHandler.js');
const errorHandlerPath = path.resolve(__dirname, '../../src/middleware/errorHandler.js');

// ✅ 2. Mock Modules using unstable_mockModule
await jest.unstable_mockModule(otpServicePath, () => ({
  default: {}
}));

await jest.unstable_mockModule(userModelPath, () => ({
  UserModel: {}
}));

await jest.unstable_mockModule(responseHandlerPath, () => ({
  ResponseHandler: {
    success: jest.fn(),
    error: jest.fn((res, msg, code) => res.status(code).json({ error: msg }))
  }
}));

await jest.unstable_mockModule(errorHandlerPath, () => ({
  asyncHandler: (fn) => fn // Pass-through เพื่อให้เทส Logic ใน function ได้โดยตรง
}));

// ✅ 3. Import Module Under Test
const { createOtpController, default: DefaultController } = await import(otpControllerPath);
const { ResponseHandler } = await import(responseHandlerPath);

describe('OtpController', () => {
  let deps;
  let controller;
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    // Prepare Dependencies Mock Object
    deps = {
      OtpService: {
        sendOtp: jest.fn(),
        verifyOtp: jest.fn(),
        resendOtp: jest.fn(),
      },
      UserModel: {
        findByEmail: jest.fn(),
        setEmailVerified: jest.fn(),
      }
    };

    // Inject Mocks
    controller = createOtpController(deps);

    // Mock Req/Res
    req = {
      body: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('Initialization', () => {
    it('should use default dependencies if none provided', () => {
      const defaultCtrl = createOtpController();
      expect(defaultCtrl).toBeDefined();
      expect(DefaultController).toBeDefined();
    });
  });

  describe('sendOtp', () => {
    it('should return 400 if email is missing', async () => {
      req.body = {};
      await controller.sendOtp(req, res);
      expect(ResponseHandler.error).toHaveBeenCalledWith(res, 'กรุณากรอกอีเมล', 400);
    });

    it('should return 400 if purpose is invalid', async () => {
      req.body = { email: 'test@test.com', purpose: 'invalid_purpose' };
      await controller.sendOtp(req, res);
      expect(ResponseHandler.error).toHaveBeenCalledWith(res, 'Purpose ไม่ถูกต้อง', 400);
    });

    it('should send OTP successfully with default purpose', async () => {
      req.body = { email: 'test@test.com' }; // Default: email_verification
      const mockResult = { message: 'Sent', email: 'test@test.com', expires_at: 'time' };
      deps.OtpService.sendOtp.mockResolvedValue(mockResult);

      await controller.sendOtp(req, res);

      expect(deps.OtpService.sendOtp).toHaveBeenCalledWith('test@test.com', 'email_verification');
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, expect.objectContaining({ email: 'test@test.com' }), 'Sent');
    });

    it('should send OTP successfully with explicit purpose', async () => {
      req.body = { email: 'test@test.com', purpose: 'change_email' };
      const mockResult = { message: 'Sent', email: 'test@test.com', expires_at: 'time' };
      deps.OtpService.sendOtp.mockResolvedValue(mockResult);

      await controller.sendOtp(req, res);

      expect(deps.OtpService.sendOtp).toHaveBeenCalledWith('test@test.com', 'change_email');
      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    it('should return 400 if email is missing', async () => {
      req.body = { otp: '123456' };
      await controller.verifyOtp(req, res);
      expect(ResponseHandler.error).toHaveBeenCalledWith(res, expect.stringContaining('กรุณากรอก'), 400);
    });

    it('should return 400 if otp is missing', async () => {
      req.body = { email: 'test@test.com' };
      await controller.verifyOtp(req, res);
      expect(ResponseHandler.error).toHaveBeenCalledWith(res, expect.stringContaining('กรุณากรอก'), 400);
    });

    it('should verify OTP and update user status (email_verification)', async () => {
      req.body = { email: 'test@test.com', otp: '123456' }; // Default purpose
      deps.OtpService.verifyOtp.mockResolvedValue({ verified: true, message: 'Verified' });
      deps.UserModel.findByEmail.mockResolvedValue({ user_id: 'uid-1' });

      await controller.verifyOtp(req, res);

      expect(deps.OtpService.verifyOtp).toHaveBeenCalledWith('test@test.com', '123456', 'email_verification');
      expect(deps.UserModel.findByEmail).toHaveBeenCalledWith('test@test.com');
      expect(deps.UserModel.setEmailVerified).toHaveBeenCalledWith('uid-1', true);
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, expect.objectContaining({ verified: true }), 'Verified');
    });

    it('should verify OTP but NOT update user status (change_email)', async () => {
      req.body = { email: 'test@test.com', otp: '123456', purpose: 'change_email' };
      deps.OtpService.verifyOtp.mockResolvedValue({ verified: true, message: 'Verified' });

      await controller.verifyOtp(req, res);

      expect(deps.OtpService.verifyOtp).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'change_email');
      // Branch check: purpose !== email_verification
      expect(deps.UserModel.findByEmail).not.toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it('should verify OTP but NOT update user if user not found (Safety check)', async () => {
      req.body = { email: 'unknown@test.com', otp: '123456' };
      deps.OtpService.verifyOtp.mockResolvedValue({ verified: true, message: 'Verified' });
      deps.UserModel.findByEmail.mockResolvedValue(null); // User not found

      await controller.verifyOtp(req, res);

      expect(deps.UserModel.findByEmail).toHaveBeenCalled();
      // Branch check: if (user)
      expect(deps.UserModel.setEmailVerified).not.toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalled();
    });

    it('should not update user if verification result is false', async () => {
      req.body = { email: 'test@test.com', otp: 'wrong' };
      deps.OtpService.verifyOtp.mockResolvedValue({ verified: false, message: 'Failed' });

      await controller.verifyOtp(req, res);

      // Branch check: if (result.verified && ...)
      expect(deps.UserModel.findByEmail).not.toHaveBeenCalled();
      expect(ResponseHandler.success).toHaveBeenCalled();
    });
  });

  describe('resendOtp', () => {
    it('should return 400 if email is missing', async () => {
      req.body = {};
      await controller.resendOtp(req, res);
      expect(ResponseHandler.error).toHaveBeenCalledWith(res, 'กรุณากรอกอีเมล', 400);
    });

    it('should resend OTP successfully', async () => {
      req.body = { email: 'test@test.com', purpose: 'change_email' };
      const mockResult = { message: 'Resent', email: 'test@test.com', expires_at: 'new-time' };
      deps.OtpService.resendOtp.mockResolvedValue(mockResult);

      await controller.resendOtp(req, res);

      expect(deps.OtpService.resendOtp).toHaveBeenCalledWith('test@test.com', 'change_email');
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, expect.objectContaining({ message: 'Resent' }), 'Resent');
    });
  });
});