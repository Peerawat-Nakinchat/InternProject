// src/controllers/AuthController.js
import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";
import crypto from "crypto";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/token.js";
import { UserModel } from "../models/UserModel.js";
import { MemberModel } from "../models/MemberModel.js";
import nodemailer from "nodemailer";
import { securityLogger } from "../utils/logger.js";
import { recordFailedLogin, clearFailedLogins } from "../middleware/securityMonitoring.js";

// ลงทะเบียนผู้ใช้ใหม่
export const registerUser = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      email,
      password,
      name,
      surname,
      sex,
      user_address_1,
      user_address_2,
      user_address_3,
    } = req.body;

    console.log("📝 Register attempt:", { email, name, surname });

    if (
      !email ||
      !password ||
      !name ||
      !surname ||
      !sex ||
      !user_address_1 ||
      !user_address_2 ||
      !user_address_3
    ) {
      return res.status(400).json({
        success: false,
        error: "กรุณากรอกข้อมูลที่จำเป็น (email, password, name, surname)",
      });
    }

    // ตรวจสอบอีเมลซ้ำ
    const checkEmail = await client.query(
      "SELECT user_id FROM sys_users WHERE email = $1",
      [email]
    );

    if (checkEmail.rows.length > 0) {
      console.log("⚠️ Email already exists:", email);
      const clientInfo = req.clientInfo || {};
      securityLogger.registrationFailed(
        email,
        clientInfo.ipAddress || req.ip,
        clientInfo.userAgent || req.headers['user-agent'],
        'Email already exists'
      );
      // Generic error to prevent enumeration
      return res.status(400).json({
        success: false,
        error: "ไม่สามารถลงทะเบียนได้ กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(
      parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10
    );
    const hashedPassword = await bcrypt.hash(password, salt);

    console.log("🔐 Password hashed successfully");

    // เพิ่มข้อมูลผู้ใช้
    const result = await client.query(
      `INSERT INTO sys_users (
                email, password_hash, name, surname, full_name, sex,
                user_address_1, user_address_2, user_address_3, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            RETURNING user_id, email, name, surname, full_name, sex, user_address_1, user_address_2, user_address_3, role_id, is_active, profile_image_url`,
      [
        email,
        hashedPassword,
        name,
        surname,
        `${name} ${surname}`,
        sex || "O",
        user_address_1 || "",
        user_address_2 || "",
        user_address_3 || "",
      ]
    );

    const user = result.rows[0];
    console.log("✅ User created:", user.user_id);

    // Log successful registration
    const clientInfo = req.clientInfo || {};
    securityLogger.registrationSuccess(
      user.user_id,
      user.email,
      clientInfo.ipAddress || req.ip,
      clientInfo.userAgent || req.headers['user-agent']
    );

    // สร้าง tokens
    const accessToken = generateAccessToken(user.user_id);
    const refreshToken = generateRefreshToken(user.user_id);

    console.log("🎫 Tokens generated");

    // บันทึก refresh token
    await client.query(
      `INSERT INTO sys_refresh_tokens (user_id, refresh_token, created_at)
             VALUES ($1, $2, NOW())`,
      [user.user_id, refreshToken]
    );

    console.log("✅ Register successful:", user.email);

    // Handle Invite Token
    const { inviteToken } = req.body;
    if (inviteToken) {
      try {
        console.log("🎫 Processing invite token during registration...");
        const payload = verifyRefreshToken(inviteToken);
        if (payload && payload.org_id && payload.role_id) {
          console.log("🤝 Accepting invitation for new user:", user.user_id);
          await MemberModel.addMemberToOrganization(
            client,
            payload.org_id,
            user.user_id,
            parseInt(payload.role_id, 10)
          );
          console.log("✅ Member added via invite token");
        } else {
          console.log("⚠️ Invalid or expired invite token ignored");
        }
      } catch (inviteError) {
        console.error("❌ Error processing invite token:", inviteError);
      }
    }

    res.status(201).json({
      success: true,
      message: "ลงทะเบียนสำเร็จ",
      accessToken,
      refreshToken,
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        full_name: user.full_name,
      },
    });
  } catch (error) {
    console.error("💥 Register error:", error);
    res.status(500).json({
      success: false,
      error: "เกิดข้อผิดพลาดในการลงทะเบียน: " + error.message,
    });
  } finally {
    client.release();
  }
};

