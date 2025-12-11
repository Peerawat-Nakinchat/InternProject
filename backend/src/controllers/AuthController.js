// src/controllers/AuthController.js
import AuthService from "../services/AuthService.js";
import MfaService from "../services/MfaService.js";
import TrustedDeviceModel from "../models/TrustedDeviceModel.js";
import {
  generateDeviceFingerprint,
  parseUserAgent,
} from "../utils/deviceFingerprint.js";
import logger, { securityLogger } from "../utils/logger.js";
import {
  recordFailedLogin,
  clearFailedLogins,
} from "../middleware/securityMonitoring.js";
import {
  setAuthCookies,
  setAccessTokenCookie,
  clearAuthCookies,
  getRefreshToken,
} from "../utils/cookieUtils.js";
import { ResponseHandler } from "../utils/responseHandler.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { signAccessToken } from "../utils/token.js";

export const createAuthController = (deps = {}) => {
  const service = deps.service || AuthService;
  const mfaService = deps.mfaService || MfaService;
  const logger = deps.logger || securityLogger;
  const security = deps.security || { recordFailedLogin, clearFailedLogins };
  const cookies = deps.cookies || {
    setAuthCookies,
    setAccessTokenCookie,
    clearAuthCookies,
    getRefreshToken,
  };

  const registerUser = asyncHandler(async (req, res) => {
    const result = await service.register(req.body);

    // Log Success Only
    const clientInfo = req.clientInfo || {};
    logger.registrationSuccess(
      result.user.user_id,
      result.user.email,
      clientInfo.ipAddress || req.ip,
      clientInfo.userAgent || req.headers["user-agent"],
    );

    return ResponseHandler.created(res, result, "ลงทะเบียนสำเร็จ");
  });

  const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    try {
      const clientInfo = req.clientInfo || {};
      const ip = clientInfo.ipAddress || req.ip;

      // ✅ Smart MFA: Generate fingerprint BEFORE calling service.login
      const fingerprint = generateDeviceFingerprint(req);
      console.log(`[DEBUG] loginUser: fingerprint = ${fingerprint}`);

      // Pass fingerprint to service.login for including in tempToken
      const result = await service.login(email, password, fingerprint);
      const user = result.user;

      // ✅ Smart MFA: If MFA is required, check if device is trusted first
      if (result.mfaRequired && user.mfa_enabled) {
        console.log(
          `[DEBUG] loginUser: MFA required, checking trusted device...`,
        );

        const trustedDevice = await TrustedDeviceModel.findByFingerprint(
          user.user_id,
          fingerprint,
        );

        if (trustedDevice) {
          // Device is trusted - skip MFA, update last used, generate full tokens
          console.log(`[DEBUG] loginUser: Device is TRUSTED, skipping MFA`);
          await TrustedDeviceModel.updateLastUsed(trustedDevice.device_id);
          logger.info(`Trusted device login for user: ${email}`);

          // Generate full tokens and complete login
          const tokens = await service.generateTokens(user);

          logger.loginSuccess(
            user.user_id,
            user.email,
            ip,
            clientInfo.userAgent || req.headers["user-agent"],
          );
          security.clearFailedLogins(ip);
          cookies.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

          return ResponseHandler.success(
            res,
            {
              ...tokens,
              user: user,
            },
            "เข้าสู่ระบบสำเร็จ (อุปกรณ์ที่เชื่อถือ)",
          );
        } else {
          // New device - require MFA (tempToken already has fingerprint from service.login)
          console.log(
            `[DEBUG] loginUser: Device is NOT trusted, requiring MFA`,
          );
          logger.info(`MFA Challenge required for user: ${email} (new device)`);

          return res.status(200).json({
            success: true,
            mfaRequired: true,
            tempToken: result.tempToken, // ✅ This now contains fingerprint
            message: "กรุณาระบุรหัส OTP (2FA) - อุปกรณ์ใหม่",
            isNewDevice: true,
          });
        }
      }

      logger.loginSuccess(
        result.user.user_id,
        result.user.email,
        ip,
        clientInfo.userAgent || req.headers["user-agent"],
      );
      security.clearFailedLogins(ip);
      cookies.setAuthCookies(res, result.accessToken, result.refreshToken);

      return ResponseHandler.success(res, result, "เข้าสู่ระบบสำเร็จ");
    } catch (error) {
      const ip = req.clientInfo?.ipAddress || req.ip;
      logger.loginFailed(email, ip, req.headers["user-agent"], "Invalid login");
      security.recordFailedLogin(ip);
      throw error;
    }
  });

  const verifyMfaLogin = asyncHandler(async (req, res) => {
    const { otp } = req.body;

    // ✅ ดึง tempToken จาก Authorization header เอง (ไม่ใช้ authMw.protect)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return ResponseHandler.error(
        res,
        "ไม่พบ Token กรุณาเข้าสู่ระบบใหม่",
        401,
      );
    }

    const tempToken = authHeader.split(" ")[1];

    // Verify tempToken
    const { verifyAccessToken } = await import("../utils/token.js");
    const decoded = verifyAccessToken(tempToken);

    if (!decoded || !decoded.user_id) {
      return ResponseHandler.error(res, "Token ไม่ถูกต้องหรือหมดอายุ", 401);
    }

    // ดึงข้อมูล user
    const user = await service.getProfile(decoded.user_id);
    if (!user) {
      return ResponseHandler.error(res, "ไม่พบผู้ใช้งาน", 404);
    }

    const isValid = mfaService.verifyLoginMfa(user, otp);
    if (!isValid) {
      securityLogger.warn(`MFA Failed for user ${user.email}`);
      return ResponseHandler.error(res, "รหัส OTP ไม่ถูกต้อง", 401);
    }

    const tokens = await service.generateTokens(user);

    const clientInfo = req.clientInfo || {};
    const ip = clientInfo.ipAddress || req.ip;

    logger.loginSuccess(
      user.user_id,
      user.email,
      ip,
      clientInfo.userAgent || req.headers["user-agent"],
    );
    security.clearFailedLogins(ip);

    // ✅ Smart MFA: Save as trusted device
    try {
      console.log(
        `[DEBUG] Verify MFA: tempToken fingerprint: ${decoded.fingerprint}`,
      );
      if (decoded.fingerprint) {
        await TrustedDeviceModel.create(
          user.user_id,
          decoded.fingerprint,
          parseUserAgent(req.headers["user-agent"]),
          ip,
        );
        console.log(
          `[DEBUG] New trusted device saved for user: ${user.email} (FP: ${decoded.fingerprint})`,
        );
        logger.info(`New trusted device saved for user: ${user.email}`);
      } else {
        console.log(
          "[DEBUG] MFA Success but no fingerprint found in tempToken",
        );
        logger.warn("MFA Success but no fingerprint found in tempToken");
      }
    } catch (err) {
      console.error(`[DEBUG] Failed to save trusted device: ${err.message}`);
      logger.error(`Failed to save trusted device: ${err.message}`);
      // Don't fail login if device save fails
    }

    cookies.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return ResponseHandler.success(
      res,
      { user, ...tokens },
      "ยืนยัน MFA สำเร็จ",
    );
  });

  const setupMfa = asyncHandler(async (req, res) => {
    const { secret, qrCodeUrl } = await mfaService.generateMfaSecret(
      req.user.user_id,
      req.user.email,
    );
    return ResponseHandler.success(
      res,
      { secret, qrCodeUrl },
      "สแกน QR Code นี้ด้วยแอป Authenticator",
    );
  });

  const enableMfa = asyncHandler(async (req, res) => {
    const { otp } = req.body;
    await mfaService.verifyAndEnableMfa(req.user.user_id, otp);

    securityLogger.info(`MFA Enabled for user ${req.user.email}`);
    return ResponseHandler.success(res, null, "เปิดใช้งาน 2FA สำเร็จ");
  });

  const disableMfa = asyncHandler(async (req, res) => {
    const { otp } = req.body;
    await mfaService.disableMfa(req.user.user_id, otp);

    securityLogger.info(`MFA Disabled for user ${req.user.email}`);
    return ResponseHandler.success(res, null, "ปิดใช้งาน 2FA สำเร็จ");
  });

  const getMfaStatus = asyncHandler(async (req, res) => {
    const status = await mfaService.getMfaStatus(req.user.user_id);
    return ResponseHandler.success(res, status);
  });

  const refreshToken = asyncHandler(async (req, res) => {
    try {
      const token = cookies.getRefreshToken(req);
      if (!token) {
        return ResponseHandler.error(res, "Refresh Token required", 401);
      }

      const result = await service.refreshToken(token);

      cookies.setAccessTokenCookie(res, result.accessToken);
      if (result.refreshToken) {
        cookies.setAuthCookies(res, result.accessToken, result.refreshToken);
      }

      return ResponseHandler.success(res, result);
    } catch (error) {
      cookies.clearAuthCookies(res);
      throw error;
    }
  });

  const getProfile = asyncHandler(async (req, res) => {
    const user = await service.getProfile(req.user.user_id);
    return ResponseHandler.success(res, { user });
  });

  const forgotPassword = asyncHandler(async (req, res) => {
    await service.forgotPassword(req.body.email);

    const clientInfo = req.clientInfo || {};
    logger.passwordResetRequest(
      req.body.email,
      clientInfo.ipAddress || req.ip,
      clientInfo.userAgent || req.headers["user-agent"],
      true,
    );

    return ResponseHandler.success(
      res,
      null,
      "หากอีเมลถูกต้อง ระบบจะส่งลิงก์รีเซ็ตรหัสผ่านไปให้",
    );
  });

  const verifyResetToken = asyncHandler(async (req, res) => {
    const result = await service.verifyResetToken(req.query.token);
    return ResponseHandler.success(res, result);
  });

  const resetPassword = asyncHandler(async (req, res) => {
    await service.resetPassword(req.body.token, req.body.password);

    const clientInfo = req.clientInfo || {};
    logger.passwordResetSuccess(
      null,
      null,
      clientInfo.ipAddress || req.ip,
      clientInfo.userAgent || req.headers["user-agent"],
    );

    return ResponseHandler.success(res, null, "เปลี่ยนรหัสผ่านสำเร็จ");
  });

  const changeEmail = asyncHandler(async (req, res) => {
    const result = await service.changeEmail(
      req.user.user_id,
      req.body.newEmail,
      req.body.password,
    );
    return ResponseHandler.success(res, { user: result }, "เปลี่ยนอีเมลสำเร็จ");
  });

  const changePassword = asyncHandler(async (req, res) => {
    await service.changePassword(
      req.user.user_id,
      req.body.oldPassword,
      req.body.newPassword,
    );
    return ResponseHandler.success(
      res,
      null,
      "เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่",
    );
  });

  const updateProfile = asyncHandler(async (req, res) => {
    const updatedUser = await service.updateProfile(req.user.user_id, req.body);
    return ResponseHandler.success(
      res,
      { user: updatedUser },
      "บันทึกข้อมูลสำเร็จ",
    );
  });

  const logoutUser = asyncHandler(async (req, res) => {
    const token = cookies.getRefreshToken(req);
    if (token) await service.logout(token);

    const clientInfo = req.clientInfo || {};
    if (req.user) {
      logger.logout(
        req.user.user_id,
        clientInfo.ipAddress || req.ip,
        clientInfo.userAgent || req.headers["user-agent"],
      );
    }

    cookies.clearAuthCookies(res);
    return ResponseHandler.success(res, null, "ออกจากระบบสำเร็จ");
  });

  const logoutAllUser = asyncHandler(async (req, res) => {
    await service.logoutAll(req.user.user_id);
    cookies.clearAuthCookies(res);
    return ResponseHandler.success(res, null, "ออกจากระบบทุกอุปกรณ์สำเร็จ");
  });

  const googleAuthCallback = asyncHandler(async (req, res) => {
    try {
      const result = await service.googleAuthCallback(req.user);
      cookies.setAuthCookies(res, result.accessToken, result.refreshToken);
      res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:5173"}/auth/callback?oauth=success`,
      );
    } catch (error) {
      logger.error("💥 Google Auth Callback error:", error);
      res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:5173"}/login?error=google_auth_failed`,
      );
    }
  });

  // =========================================
  // ✅ Trusted Devices Management
  // =========================================

  const getTrustedDevices = asyncHandler(async (req, res) => {
    const userId = req.user.user_id;
    console.log(`[DEBUG] getTrustedDevices: userId = ${userId}`);
    const devices = await TrustedDeviceModel.findByUser(userId);
    console.log(`[DEBUG] getTrustedDevices: found ${devices.length} devices`);
    console.log(
      `[DEBUG] getTrustedDevices: devices =`,
      JSON.stringify(devices, null, 2),
    );
    return ResponseHandler.success(res, devices, "รายการอุปกรณ์ที่เชื่อถือ");
  });

  const deleteTrustedDevice = asyncHandler(async (req, res) => {
    const userId = req.user.user_id;
    const { deviceId } = req.params;

    const deleted = await TrustedDeviceModel.deleteById(deviceId, userId);
    if (deleted === 0) {
      return ResponseHandler.error(res, "ไม่พบอุปกรณ์นี้", 404);
    }

    logger.info(`Trusted device ${deviceId} deleted by user ${userId}`);
    return ResponseHandler.success(res, null, "ลบอุปกรณ์เรียบร้อยแล้ว");
  });

  const deleteAllTrustedDevices = asyncHandler(async (req, res) => {
    const userId = req.user.user_id;
    const count = await TrustedDeviceModel.deleteByUser(userId);

    logger.info(`All trusted devices (${count}) deleted for user ${userId}`);
    return ResponseHandler.success(
      res,
      { deletedCount: count },
      "ลบอุปกรณ์ทั้งหมดเรียบร้อยแล้ว",
    );
  });

  return {
    registerUser,
    loginUser,
    verifyMfaLogin,
    setupMfa,
    enableMfa,
    disableMfa,
    getMfaStatus,
    getTrustedDevices,
    deleteTrustedDevice,
    deleteAllTrustedDevices,
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
  getTrustedDevices,
  deleteTrustedDevice,
  deleteAllTrustedDevices,
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
} = defaultController;

export default defaultController;
