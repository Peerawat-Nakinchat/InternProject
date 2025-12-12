// src/controllers/AuthController.js
import AuthService from "../services/AuthService.js";
import MfaService from "../services/MfaService.js";
import TrustedDeviceModel from "../models/TrustedDeviceModel.js"; 
import { generateDeviceFingerprint } from "../utils/deviceFingerprint.js";
import logger, { securityLogger } from "../utils/logger.js";
import { recordFailedLogin, clearFailedLogins } from "../middleware/securityMonitoring.js";
import {
  setAuthCookies,
  setAccessTokenCookie,
  clearAuthCookies,
  getRefreshToken,
} from "../utils/cookieUtils.js";
import { ResponseHandler } from "../utils/responseHandler.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const createAuthController = (deps = {}) => {
  const service = deps.service || AuthService;
  const mfaService = deps.mfaService || MfaService;
  const security = deps.security || { recordFailedLogin, clearFailedLogins };
  const cookies = deps.cookies || {
    setAuthCookies,
    setAccessTokenCookie,
    clearAuthCookies,
    getRefreshToken,
  };

  const registerUser = asyncHandler(async (req, res) => {
    const result = await service.register(req.body);
    
    // Log Success
    logger.registrationSuccess(
      result.user.user_id, result.user.email, req.ip, req.headers["user-agent"]
    );

    return ResponseHandler.created(res, result, "ลงทะเบียนสำเร็จ");
  });

  const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const ip = req.clientInfo?.ipAddress || req.ip;

    try {
      const result = await service.loginWithSmartMfa({
        email,
        password,
        fingerprint: generateDeviceFingerprint(req),
        ip,
      });
      if (result.status === "MFA_REQUIRED") {
        logger.info(`MFA Challenge required for user: ${email}`);
        return res.status(200).json({
           success: true,
           ...result 
        });
      }

      // Case 2: Login สำเร็จเลย
      security.clearFailedLogins(ip);
      cookies.setAuthCookies(res, result.accessToken, result.refreshToken);
      
      logger.loginSuccess(
        result.user.user_id, result.user.email, ip, req.headers["user-agent"]
      );

      return ResponseHandler.success(res, result, "เข้าสู่ระบบสำเร็จ");

    } catch (error) {
      security.recordFailedLogin(ip);
      logger.loginFailed(email, ip, req.headers["user-agent"], error.message);
      throw error;
    }
  });

  const verifyMfaLogin = asyncHandler(async (req, res) => {
    const { otp } = req.body;
    const authHeader = req.headers.authorization;
    const tempToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    
    const result = await service.verifyMfaAndSaveDevice({
        tempToken,
        otp,
        ip: req.clientInfo?.ipAddress || req.ip,
        userAgent: req.headers["user-agent"]
    });

    cookies.setAuthCookies(res, result.accessToken, result.refreshToken);
    security.clearFailedLogins(req.ip);

    return ResponseHandler.success(res, result, "ยืนยัน MFA สำเร็จ");
  });


  const refreshToken = asyncHandler(async (req, res) => {
    try {
      const token = cookies.getRefreshToken(req);
      const result = await service.refreshToken(token);
      cookies.setAuthCookies(res, result.accessToken, result.refreshToken);
      return ResponseHandler.success(res, result);
    } catch (error) {
      cookies.clearAuthCookies(res);
      throw error;
    }
  });

  const logoutUser = asyncHandler(async (req, res) => {
    const token = cookies.getRefreshToken(req);
    if (token) await service.logout(token);
    cookies.clearAuthCookies(res);
    return ResponseHandler.success(res, null, "ออกจากระบบสำเร็จ");
  });

  const setupMfa = asyncHandler(async (req, res) => {
     const result = await mfaService.generateMfaSecret(req.user.user_id, req.user.email);
     return ResponseHandler.success(res, result, "สแกน QR Code");
  });
  
  const enableMfa = asyncHandler(async (req, res) => {
     await mfaService.verifyAndEnableMfa(req.user.user_id, req.body.otp);
     return ResponseHandler.success(res, null, "เปิดใช้งาน 2FA สำเร็จ");
  });

  const disableMfa = asyncHandler(async (req, res) => {
     await mfaService.disableMfa(req.user.user_id, req.body.otp);
     return ResponseHandler.success(res, null, "ปิดใช้งาน 2FA สำเร็จ");
  });

  const getMfaStatus = asyncHandler(async (req, res) => {
     const status = await mfaService.getMfaStatus(req.user.user_id);
     return ResponseHandler.success(res, status);
  });

  const getProfile = asyncHandler(async (req, res) => {
    const user = await service.getProfile(req.user.user_id);
    return ResponseHandler.success(res, { user });
  });

  const forgotPassword = asyncHandler(async (req, res) => {
     await service.forgotPassword(req.body.email);
     return ResponseHandler.success(res, null, "ส่งอีเมลรีเซ็ตแล้ว");
  });

  const verifyResetToken = asyncHandler(async (req, res) => {
     const result = await service.verifyResetToken(req.query.token);
     return ResponseHandler.success(res, result);
  });

  const resetPassword = asyncHandler(async (req, res) => {
     await service.resetPassword(req.body.token, req.body.password);
     return ResponseHandler.success(res, null, "เปลี่ยนรหัสผ่านสำเร็จ");
  });

  const updateProfile = asyncHandler(async (req, res) => {
     const updated = await service.updateProfile(req.user.user_id, req.body);
     return ResponseHandler.success(res, { user: updated }, "บันทึกสำเร็จ");
  });

  const changePassword = asyncHandler(async (req, res) => {
     await service.changePassword(req.user.user_id, req.body.oldPassword, req.body.newPassword);
     return ResponseHandler.success(res, null, "เปลี่ยนรหัสผ่านสำเร็จ");
  });
  
  const changeEmail = asyncHandler(async (req, res) => {
     const result = await service.changeEmail(req.user.user_id, req.body.newEmail, req.body.password);
     return ResponseHandler.success(res, { user: result }, "เปลี่ยนอีเมลสำเร็จ");
  });

  const logoutAllUser = asyncHandler(async (req, res) => {
    await service.logoutAll(req.user.user_id);
    cookies.clearAuthCookies(res);
    return ResponseHandler.success(res, null, "Logged out from all devices");
  });

  const googleAuthCallback = asyncHandler(async (req, res) => {
    try {
        const result = await service.googleAuthCallback(req.user);
        cookies.setAuthCookies(res, result.accessToken, result.refreshToken);
        res.redirect(`${process.env.FRONTEND_URL}/auth/callback?oauth=success`);
    } catch (e) {
        res.redirect(`${process.env.FRONTEND_URL}/login?error=google_failed`);
    }
  });

  // ✅ Trusted Device Management (Implemented here for simplicity/completeness)
  const getTrustedDevices = asyncHandler(async (req, res) => {
    const devices = await TrustedDeviceModel.findByUser(req.user.user_id);
    return ResponseHandler.success(res, devices, "รายการอุปกรณ์ที่เชื่อถือ");
  });

  const deleteTrustedDevice = asyncHandler(async (req, res) => {
    const deleted = await TrustedDeviceModel.deleteById(req.params.deviceId, req.user.user_id);
    if (!deleted) return ResponseHandler.error(res, "ไม่พบอุปกรณ์นี้", 404);
    return ResponseHandler.success(res, null, "ลบอุปกรณ์เรียบร้อยแล้ว");
  });

  const deleteAllTrustedDevices = asyncHandler(async (req, res) => {
    const count = await TrustedDeviceModel.deleteByUser(req.user.user_id);
    return ResponseHandler.success(res, { deletedCount: count }, "ลบอุปกรณ์ทั้งหมดเรียบร้อยแล้ว");
  });

  return {
    registerUser,
    loginUser,
    verifyMfaLogin,
    setupMfa,
    enableMfa,
    disableMfa,
    getMfaStatus,
    refreshToken,
    getProfile,
    forgotPassword,
    verifyResetToken,
    resetPassword,
    changeEmail,
    changePassword,
    updateProfile,
    logoutUser,
    logoutAllUser,
    googleAuthCallback,
    getTrustedDevices,
    deleteTrustedDevice,
    deleteAllTrustedDevices,
  };
};

const defaultController = createAuthController();

export const {
  registerUser,
  loginUser,
  verifyMfaLogin,
  setupMfa,
  enableMfa,
  disableMfa,
  getMfaStatus,
  refreshToken,
  getProfile,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  changeEmail,
  changePassword,
  updateProfile,
  logoutUser,
  logoutAllUser,
  googleAuthCallback,
  getTrustedDevices,
  deleteTrustedDevice,
  deleteAllTrustedDevices,
} = defaultController;

export default defaultController;