// เข้าสู่ระบบ
export const loginUser = async (req, res) => {
  const client = await pool.connect();

  try {
    const { email, password } = req.body;

    console.log("🔐 Login attempt:", { email });

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "กรุณากรอกอีเมลและรหัสผ่าน",
      });
    }

    // ดึงข้อมูลผู้ใช้
    const result = await client.query(
      `SELECT user_id, email, password_hash, name, surname, full_name, is_active,
              sex, user_address_1, user_address_2, user_address_3, role_id, profile_image_url
             FROM sys_users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      console.log("⚠️ User not found:", email);
      const clientInfo = req.clientInfo || {};
      const ip = clientInfo.ipAddress || req.ip;
      securityLogger.loginFailed(
        email,
        ip,
        clientInfo.userAgent || req.headers['user-agent'],
        'User not found'
      );
      recordFailedLogin(ip);
      // Generic error message to prevent enumeration
      return res.status(401).json({
        success: false,
        error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    const user = result.rows[0];

    // ตรวจสอบว่า account active หรือไม่
    if (user.is_active === false) {
      console.log("⚠️ Account inactive:", email);
      const clientInfo = req.clientInfo || {};
      const ip = clientInfo.ipAddress || req.ip;
      securityLogger.loginFailed(
        email,
        ip,
        clientInfo.userAgent || req.headers['user-agent'],
        'Account inactive'
      );
      recordFailedLogin(ip);
      // Generic error message to prevent enumeration
      return res.status(401).json({
        success: false,
        error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    // ตรวจสอบว่ามี password_hash หรือไม่
    if (!user.password_hash) {
      console.error("❌ User has no password_hash:", email);
      const clientInfo = req.clientInfo || {};
      const ip = clientInfo.ipAddress || req.ip;
      securityLogger.loginFailed(
        email,
        ip,
        clientInfo.userAgent || req.headers['user-agent'],
        'No password hash'
      );
      recordFailedLogin(ip);
      // Generic error message to prevent enumeration
      return res.status(401).json({
        success: false,
        error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    // เปรียบเทียบ password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    console.log("🔑 Password check:", isPasswordValid ? "Valid" : "Invalid");

    if (!isPasswordValid) {
      const clientInfo = req.clientInfo || {};
      const ip = clientInfo.ipAddress || req.ip;
      securityLogger.loginFailed(
        email,
        ip,
        clientInfo.userAgent || req.headers['user-agent'],
        'Invalid password'
      );
      recordFailedLogin(ip);
      return res.status(401).json({
        success: false,
        error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    // สร้าง tokens
    const accessToken = generateAccessToken(user.user_id);
    const refreshToken = generateRefreshToken(user.user_id);

    console.log("🎫 Tokens generated");

    // บันทึก refresh token
    await client.query(
      `INSERT INTO sys_refresh_tokens (user_id, refresh_token, created_at)
             VALUES ($1, $2, NOW())`,
      [user.user_id, refreshToken]
    );

    console.log("✅ Login successful:", user.email);

    // Log successful login and clear failed attempts
    const clientInfo = req.clientInfo || {};
    const ip = clientInfo.ipAddress || req.ip;
    securityLogger.loginSuccess(
      user.user_id,
      user.email,
      ip,
      clientInfo.userAgent || req.headers['user-agent']
    );
    clearFailedLogins(ip);

    res.json({
      success: true,
      message: "เข้าสู่ระบบสำเร็จ",
      accessToken,
      refreshToken,
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        full_name: user.full_name,
        sex: user.sex,
        user_address_1: user.user_address_1,
        user_address_2: user.user_address_2,
        user_address_3: user.user_address_3,
        role_id: user.role_id,
        profile_image_url: user.profile_image_url,
      },
    });
  } catch (error) {
    console.error("💥 Login error:", error);
    res.status(500).json({
      success: false,
      error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ: " + error.message,
    });
  } finally {
    client.release();
  }
};

// Refresh Token
export const refreshToken = async (req, res) => {
  const client = await pool.connect();

  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "ไม่พบ Refresh Token",
      });
    }

    // Verify refresh token
    const { verifyRefreshToken } = await import("../utils/token.js");
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Refresh Token ไม่ถูกต้อง",
      });
    }

    // Check if token exists in database
    const result = await client.query(
      "SELECT * FROM sys_refresh_tokens WHERE refresh_token = $1 AND user_id = $2",
      [refreshToken, decoded.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Refresh Token ไม่ถูกต้อง",
      });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(decoded.user_id);

    res.json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(401).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการ refresh token",
    });
  } finally {
    client.release();
  }
};

// ดึง Profile
export const getProfile = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.user_id;

    const result = await client.query(
      `SELECT user_id, email, name, surname, full_name, created_at, updated_at, sex,
              user_address_1, user_address_2, user_address_3, role_id, is_active, profile_image_url
             FROM sys_users WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "ไม่พบข้อมูลผู้ใช้",
      });
    }

    res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      error: "เกิดข้อผิดพลาดในการดึงข้อมูล",
    });
  } finally {
    client.release();
  }
};

