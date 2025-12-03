// src/controllers/AuthController.js
import AuthService from "../services/AuthService.js";
import { securityLogger } from "../utils/logger.js";
import { recordFailedLogin, clearFailedLogins } from "../middleware/securityMonitoring.js";
import { 
  setAuthCookies, setAccessTokenCookie, clearAuthCookies, getRefreshToken 
} from "../utils/cookieUtils.js";
import { asyncHandler, createError } from "../middleware/errorHandler.js";

export const createAuthController = (deps = {}) => {
  const service = deps.service || AuthService;
  const logger = deps.logger || securityLogger;
  const security = deps.security || { recordFailedLogin, clearFailedLogins };
  const cookies = deps.cookies || { setAuthCookies, setAccessTokenCookie, clearAuthCookies, getRefreshToken };

  // POST /api/auth/register
  const registerUser = asyncHandler(async (req, res) => {
    try {
      const result = await service.register(req.body);
      const clientInfo = req.clientInfo || {};
      
      logger.registrationSuccess(
        result.user.user_id, result.user.email,
        clientInfo.ipAddress || req.ip,
        clientInfo.userAgent || req.headers["user-agent"]
      );

      res.status(201).json({ success: true, message: "ลงทะเบียนสำเร็จ", ...result });
    } catch (error) {
      // Log error business logic ก่อน throw ให้ global handler
      if (error.code === "USER_EXISTS") {
        const clientInfo = req.clientInfo || {};
        logger.registrationFailed(
          req.body.email,
          clientInfo.ipAddress || req.ip,
          clientInfo.userAgent || req.headers["user-agent"],
          "Email already exists"
        );
      }
      throw error; 
    }
  });

  // POST /api/auth/login
  const loginUser = asyncHandler(async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await service.login(email, password);
      
      const clientInfo = req.clientInfo || {};
      const ip = clientInfo.ipAddress || req.ip;

      logger.loginSuccess(
        result.user.user_id, result.user.email, ip,
        clientInfo.userAgent || req.headers["user-agent"]
      );
      security.clearFailedLogins(ip);
      cookies.setAuthCookies(res, result.accessToken, result.refreshToken);

      res.json({ success: true, message: "เข้าสู่ระบบสำเร็จ", ...result });
    } catch (error) {
      // Log failed login
      const clientInfo = req.clientInfo || {};
      const ip = clientInfo.ipAddress || req.ip;
      logger.loginFailed(req.body.email, ip, clientInfo.userAgent || req.headers["user-agent"], "Invalid login");
      security.recordFailedLogin(ip);
      
      throw error;
    }
  });

  // PUT /api/auth/refresh-token
  const refreshToken = asyncHandler(async (req, res) => {
    try {
      const token = cookies.getRefreshToken(req);
      if (!token) throw createError.unauthorized("ไม่พบ Refresh Token");

      const result = await service.refreshToken(token);
      cookies.setAccessTokenCookie(res, result.accessToken);
      if (result.refreshToken) {
        cookies.setAuthCookies(res, result.accessToken, result.refreshToken);
      }

      res.json({ success: true, ...result });
    } catch (error) {
      cookies.clearAuthCookies(res);
      throw error;
    }
  });

  // GET /api/auth/profile
  const getProfile = asyncHandler(async (req, res) => {
    const user = await service.getProfile(req.user.user_id);
    res.json({ success: true, user });
  });

  // POST /api/auth/forgot-password
  const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    await service.forgotPassword(email);

    const clientInfo = req.clientInfo || {};
    logger.passwordResetRequest(
      email, clientInfo.ipAddress || req.ip,
      clientInfo.userAgent || req.headers["user-agent"], true
    );

    res.json({ success: true, message: "ถ้ามีอีเมลนี้ในระบบ จะส่งลิงก์รีเซ็ตรหัสผ่านให้" });
  });

  // GET /api/auth/verify-reset-token
  const verifyResetToken = asyncHandler(async (req, res) => {
    const { token } = req.query;
    const result = await service.verifyResetToken(token);
    res.json({ success: true, ...result });
  });

  // POST /api/auth/reset-password
  const resetPassword = asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    await service.resetPassword(token, password);

    const clientInfo = req.clientInfo || {};
    logger.passwordResetSuccess(
      null, null, clientInfo.ipAddress || req.ip,
      clientInfo.userAgent || req.headers["user-agent"]
    );

    res.json({ success: true, message: "เปลี่ยนรหัสผ่านสำเร็จ" });
  });

  // PUT /api/auth/change-email
  const changeEmail = asyncHandler(async (req, res) => {
    const { newEmail, password } = req.body;
    const result = await service.changeEmail(req.user.user_id, newEmail, password);
    res.json({ success: true, message: "เปลี่ยนอีเมลสำเร็จ", user: result });
  });

  // PUT /api/auth/change-password
  const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    await service.changePassword(req.user.user_id, oldPassword, newPassword);
    res.json({ success: true, message: "เปลี่ยนรหัสผ่านสำเร็จ คุณต้องเข้าสู่ระบบใหม่" });
  });

  // PUT /api/auth/profile
  const updateProfile = asyncHandler(async (req, res) => {
    const updatedUser = await service.updateProfile(req.user.user_id, req.body);
    res.json({ success: true, message: "บันทึกข้อมูลสำเร็จ", user: updatedUser });
  });

  // DELETE /api/auth/logout
  const logoutUser = asyncHandler(async (req, res) => {
    try {
      const refreshTokenValue = cookies.getRefreshToken(req);
      if (refreshTokenValue) await service.logout(refreshTokenValue);

      const clientInfo = req.clientInfo || {};
      if (req.user) {
        logger.logout(
          req.user.user_id, clientInfo.ipAddress || req.ip,
          clientInfo.userAgent || req.headers["user-agent"]
        );
      }
      cookies.clearAuthCookies(res);
      res.json({ success: true, message: "ออกจากระบบสำเร็จ" });
    } catch (error) {
      cookies.clearAuthCookies(res);
      throw error;
    }
  });

  // DELETE /api/auth/logout-all
  const logoutAllUser = asyncHandler(async (req, res) => {
    try {
      await service.logoutAll(req.user.user_id);
      cookies.clearAuthCookies(res);
      res.json({ success: true, message: "ออกจากระบบทุกอุปกรณ์สำเร็จ" });
    } catch (error) {
      cookies.clearAuthCookies(res);
      throw error;
    }
  });

  // GET /api/auth/google/callback
  const googleAuthCallback = asyncHandler(async (req, res) => {
    try {
      const user = req.user;
      const result = await service.googleAuthCallback(user);
      cookies.setAuthCookies(res, result.accessToken, result.refreshToken);

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      res.redirect(`${frontendUrl}/auth/callback?oauth=success`);
    } catch (error) {
      console.error("💥 Google Auth Callback error:", error);
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
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