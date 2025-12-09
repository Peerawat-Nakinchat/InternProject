import AuthService from "../services/AuthService.js";
import logger, { securityLogger } from "../utils/logger.js";
import { recordFailedLogin, clearFailedLogins } from "../middleware/securityMonitoring.js";
import { 
  setAuthCookies, setAccessTokenCookie, clearAuthCookies, getRefreshToken 
} from "../utils/cookieUtils.js";
import { ResponseHandler } from "../utils/responseHandler.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const createAuthController = (deps = {}) => {
  const service = deps.service || AuthService;
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
      const clientInfo = req.clientInfo || {};
      const ip = clientInfo.ipAddress || req.ip;

      // Success Handling
      logger.loginSuccess(
        result.user.user_id, result.user.email, ip,
        clientInfo.userAgent || req.headers["user-agent"]
      );
      security.clearFailedLogins(ip);
      cookies.setAuthCookies(res, result.accessToken, result.refreshToken);

      return ResponseHandler.success(res, result, "เข้าสู่ระบบสำเร็จ");

    } catch (error) {
      // Log Fail Only (แล้ว throw ต่อ)
      const ip = req.clientInfo?.ipAddress || req.ip;
      logger.loginFailed(email, ip, req.headers["user-agent"], "Invalid login");
      security.recordFailedLogin(ip);
      throw error; 
    }
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
    registerUser, loginUser, refreshToken, getProfile,
    forgotPassword, verifyResetToken, resetPassword,
    changeEmail, changePassword, updateProfile,
    logoutUser, logoutAllUser, googleAuthCallback
  };
};

const defaultController = createAuthController();

export const {
  registerUser, loginUser, refreshToken, getProfile,
  forgotPassword, verifyResetToken, resetPassword,
  changeEmail, changePassword, updateProfile,
  logoutUser, logoutAllUser, googleAuthCallback
} = defaultController;

export default defaultController;