// เปลี่ยนเฉพาะฟังก์ชัน forgotPassword ใน AuthController.js

export const forgotPassword = async (req, res) => {
  const client = await pool.connect();

  try {
    const { email } = req.body;

    console.log("🔔 Forgot password request for:", email);

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "กรุณากรอกอีเมล",
      });
    }

    const user = await UserModel.findByEmail(email);

    // Log password reset request
    const clientInfo = req.clientInfo || {};
    securityLogger.passwordResetRequest(
      email,
      clientInfo.ipAddress || req.ip,
      clientInfo.userAgent || req.headers['user-agent'],
      !!user
    );

    // ป้องกัน brute-force (ตอบแบบเดียวกันไม่ว่าจะมี user หรือไม่)
    if (!user) {
      console.log("⚠️ Email not found but returning success:", email);
      return res.json({
        success: true,
        message: "ถ้ามีอีเมลนี้ในระบบ จะส่งลิงก์รีเซ็ตรหัสผ่านให้",
      });
    }

    // สร้าง token
    const token = crypto.randomUUID();
    const expire = new Date(Date.now() + 1000 * 60 * 15); // 15 นาที

    await UserModel.setResetToken(user.user_id, token, expire);

    console.log("🔑 Reset token created:", { user_id: user.user_id, token });

    // ตั้งค่า transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // true for 465
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // ทดสอบการเชื่อมต่อ
    try {
      await transporter.verify();
      console.log("✅ Email server connection verified");
    } catch (verifyError) {
      console.error("❌ Email server connection failed:", verifyError);
      throw new Error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์อีเมลได้");
    }

    // ส่งอีเมล
    const link = `${process.env.FRONTEND_URL}/login?token=${token}`;

    const mailOptions = {
      from: process.env.MAIL_USER,
      to: email,
      subject: "รีเซ็ตรหัสผ่าน",
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #9333ea;">รีเซ็ตรหัสผ่าน</h2>
                    <p>คุณได้ร้องขอรีเซ็ตรหัสผ่าน</p>
                    <p>คลิกที่ลิงก์ด้านล่างเพื่อเปลี่ยนรหัสผ่าน:</p>
                    <a href="${link}" style="display: inline-block; padding: 12px 24px; background-color: #9333ea; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                        รีเซ็ตรหัสผ่าน
                    </a>
                    <p style="color: #666; font-size: 14px;">ลิงก์นี้จะหมดอายุภายใน 15 นาที</p>
                    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
                    <p style="color: #999; font-size: 12px;">หากคุณไม่ได้ร้องขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยอีเมลนี้</p>
                </div>
            `,
    };

    console.log("📧 Sending email to:", email);

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent successfully:", info.messageId);

    res.json({
      success: true,
      message: "ส่งอีเมลรีเซ็ตรหัสผ่านแล้ว",
    });
  } catch (err) {
    console.error("💥 Forgot password error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "เกิดข้อผิดพลาดในการส่งอีเมล",
    });
  } finally {
    client.release();
  }
};

// แทนที่ฟังก์ชัน verifyResetToken และ resetPassword ใน AuthController.js

export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.query;

    console.log("🔍 Verify reset token request:", token);

    if (!token) {
      console.log("❌ No token provided");
      return res.status(400).json({
        success: false,
        valid: false,
        error: "token หาย",
      });
    }

    const user = await UserModel.findByResetToken(token);

    if (!user) {
      console.log("❌ Token not found or expired");
      return res.status(400).json({
        success: false,
        valid: false,
        error: "token ไม่ถูกต้องหรือหมดอายุ",
      });
    }

    console.log("✅ Token is valid for user:", user.user_id);

    return res.json({
      success: true,
      valid: true,
    });
  } catch (error) {
    console.error("💥 Verify reset token error:", error);
    res.status(500).json({
      success: false,
      valid: false,
      error: error.message,
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    console.log("🔒 Reset password request for token:", token);

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: "ข้อมูลไม่ครบ",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
      });
    }

    const user = await UserModel.findByResetToken(token);

    if (!user) {
      console.log("❌ Token not found or expired");
      return res.status(400).json({
        success: false,
        error: "token ไม่ถูกต้อง หรือหมดอายุ",
      });
    }

    console.log("🔐 Resetting password for user:", user.user_id);

    const hash = await bcrypt.hash(password, 10);

    await UserModel.updatePassword(user.user_id, hash);

    console.log("✅ Password reset successful");

    // Log successful password reset
    const clientInfo = req.clientInfo || {};
    securityLogger.passwordResetSuccess(
      user.user_id,
      user.email,
      clientInfo.ipAddress || req.ip,
      clientInfo.userAgent || req.headers['user-agent']
    );

    res.json({
      success: true,
      message: "เปลี่ยนรหัสผ่านสำเร็จ",
    });
  } catch (error) {
    console.error("💥 Reset password error:", error);
    const clientInfo = req.clientInfo || {};
    securityLogger.passwordResetFailed(
      req.body?.email || 'unknown',
      clientInfo.ipAddress || req.ip,
      clientInfo.userAgent || req.headers['user-agent'],
      error.message
    );
    res.status(500).json({
      success: false,
      error: error.message || "เกิดข้อผิดพลาด",
    });
  }
};

// ********** ฟังก์ชันสำหรับเปลี่ยนอีเมล **********
export const changeEmail = async (req, res) => {
  const client = await pool.connect();
  try {
    const { newEmail, password } = req.body;
    const userId = req.user.user_id; // ได้มาจาก protect middleware

    console.log("📧 Change email request for:", userId, "New email:", newEmail);

    if (!newEmail || !password) {
      return res.status(400).json({
        success: false,
        error: "กรุณากรอกอีเมลใหม่และรหัสผ่านเพื่อยืนยัน",
      });
    }

    // 1. ดึงข้อมูลผู้ใช้และตรวจสอบรหัสผ่าน
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "ไม่พบข้อมูลผู้ใช้",
      });
    }

    // ดึง password_hash จาก DB (findById ใน UserModel อาจจะไม่ได้ดึงมา)
    // ดังนั้นต้องใช้ findByEmail หรือดึงตรง
    const result = await client.query(
        `SELECT password_hash FROM sys_users WHERE user_id = $1`,
        [userId]
    );

    const passwordHash = result.rows[0]?.password_hash;
    if (!passwordHash) {
        return res.status(401).json({
            success: false,
            error: "บัญชีนี้ไม่สามารถเปลี่ยนอีเมลได้",
        });
    }

    const isPasswordValid = await bcrypt.compare(password, passwordHash);

    if (!isPasswordValid) {
      console.log("❌ Invalid password for email change");
      return res.status(401).json({
        success: false,
        error: "รหัสผ่านไม่ถูกต้อง",
      });
    }

    // 2. ตรวจสอบอีเมลใหม่ซ้ำ
    const existingUser = await UserModel.findByEmail(newEmail);
    if (existingUser && existingUser.user_id !== userId) {
      console.log("⚠️ New email already in use:", newEmail);
      return res.status(409).json({
        success: false,
        error: "อีเมลใหม่นี้ถูกใช้งานแล้ว",
      });
    }

    // 3. อัปเดตอีเมล
    const updatedUser = await UserModel.updateEmail(userId, newEmail);

    res.json({
      success: true,
      message: "เปลี่ยนอีเมลสำเร็จ",
      user: {
          user_id: updatedUser.user_id,
          email: updatedUser.email,
      }
    });

  } catch (error) {
    console.error("💥 Change email error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "เกิดข้อผิดพลาดในการเปลี่ยนอีเมล",
    });
  } finally {
    client.release();
  }
};

// ********** ฟังก์ชันสำหรับเปลี่ยนรหัสผ่าน **********
export const changePassword = async (req, res) => {
  const client = await pool.connect();
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.user_id; // ได้มาจาก protect middleware

    console.log("🔒 Change password request for:", userId);

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "กรุณากรอกรหัสผ่านเดิมและรหัสผ่านใหม่",
      });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({
            success: false,
            error: "รหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร",
        });
    }

    // 1. ดึง password_hash จาก DB และตรวจสอบรหัสผ่านเดิม
    const result = await client.query(
        `SELECT password_hash FROM sys_users WHERE user_id = $1`,
        [userId]
    );

    const passwordHash = result.rows[0]?.password_hash;
    if (!passwordHash) {
        return res.status(401).json({
            success: false,
            error: "บัญชีนี้ไม่สามารถเปลี่ยนรหัสผ่านได้",
        });
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, passwordHash);

    if (!isPasswordValid) {
      console.log("❌ Invalid old password for change password");
      return res.status(401).json({
        success: false,
        error: "รหัสผ่านเดิมไม่ถูกต้อง",
      });
    }
    
    // 2. Hash รหัสผ่านใหม่
    const salt = await bcrypt.genSalt(
      parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10
    );
    const newHashedPassword = await bcrypt.hash(newPassword, salt);
    
    // 3. อัปเดตรหัสผ่าน
    await UserModel.updatePassword(userId, newHashedPassword);
    
    // 4. ลบ refresh token ทั้งหมด (เพื่อบังคับ log out จากทุกอุปกรณ์)
    await client.query("DELETE FROM sys_refresh_tokens WHERE user_id = $1", [
      userId,
    ]);

    res.json({
      success: true,
      message: "เปลี่ยนรหัสผ่านสำเร็จ คุณต้องเข้าสู่ระบบใหม่",
    });

  } catch (error) {
    console.error("💥 Change password error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน",
    });
  } finally {
    client.release();
  }
};

export const updateProfile = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.user_id; // ได้มาจาก protect middleware
    const dataToUpdate = req.body;

    console.log("✏️ Profile update request for:", userId, "Data:", dataToUpdate);

    // ตรวจสอบข้อมูลที่จำเป็นสำหรับการอัปเดตที่สำคัญ (ชื่อ/นามสกุล)
    if (!dataToUpdate.name || !dataToUpdate.surname) {
      return res.status(400).json({
        success: false,
        error: "กรุณากรอกชื่อและนามสกุล",
      });
    }
    
    // เตรียมข้อมูล Full Name ใหม่ (สำคัญ)
    dataToUpdate.full_name = `${dataToUpdate.name} ${dataToUpdate.surname}`;

    // อัปเดตข้อมูล
    const updatedUser = await UserModel.updateProfile(userId, dataToUpdate);
    
    // ลบ password_hash ออกก่อนส่งกลับ
    delete updatedUser.password_hash; 

    res.json({
      success: true,
      message: "บันทึกข้อมูลสำเร็จ",
      user: updatedUser,
    });
  } catch (error) {
    console.error("💥 Update profile error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "เกิดข้อผิดพลาดในการอัปเดตข้อมูล",
    });
  } finally {
    client.release();
  }
};

// Logout
export const logoutUser = async (req, res) => {
  const client = await pool.connect();

  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: "ไม่พบ refresh token",
      });
    }

    await client.query(
      "DELETE FROM sys_refresh_tokens WHERE refresh_token = $1",
      [refreshToken]
    );

    // Log logout
    const clientInfo = req.clientInfo || {};
    if (req.user) {
      securityLogger.logout(
        req.user.user_id,
        clientInfo.ipAddress || req.ip,
        clientInfo.userAgent || req.headers['user-agent']
      );
    }

    res.json({
      success: true,
      message: "ออกจากระบบสำเร็จ",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      error: "เกิดข้อผิดพลาดในการออกจากระบบ",
    });
  } finally {
    client.release();
  }
};

// Logout ทุกอุปกรณ์
export const logoutAllUser = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.user_id;

    await client.query("DELETE FROM sys_refresh_tokens WHERE user_id = $1", [
      userId,
    ]);

    res.json({
      success: true,
      message: "ออกจากระบบทุกอุปกรณ์สำเร็จ",
    });
  } catch (error) {
    console.error("Logout all error:", error);
    res.status(500).json({
      success: false,
      error: "เกิดข้อผิดพลาดในการออกจากระบบ",
    });
  } finally {
    client.release();
  }
};

// Google Auth Callback
export const googleAuthCallback = async (req, res) => {
  const client = await pool.connect();
  try {
    const user = req.user; // User from passport strategy

    // Generate tokens
    const accessToken = generateAccessToken(user.user_id);
    const refreshToken = generateRefreshToken(user.user_id);

    // Save refresh token
    await client.query(
      `INSERT INTO sys_refresh_tokens (user_id, refresh_token, created_at)
             VALUES ($1, $2, NOW())`,
      [user.user_id, refreshToken]
    );

    // Redirect to frontend with tokens
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`
    );
  } catch (error) {
    console.error("Google Auth Callback error:", error);
    res.redirect(
      `${
        process.env.FRONTEND_URL || "http://localhost:5173"
      }/login?error=google_auth_failed`
    );
  } finally {
    client.release();
  }
};
