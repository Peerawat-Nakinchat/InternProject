// src/controllers/AuthController.js
import bcrypt from "bcrypt";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { UserModel } from "../models/UserModel.js";
import { MemberModel } from "../models/MemberModel.js";
import { RefreshTokenModel } from "../models/TokenModel.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/token.js";
import { securityLogger } from "../utils/logger.js";
import { recordFailedLogin, clearFailedLogins } from "../middleware/securityMonitoring.js";
import { Op } from "sequelize";


// ---------------- Register ----------------
export const registerUser = async (req, res) => {
  try {
    let { email, password, name, surname, sex, user_address_1, user_address_2, user_address_3, inviteToken } = req.body;

    // Basic validation
    if (!email || !password || !name || !surname || !sex) {
      return res.status(400).json({ success: false, error: "กรุณากรอกข้อมูลที่จำเป็น" });
    }

    // Normalize and validate email safely
    if (typeof email !== 'string') {
      return res.status(400).json({ success: false, error: "รูปแบบอีเมลไม่ถูกต้อง" });
    }
    email = email.toLowerCase().trim();

    // Use service method names that exist
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      const clientInfo = req.clientInfo || {};
      securityLogger.registrationFailed(email, clientInfo.ipAddress || req.ip, clientInfo.userAgent || req.headers['user-agent'], 'Email already exists');
      return res.status(400).json({ success: false, error: "ไม่สามารถลงทะเบียนได้ กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง" });
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Use createUser service (not direct create) — matches your user service earlier
    const created = await UserModel.createUser({
      email,
      passwordHash: hashedPassword,
      name,
      surname,
      sex,
      user_address_1,
      user_address_2,
      user_address_3
    });

    // created is sanitized user JSON (per your createUser implementation)
    const userId = created.user_id;

    const clientInfo = req.clientInfo || {};
    securityLogger.registrationSuccess(userId, email, clientInfo.ipAddress || req.ip, clientInfo.userAgent || req.headers['user-agent']);

    const accessToken = generateAccessToken(userId);
    const refreshToken = generateRefreshToken(userId);

    // Debug log: ensure refreshToken is a string
    console.log('🔐 Generated refreshToken:', typeof refreshToken, refreshToken ? 'present' : 'MISSING');

    // Save refresh token using service API (positional args)
    await RefreshTokenModel.saveRefreshToken(userId, refreshToken);

    if (inviteToken) {
      try {
        const payload = verifyRefreshToken(inviteToken);
        if (payload && payload.org_id && payload.role_id) {
          await MemberModel.addMemberToOrganization(payload.org_id, userId, parseInt(payload.role_id, 10));
        }
      } catch (inviteError) {
        console.error("❌ Invite token error:", inviteError);
      }
    }

    res.status(201).json({
      success: true,
      message: "ลงทะเบียนสำเร็จ",
      accessToken,
      refreshToken,
      user: { user_id: userId, email, name, surname, full_name: `${name} ${surname}` },
    });
  } catch (error) {
    console.error("💥 Register error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------------- Login ----------------
export const loginUser = async (req, res) => {
  try {
    let { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: "กรุณากรอกอีเมลและรหัสผ่าน" });

    if (typeof email !== 'string') {
      return res.status(400).json({ success: false, error: "รูปแบบอีเมลไม่ถูกต้อง" });
    }
    email = email.toLowerCase().trim();

    // Use findByEmail(email) — not passing an object
    const user = await UserModel.findByEmail(email);

    const clientInfo = req.clientInfo || {};
    const ip = clientInfo.ipAddress || req.ip;

    if (!user || !user.password_hash || !user.is_active) {
      securityLogger.loginFailed(email, ip, clientInfo.userAgent || req.headers['user-agent'], 'Invalid login');
      recordFailedLogin(ip);
      return res.status(401).json({ success: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      securityLogger.loginFailed(email, ip, clientInfo.userAgent || req.headers['user-agent'], 'Invalid password');
      recordFailedLogin(ip);
      return res.status(401).json({ success: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    const accessToken = generateAccessToken(user.user_id);
    const refreshToken = generateRefreshToken(user.user_id);

    // Debug: ensure token present
    console.log('🔐 Generated refreshToken on login:', typeof refreshToken, refreshToken ? 'present' : 'MISSING');

    // Save refresh token correctly (positional args)
    await RefreshTokenModel.saveRefreshToken(user.user_id, refreshToken);

    securityLogger.loginSuccess(user.user_id, user.email, ip, clientInfo.userAgent || req.headers['user-agent']);
    clearFailedLogins(ip);

    // Remove sensitive fields before sending back (if user is a Sequelize instance)
    const safeUser = { user_id: user.user_id, email: user.email, name: user.name, surname: user.surname, full_name: user.full_name, role: user.role };

    res.json({ success: true, message: "เข้าสู่ระบบสำเร็จ", accessToken, refreshToken, user: safeUser });
  } catch (error) {
    console.error("💥 Login error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};


// ---------------- Refresh Token ----------------
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(401).json({ success: false, message: "ไม่พบ Refresh Token" });

    const decoded = verifyRefreshToken(token);
    if (!decoded) return res.status(401).json({ success: false, message: "Refresh Token ไม่ถูกต้อง" });

    const stored = await RefreshTokenModel.findRefreshToken({ where: { refresh_token: token, user_id: decoded.user_id } });
    if (!stored) return res.status(401).json({ success: false, message: "Refresh Token ไม่ถูกต้อง" });

    const newAccessToken = generateAccessToken(decoded.user_id);
    res.json({ success: true, accessToken: newAccessToken });
  } catch (error) {
    console.error("💥 Refresh token error:", error);
    res.status(401).json({ success: false, message: error.message });
  }
};

// ---------------- Get Profile ----------------
export const getProfile = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.user_id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: "ไม่พบข้อมูลผู้ใช้" 
      });
    }

    // ✅ แก้: แปลง Sequelize Instance เป็น Plain Object
    const userJson = user.toJSON();
    
    // ลบฟิลด์ sensitive
    delete userJson.password_hash;
    delete userJson.reset_token;
    delete userJson.reset_token_expire;

    res.json({ success: true, user: userJson });
  } catch (error) {
    console.error("💥 Get profile error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------------- Forgot Password ----------------
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: "กรุณากรอกอีเมล" });

    const user = await UserModel.findByEmail({ where: { email } });
    const clientInfo = req.clientInfo || {};
    securityLogger.passwordResetRequest(email, clientInfo.ipAddress || req.ip, clientInfo.userAgent || req.headers['user-agent'], !!user);

    if (!user) return res.json({ success: true, message: "ถ้ามีอีเมลนี้ในระบบ จะส่งลิงก์รีเซ็ตรหัสผ่านให้" });

    const token = crypto.randomUUID();
    const expire = new Date(Date.now() + 1000 * 60 * 15); // 15 นาที
    await user.update({ reset_token: token, reset_token_expire: expire });

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
    });
    await transporter.verify();

    const link = `${process.env.FRONTEND_URL}/login?token=${token}`;
    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: email,
      subject: "รีเซ็ตรหัสผ่าน",
      html: `<a href="${link}">รีเซ็ตรหัสผ่าน</a>`,
    });

    res.json({ success: true, message: "ส่งอีเมลรีเซ็ตรหัสผ่านแล้ว" });
  } catch (error) {
    console.error("💥 Forgot password error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------------- Verify Reset Token ----------------
export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ 
        success: false, 
        valid: false, 
        error: "token หาย" 
      });
    }

    // ✅ แก้: ส่งแค่ token string
    const user = await UserModel.findByResetToken(token);
    
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        valid: false, 
        error: "token ไม่ถูกต้องหรือหมดอายุ" 
      });
    }

    res.json({ success: true, valid: true });
  } catch (error) {
    console.error("💥 Verify reset token error:", error);
    res.status(500).json({ 
      success: false, 
      valid: false, 
      error: error.message 
    });
  }
};

