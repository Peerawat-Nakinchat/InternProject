// src/controllers/AuthController.js
import AuthService from "../services/AuthService.js";
import { securityLogger } from "../utils/logger.js";
import { recordFailedLogin, clearFailedLogins } from "../middleware/securityMonitoring.js";
import { 
  setAuthCookies, 
  setAccessTokenCookie, 
  clearAuthCookies,
  getRefreshToken 
} from "../utils/cookieUtils.js";

/**
 * Factory function for creating AuthController with dependency injection
 * @param {Object} deps - Dependencies
 * @param {Object} deps.service - The auth service (default: AuthService)
 * @param {Object} deps.logger - Security logger (default: securityLogger)
 * @param {Object} deps.security - Security monitoring functions
 * @param {Object} deps.cookies - Cookie utility functions
 * @returns {Object} Controller methods
 */
export const createAuthController = (deps = {}) => {
  const service = deps.service || AuthService;
  const logger = deps.logger || securityLogger;
  const security = deps.security || { recordFailedLogin, clearFailedLogins };
  const cookies = deps.cookies || { setAuthCookies, setAccessTokenCookie, clearAuthCookies, getRefreshToken };

  // ---------------- Register ----------------
  const registerUser = async (req, res) => {
    try {
      const result = await service.register(req.body);

      const clientInfo = req.clientInfo || {};
      logger.registrationSuccess(
        result.user.user_id,
        result.user.email,
        clientInfo.ipAddress || req.ip,
        clientInfo.userAgent || req.headers["user-agent"]
      );

      res.status(201).json({
        success: true,
        message: "ลงทะเบียนสำเร็จ",
        ...result,
      });
    } catch (error) {
      console.error("💥 Register error:", error);

      const clientInfo = req.clientInfo || {};
      if (error.code === "USER_EXISTS") {
        logger.registrationFailed(
          req.body.email,
          clientInfo.ipAddress || req.ip,
          clientInfo.userAgent || req.headers["user-agent"],
          "Email already exists"
        );
      }

      res.status(error.code === "USER_EXISTS" ? 400 : 500).json({
        success: false,
        error: error.message,
      });
    }
  };

  // ---------------- Login ----------------
  const loginUser = async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await service.login(email, password);

      const clientInfo = req.clientInfo || {};
      const ip = clientInfo.ipAddress || req.ip;

      logger.loginSuccess(
        result.user.user_id,
        result.user.email,
        ip,
        clientInfo.userAgent || req.headers["user-agent"]
      );
      security.clearFailedLogins(ip);

      // ✅ Set HTTP-Only cookies สำหรับ tokens (Security Enhancement)
      cookies.setAuthCookies(res, result.accessToken, result.refreshToken);

      res.json({
        success: true,
        message: "เข้าสู่ระบบสำเร็จ",
        // ✅ ยังคง return tokens ใน response body สำหรับ backward compatibility
        // แต่ frontend ใหม่จะใช้ cookies แทน
        ...result,
      });
    } catch (error) {
      console.error("💥 Login error:", error);

      const clientInfo = req.clientInfo || {};
      const ip = clientInfo.ipAddress || req.ip;

      logger.loginFailed(
        req.body.email,
        ip,
        clientInfo.userAgent || req.headers["user-agent"],
        "Invalid login"
      );
      security.recordFailedLogin(ip);

      res.status(401).json({
        success: false,
        error: error.message,
      });
    }
  };

  // ---------------- Refresh Token ----------------
  const refreshToken = async (req, res) => {
    try {
      // ✅ รับ refresh token จาก cookie หรือ body (backward compatibility)
      const token = cookies.getRefreshToken(req);
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "ไม่พบ Refresh Token",
        });
      }

      const result = await service.refreshToken(token);

      // ✅ Set new access token ใน cookie
      cookies.setAccessTokenCookie(res, result.accessToken);

      // ✅ ถ้ามี refresh token ใหม่ ก็ set cookie ใหม่ด้วย
      if (result.refreshToken) {
        cookies.setAuthCookies(res, result.accessToken, result.refreshToken);
      }

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error("💥 Refresh token error:", error);
      
      // ✅ Clear cookies ถ้า refresh token ไม่ valid
      cookies.clearAuthCookies(res);
      
      res.status(401).json({
        success: false,
        message: error.message,
      });
    }
  };

  // ---------------- Get Profile ----------------
  const getProfile = async (req, res) => {
    try {
      const user = await service.getProfile(req.user.user_id);

      res.json({
        success: true,
        user,
      });
    } catch (error) {
      console.error("💥 Get profile error:", error);
      res.status(error.message.includes("ไม่พบ") ? 404 : 500).json({
        success: false,
        error: error.message,
      });
    }
  };

  // ---------------- Forgot Password ----------------
  const forgotPassword = async (req, res) => {
    try {
      const { email } = req.body;
      await service.forgotPassword(email);

      const clientInfo = req.clientInfo || {};
      logger.passwordResetRequest(
        email,
        clientInfo.ipAddress || req.ip,
        clientInfo.userAgent || req.headers["user-agent"],
        true
      );

      res.json({
        success: true,
        message: "ถ้ามีอีเมลนี้ในระบบ จะส่งลิงก์รีเซ็ตรหัสผ่านให้",
      });
    } catch (error) {
      console.error("💥 Forgot password error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };

  // ---------------- Verify Reset Token ----------------
  const verifyResetToken = async (req, res) => {
    try {
      const { token } = req.query;
      const result = await service.verifyResetToken(token);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error("💥 Verify reset token error:", error);
      res.status(400).json({
        success: false,
        valid: false,
        error: error.message,
      });
    }
  };

  // ---------------- Reset Password ----------------
  const resetPassword = async (req, res) => {
    try {
      const { token, password } = req.body;
      await service.resetPassword(token, password);

      const clientInfo = req.clientInfo || {};
      // Note: We don't have user_id here, so we can't log it
      logger.passwordResetSuccess(
        null,
        null,
        clientInfo.ipAddress || req.ip,
        clientInfo.userAgent || req.headers["user-agent"]
      );

      res.json({
        success: true,
        message: "เปลี่ยนรหัสผ่านสำเร็จ",
      });
    } catch (error) {
      console.error("💥 Reset password error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  };

  // ---------------- Change Email ----------------
  const changeEmail = async (req, res) => {
    try {
      const { newEmail, password } = req.body;
      const result = await service.changeEmail(
        req.user.user_id,
        newEmail,
        password
      );

      res.json({
        success: true,
        message: "เปลี่ยนอีเมลสำเร็จ",
        user: result,
      });
    } catch (error) {
      console.error("💥 Change email error:", error);

      const statusCode = error.message.includes("ถูกใช้งานแล้ว")
        ? 409
        : error.message.includes("ไม่ถูกต้อง")
        ? 401
        : error.message.includes("ไม่พบ")
        ? 404
        : 500;

      res.status(statusCode).json({
        success: false,
        error: error.message,
      });
    }
  };

  // ---------------- Change Password ----------------
  const changePassword = async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body;
      await service.changePassword(req.user.user_id, oldPassword, newPassword);

      res.json({
        success: true,
        message: "เปลี่ยนรหัสผ่านสำเร็จ คุณต้องเข้าสู่ระบบใหม่",
      });
    } catch (error) {
      console.error("💥 Change password error:", error);

      const statusCode = error.message.includes("ไม่ถูกต้อง")
        ? 401
        : error.message.includes("ไม่พบ")
        ? 404
        : 500;

      res.status(statusCode).json({
        success: false,
        error: error.message,
      });
    }
  };

  // ---------------- Update Profile ----------------
  const updateProfile = async (req, res) => {
    try {
      const updatedUser = await service.updateProfile(
        req.user.user_id,
        req.body
      );

      res.json({
        success: true,
        message: "บันทึกข้อมูลสำเร็จ",
        user: updatedUser,
      });
    } catch (error) {
      console.error("💥 Update profile error:", error);

      if (error.name === "SequelizeValidationError") {
        const messages = error.errors.map((e) => e.message).join(", ");
        return res.status(400).json({
          success: false,
          error: messages,
        });
      }

      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  };

  // ---------------- Logout ----------------
  const logoutUser = async (req, res) => {
    try {
      // ✅ รับ refresh token จาก cookie หรือ body (backward compatibility)
      const refreshTokenValue = cookies.getRefreshToken(req);
      
      if (refreshTokenValue) {
        await service.logout(refreshTokenValue);
      }

      const clientInfo = req.clientInfo || {};
      if (req.user) {
        logger.logout(
          req.user.user_id,
          clientInfo.ipAddress || req.ip,
          clientInfo.userAgent || req.headers["user-agent"]
        );
      }

      // ✅ Clear authentication cookies
      cookies.clearAuthCookies(res);

      res.json({
        success: true,
        message: "ออกจากระบบสำเร็จ",
      });
    } catch (error) {
      console.error("💥 Logout error:", error);
      
      // ✅ ถึงจะ error ก็ต้อง clear cookies
      cookies.clearAuthCookies(res);
      
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  };

  // ---------------- Logout All ----------------
  const logoutAllUser = async (req, res) => {
    try {
      await service.logoutAll(req.user.user_id);

      // ✅ Clear authentication cookies
      cookies.clearAuthCookies(res);

      res.json({
        success: true,
        message: "ออกจากระบบทุกอุปกรณ์สำเร็จ",
      });
    } catch (error) {
      console.error("💥 Logout all error:", error);
      
      // ✅ ถึงจะ error ก็ต้อง clear cookies
      cookies.clearAuthCookies(res);
      
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };

  // ---------------- Google Auth Callback ----------------
  const googleAuthCallback = async (req, res) => {
    try {
      const user = req.user;
      const result = await service.googleAuthCallback(user);

      // ✅ Set HTTP-Only cookies สำหรับ tokens
      cookies.setAuthCookies(res, result.accessToken, result.refreshToken);

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      // ✅ ไม่ส่ง tokens ใน URL อีกต่อไป - ใช้ cookies แทน (ปลอดภัยกว่า)
      res.redirect(`${frontendUrl}/auth/callback?oauth=success`);
    } catch (error) {
      console.error("💥 Google Auth Callback error:", error);
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }
  };

  return {
    registerUser,
    loginUser,
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
    googleAuthCallback
  };
};

// Create default instance for backward compatibility
const defaultController = createAuthController();

export const registerUser = defaultController.registerUser;
export const loginUser = defaultController.loginUser;
export const refreshToken = defaultController.refreshToken;
export const getProfile = defaultController.getProfile;
export const forgotPassword = defaultController.forgotPassword;
export const verifyResetToken = defaultController.verifyResetToken;
export const resetPassword = defaultController.resetPassword;
export const changeEmail = defaultController.changeEmail;
export const changePassword = defaultController.changePassword;
export const updateProfile = defaultController.updateProfile;
export const logoutUser = defaultController.logoutUser;
export const logoutAllUser = defaultController.logoutAllUser;
export const googleAuthCallback = defaultController.googleAuthCallback;