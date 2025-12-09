// src/controllers/AuthController.js
import AuthService from "../services/AuthService.js";
import MfaService from "../services/MfaService.js";
import logger, { securityLogger } from "../utils/logger.js";
import { recordFailedLogin, clearFailedLogins } from "../middleware/securityMonitoring.js";
import { 
  setAuthCookies, setAccessTokenCookie, clearAuthCookies, getRefreshToken 
} from "../utils/cookieUtils.js";
import { ResponseHandler } from "../utils/responseHandler.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { signAccessToken } from "../utils/token.js"; 

export const createAuthController = (deps = {}) => {
  const service = deps.service || AuthService;
  const mfaService = deps.mfaService || MfaService;
  const logger = deps.logger || securityLogger;
  const security = deps.security || { recordFailedLogin, clearFailedLogins };
  const cookies = deps.cookies || { setAuthCookies, setAccessTokenCookie, clearAuthCookies, getRefreshToken };

  const registerUser = asyncHandler(async (req, res) => {
    const result = await service.register(req.body);
    
    // Log Success Only
    const clientInfo = req.clientInfo || {};
    logger.registrationSuccess(
      result.user.user_id, result.user.email,
      clientInfo.ipAddress || req.ip,
      clientInfo.userAgent || req.headers["user-agent"]
    );

    return ResponseHandler.created(res, result, "ลงทะเบียนสำเร็จ");
  });

  const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    try {
      const result = await service.login(email, password);
      const user = result.user;

      const clientInfo = req.clientInfo || {};
      const ip = clientInfo.ipAddress || req.ip;

      if (user.mfa_enabled) {
        const tempToken = signAccessToken({ 
            id: user.user_id, 
            mfa_pending: true 
        }, '5m'); 

        logger.info(`MFA Challenge required for user: ${email}`);
        
        return res.status(200).json({
          success: true,
          mfaRequired: true,
          tempToken: tempToken,
          message: "กรุณาระบุรหัส OTP (2FA)"
        });
      }
      
      logger.loginSuccess(
        result.user.user_id, result.user.email, ip,
        clientInfo.userAgent || req.headers["user-agent"]
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
    // req.user มาจาก middleware ที่ decode tempToken
    const user = await service.getProfile(req.user.user_id); 
    
    const isValid = mfaService.verifyLoginMfa(user, otp);
    if (!isValid) {
      securityLogger.warn(`MFA Failed for user ${user.email}`);
      return ResponseHandler.error(res, "Invalid OTP Code", 401);
    }

    const tokens = await service.generateTokens(user);
    
    const clientInfo = req.clientInfo || {};
    const ip = clientInfo.ipAddress || req.ip;
    
    logger.loginSuccess(
      user.user_id, user.email, ip,
      clientInfo.userAgent || req.headers["user-agent"]
    );
    security.clearFailedLogins(ip);
    
    cookies.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return ResponseHandler.success(res, { user, ...tokens }, "เข้าสู่ระบบสำเร็จ (2FA)");
  });

  const setupMfa = asyncHandler(async (req, res) => {
    const { secret, qrCodeUrl } = await mfaService.generateMfaSecret(req.user.user_id, req.user.email);
    return ResponseHandler.success(res, { secret, qrCodeUrl }, "สแกน QR Code นี้ด้วยแอป Authenticator");
  });

  const enableMfa = asyncHandler(async (req, res) => {
    const { otp } = req.body;
    await mfaService.verifyAndEnableMfa(req.user.user_id, otp);
    
    securityLogger.info(`MFA Enabled for user ${req.user.email}`);
    return ResponseHandler.success(res, null, "เปิดใช้งาน 2FA สำเร็จ");
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
      req.body.email, clientInfo.ipAddress || req.ip,
      clientInfo.userAgent || req.headers["user-agent"], true
    );

    return ResponseHandler.success(res, null, "หากอีเมลถูกต้อง ระบบจะส่งลิงก์รีเซ็ตรหัสผ่านไปให้");
  });

  const verifyResetToken = asyncHandler(async (req, res) => {
    const result = await service.verifyResetToken(req.query.token);
    return ResponseHandler.success(res, result);
  });

  const resetPassword = asyncHandler(async (req, res) => {
    await service.resetPassword(req.body.token, req.body.password);
    
    const clientInfo = req.clientInfo || {};
    logger.passwordResetSuccess(
      null, null, clientInfo.ipAddress || req.ip, 
      clientInfo.userAgent || req.headers["user-agent"]
    );

    return ResponseHandler.success(res, null, "เปลี่ยนรหัสผ่านสำเร็จ");
  });

  const changeEmail = asyncHandler(async (req, res) => {
    const result = await service.changeEmail(req.user.user_id, req.body.newEmail, req.body.password);
    return ResponseHandler.success(res, { user: result }, "เปลี่ยนอีเมลสำเร็จ");
  });

  const changePassword = asyncHandler(async (req, res) => {
    await service.changePassword(req.user.user_id, req.body.oldPassword, req.body.newPassword);
    return ResponseHandler.success(res, null, "เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่");
  });

  const updateProfile = asyncHandler(async (req, res) => {
    const updatedUser = await service.updateProfile(req.user.user_id, req.body);
    return ResponseHandler.success(res, { user: updatedUser }, "บันทึกข้อมูลสำเร็จ");
  });

  const logoutUser = asyncHandler(async (req, res) => {
    const token = cookies.getRefreshToken(req);
    if (token) await service.logout(token);

    const clientInfo = req.clientInfo || {};
    if (req.user) {
      logger.logout(
        req.user.user_id, clientInfo.ipAddress || req.ip,
        clientInfo.userAgent || req.headers["user-agent"]
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
      res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/auth/callback?oauth=success`);
    } catch (error) {
      logger.error("💥 Google Auth Callback error:", error);
      res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/login?error=google_auth_failed`);
    }
  });

  return {
    registerUser, loginUser, verifyMfaLogin, setupMfa, enableMfa,
    refreshToken, getProfile,
    forgotPassword, verifyResetToken, resetPassword,
    changeEmail, changePassword, updateProfile,
    logoutUser, logoutAllUser, googleAuthCallback
  };
};

const defaultController = createAuthController();

export const {
  registerUser, loginUser, verifyMfaLogin, setupMfa, enableMfa,
  refreshToken, getProfile,
  forgotPassword, verifyResetToken, resetPassword,
  changeEmail, changePassword, updateProfile,
  logoutUser, logoutAllUser, googleAuthCallback
} = defaultController;

export default defaultController;