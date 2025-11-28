// src/controllers/AuthController.js
import AuthService from "../services/AuthService.js";
import { securityLogger } from "../utils/logger.js";
import { recordFailedLogin, clearFailedLogins } from "../middleware/securityMonitoring.js";

// ---------------- Register ----------------
export const registerUser = async (req, res) => {
  try {
    const result = await AuthService.register(req.body);

    const clientInfo = req.clientInfo || {};
    securityLogger.registrationSuccess(
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
      securityLogger.registrationFailed(
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
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);

    const clientInfo = req.clientInfo || {};
    const ip = clientInfo.ipAddress || req.ip;

    securityLogger.loginSuccess(
      result.user.user_id,
      result.user.email,
      ip,
      clientInfo.userAgent || req.headers["user-agent"]
    );
    clearFailedLogins(ip);

    res.json({
      success: true,
      message: "เข้าสู่ระบบสำเร็จ",
      ...result,
    });
  } catch (error) {
    console.error("💥 Login error:", error);

    const clientInfo = req.clientInfo || {};
    const ip = clientInfo.ipAddress || req.ip;

    securityLogger.loginFailed(
      req.body.email,
      ip,
      clientInfo.userAgent || req.headers["user-agent"],
      "Invalid login"
    );
    recordFailedLogin(ip);

    res.status(401).json({
      success: false,
      error: error.message,
    });
  }
};

// ---------------- Refresh Token ----------------
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    const result = await AuthService.refreshToken(token);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("💥 Refresh token error:", error);
    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

// ---------------- Get Profile ----------------
export const getProfile = async (req, res) => {
  try {
    const user = await AuthService.getProfile(req.user.user_id);

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
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    await AuthService.forgotPassword(email);

    const clientInfo = req.clientInfo || {};
    securityLogger.passwordResetRequest(
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
export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.query;
    const result = await AuthService.verifyResetToken(token);

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
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    await AuthService.resetPassword(token, password);

    const clientInfo = req.clientInfo || {};
    // Note: We don't have user_id here, so we can't log it
    securityLogger.passwordResetSuccess(
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
export const changeEmail = async (req, res) => {
  try {
    const { newEmail, password } = req.body;
    const result = await AuthService.changeEmail(
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
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    await AuthService.changePassword(req.user.user_id, oldPassword, newPassword);

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
export const updateProfile = async (req, res) => {
  try {
    const updatedUser = await AuthService.updateProfile(
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
export const logoutUser = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    await AuthService.logout(refreshToken);

    const clientInfo = req.clientInfo || {};
    if (req.user) {
      securityLogger.logout(
        req.user.user_id,
        clientInfo.ipAddress || req.ip,
        clientInfo.userAgent || req.headers["user-agent"]
      );
    }

    res.json({
      success: true,
      message: "ออกจากระบบสำเร็จ",
    });
  } catch (error) {
    console.error("💥 Logout error:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// ---------------- Logout All ----------------
export const logoutAllUser = async (req, res) => {
  try {
    await AuthService.logoutAll(req.user.user_id);

    res.json({
      success: true,
      message: "ออกจากระบบทุกอุปกรณ์สำเร็จ",
    });
  } catch (error) {
    console.error("💥 Logout all error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// ---------------- Google Auth Callback ----------------
export const googleAuthCallback = async (req, res) => {
  try {
    const user = req.user;
    const result = await AuthService.googleAuthCallback(user);

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`
    );
  } catch (error) {
    console.error("💥 Google Auth Callback error:", error);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
  }
};