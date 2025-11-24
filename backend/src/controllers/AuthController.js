// src/controllers/AuthController.js
import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";

// ลงทะเบียนผู้ใช้ใหม่
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
      inviteToken,
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

    // Use AuthService to register (handles duplicate email check, hashing, and invitation)
    const { register } = await import("../services/AuthService.js");
    const user = await register({
      email,
      password,
      name,
      surname,
      sex,
      user_address_1,
      user_address_2,
      user_address_3,
      inviteToken,
    });

    console.log("✅ User created:", user.user_id);

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
    const status = error.code === "USER_EXISTS" ? 400 : 500;
    res.status(status).json({
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
      `SELECT user_id, email, password_hash, name, surname, full_name, is_active
             FROM sys_users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      console.log("⚠️ User not found:", email);
      return res.status(401).json({
        success: false,
        error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    const user = result.rows[0];

    // ตรวจสอบว่า account active หรือไม่
    if (user.is_active === false) {
      console.log("⚠️ Account inactive:", email);
      return res.status(401).json({
        success: false,
        error: "บัญชีนี้ถูกระงับการใช้งาน",
      });
    }

    // ตรวจสอบว่ามี password_hash หรือไม่
    if (!user.password_hash) {
      console.error("❌ User has no password_hash:", email);
      return res.status(401).json({
        success: false,
        error: "บัญชีนี้ไม่สามารถเข้าสู่ระบบได้",
      });
    }

    // เปรียบเทียบ password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    console.log("🔑 Password check:", isPasswordValid ? "Valid" : "Invalid");

    if (!isPasswordValid) {
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
      `SELECT user_id, email, name, surname, full_name, created_at
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