// ---------------- Reset Password ----------------
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ 
        success: false, 
        error: "ข้อมูลไม่ครบ" 
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" 
      });
    }

    // ✅ แก้: ส่งแค่ token string
    const user = await UserModel.findByResetToken(token);
    
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        error: "token ไม่ถูกต้อง หรือหมดอายุ" 
      });
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
    const hash = await bcrypt.hash(password, saltRounds);
    
    // ✅ ใช้ฟังก์ชัน updatePassword จาก UserModel
    await UserModel.updatePassword(user.user_id, hash);

    const clientInfo = req.clientInfo || {};
    securityLogger.passwordResetSuccess(
      user.user_id, 
      user.email, 
      clientInfo.ipAddress || req.ip, 
      clientInfo.userAgent || req.headers['user-agent']
    );

    res.json({ success: true, message: "เปลี่ยนรหัสผ่านสำเร็จ" });
  } catch (error) {
    console.error("💥 Reset password error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------------- Change Email ----------------
export const changeEmail = async (req, res) => {
  try {
    const { newEmail, password } = req.body;
    const user = await UserModel.findById(req.user.user_id);
    if (!user) return res.status(404).json({ success: false, error: "ไม่พบผู้ใช้" });
    const userWithPassword = await UserModel.findByEmail(user.email);

    if (!userWithPassword || !userWithPassword.password_hash) {
         return res.status(500).json({ success: false, error: "ไม่สามารถตรวจสอบรหัสผ่านได้" });
    }

    const isPasswordValid = await bcrypt.compare(password, userWithPassword.password_hash);
    if (!isPasswordValid) return res.status(401).json({ success: false, error: "รหัสผ่านไม่ถูกต้อง" });

    const existing = await UserModel.findByEmail(newEmail); // ✅ ส่ง string
    if (existing && existing.user_id !== user.user_id) {
        return res.status(409).json({ success: false, error: "อีเมลใหม่นี้ถูกใช้งานแล้ว" });
    }

    const updatedUser = await UserModel.updateEmail(user.user_id, newEmail);

    res.json({ 
        success: true, 
        message: "เปลี่ยนอีเมลสำเร็จ", 
        user: { 
            user_id: user.user_id, 
            email: newEmail // ✅ ส่งค่าใหม่กลับไปแสดงผล
        } 
    });

  } catch (error) {
    console.error("💥 Change email error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------------- Change Password ----------------
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    const user = await UserModel.findById(req.user.user_id);
    if (!user) return res.status(404).json({ success: false, error: "ไม่พบผู้ใช้" });
    const userWithPass = await UserModel.findByEmail(user.email);
    
    if (!userWithPass || !userWithPass.password_hash) {
         return res.status(500).json({ success: false, error: "ไม่สามารถตรวจสอบรหัสผ่านได้" });
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, userWithPass.password_hash);
    if (!isPasswordValid) return res.status(401).json({ success: false, error: "รหัสผ่านเดิมไม่ถูกต้อง" });

    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10);
    const newHashedPassword = await bcrypt.hash(newPassword, salt);

    await UserModel.updatePassword(user.user_id, newHashedPassword);

    await RefreshTokenModel.deleteAllTokensForUser(user.user_id);
    
    res.json({ success: true, message: "เปลี่ยนรหัสผ่านสำเร็จ คุณต้องเข้าสู่ระบบใหม่" });
  } catch (error) {
    console.error("💥 Change password error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------------- Update Profile ----------------
export const updateProfile = async (req, res) => {
  try {
    const dataToUpdate = req.body;
    
    // Validation
    if (!dataToUpdate.name || !dataToUpdate.surname) {
      return res.status(400).json({ 
        success: false, 
        error: "กรุณากรอกชื่อและนามสกุล" 
      });
    }

    // สร้าง full_name
    dataToUpdate.full_name = `${dataToUpdate.name} ${dataToUpdate.surname}`;

    // ✅ เรียกฟังก์ชัน updateProfile จาก UserModel (มันจะ return ข้อมูลที่ sanitized แล้ว)
    const updatedUser = await UserModel.updateProfile(
      req.user.user_id, 
      dataToUpdate
    );

    // ✅ ส่ง response กลับไปพร้อมข้อมูลที่อัปเดตแล้ว
    res.json({ 
      success: true, 
      message: "บันทึกข้อมูลสำเร็จ", 
      user: updatedUser 
    });
  } catch (error) {
    console.error("💥 Update profile error:", error);
    
    // ✅ จัดการ Validation Error จาก Sequelize
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message).join(', ');
      return res.status(400).json({ 
        success: false, 
        error: messages 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ---------------- Logout ----------------
export const logoutUser = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, error: "ไม่พบ refresh token" });

    await RefreshTokenModel.deleteRefreshToken(refreshToken);

    const clientInfo = req.clientInfo || {};
    if (req.user) securityLogger.logout(req.user.user_id, clientInfo.ipAddress || req.ip, clientInfo.userAgent || req.headers['user-agent']);

    res.json({ success: true, message: "ออกจากระบบสำเร็จ" });
  } catch (error) {
    console.error("💥 Logout error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------------- Logout All ----------------
export const logoutAllUser = async (req, res) => {
  try {
    await RefreshTokenModel.deleteAllTokensForUser(refreshToken);
    res.json({ success: true, message: "ออกจากระบบทุกอุปกรณ์สำเร็จ" });
  } catch (error) {
    console.error("💥 Logout all error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------------- Google Auth Callback ----------------
export const googleAuthCallback = async (req, res) => {
  try {
    const user = req.user;
    const accessToken = generateAccessToken(user.user_id);
    const refreshToken = generateRefreshToken(user.user_id);

    await RefreshTokenModel.create({ user_id: user.user_id, refresh_token: refreshToken });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
  } catch (error) {
    console.error("💥 Google Auth Callback error:", error);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
  }
};
