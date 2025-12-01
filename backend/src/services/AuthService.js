// src/services/AuthService.js
import bcrypt from "bcrypt";
import crypto from "crypto";
import { UserModel } from "../models/UserModel.js";
import { MemberModel } from "../models/MemberModel.js";
import { RefreshTokenModel } from "../models/TokenModel.js";
import { InvitationModel } from "../models/InvitationModel.js";
import InvitationService from "./InvitationService.js";
import { sequelize } from "../models/dbModels.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/token.js";
import { sendEmail } from "../utils/mailer.js";

/**
 * AuthService - จัดการ Business Logic ทั้งหมดเกี่ยวกับ Authentication
 */
class AuthService {
  /**
   * ลงทะเบียนผู้ใช้ใหม่
   */
  async register(userData) {
    const {
      email,
      password,
      name,
      surname,
      sex,
      user_address_1,
      user_address_2,
      user_address_3,
      inviteToken
    } = userData;

    // Validation
    if (!email || !password || !name || !surname || !sex) {
      throw new Error("กรุณากรอกข้อมูลที่จำเป็น");
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // ✅ ตรวจสอบ invite token ก่อน (ถ้ามี)
    let invitationInfo = null;
    if (inviteToken) {
      try {
        invitationInfo = await InvitationService.getInvitationInfo(inviteToken);

        // ตรวจสอบว่า email ตรงกันหรือไม่
        if (invitationInfo.email.toLowerCase() !== normalizedEmail) {
          throw new Error("อีเมลไม่ตรงกับคำเชิญ กรุณาใช้อีเมล " + invitationInfo.email);
        }
      } catch (error) {
        console.error("Invitation validation error:", error);
        throw error; // ⚠️ Throw error เพื่อไม่ให้ register ถ้า token ไม่ valid
      }
    }

    // Check existing user
    const existingUser = await UserModel.findByEmail(normalizedEmail);
    if (existingUser) {
      const error = new Error("ไม่สามารถลงทะเบียนได้ กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง");
      error.code = "USER_EXISTS";
      throw error;
    }

    // เริ่ม Transaction
    const t = await sequelize.transaction();

    try {
      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
      const salt = await bcrypt.genSalt(saltRounds);
      const hashedPassword = await bcrypt.hash(password, salt);

      // ✅ สร้าง User
      const created = await UserModel.create(
        {
          email: normalizedEmail,
          passwordHash: hashedPassword,
          name,
          surname,
          sex,
          user_address_1,
          user_address_2,
          user_address_3,
        },
        t // ✅ ถูกต้อง: ส่ง t ไปตรงๆ
      );

      const userId = created.user_id;

      // Generate tokens
      const accessToken = generateAccessToken(userId);
      const refreshToken = generateRefreshToken(userId);

      // Calculate expiration
      const expiresAt = new Date();
      const expiryDays = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN?.replace('d', '')) || 7;
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      // Save refresh token
      await RefreshTokenModel.create(
        {
          userId: userId,
          refreshToken: refreshToken,
          expiresAt: expiresAt
        },
        t // ✅ ถูกต้อง: ส่ง t ไปตรงๆ
      );

      // ✅ Process invite token if provided
      let orgId = null;
      if (inviteToken && invitationInfo) {
        try {
          // ส่ง transaction (t) ไปด้วย เพื่อให้มองเห็น User ที่เพิ่งสร้าง
          orgId = await this.processInviteToken(userId, inviteToken, invitationInfo, t);
          console.log('✅ Invitation accepted during registration:', orgId);
        } catch (error) {
          console.error("❌ Process invitation error:", error);
          // throw error เพื่อให้ rollback ทั้งหมดถ้า invite มีปัญหา (หรือจะ catch เพื่อให้ register ผ่านก็ได้ แล้วแต่ requirement)
          throw new Error("ไม่สามารถประมวลผลคำเชิญได้: " + error.message);
        }
      }

      // Commit transaction
      await t.commit();

      return {
        success: true,
        accessToken,
        refreshToken,
        user: {
          user_id: userId,
          email: normalizedEmail,
          name,
          surname,
          full_name: `${name} ${surname}`,
        },
        ...(orgId && { org_id: orgId }),
        ...(orgId && { invitation_accepted: true })
      };
    } catch (error) {
      console.error("Register transaction error:", error);
      // Rollback on error
      if (!t.finished) {
        await t.rollback();
      }
      throw error;
    }
  }

  /**
   * Process invitation token หลังสร้าง user
   */
  async processInviteToken(userId, inviteToken, invitationInfo, transaction) {
    try {
      const invitation = await InvitationModel.findByToken(inviteToken);

      if (!invitation || invitation.status !== 'pending') {
        throw new Error("Invitation is not valid or has been used");
      }

      // ✅ Add member to organization
      // แก้ไข: ส่ง transaction ไปตรงๆ ไม่ใส่ {} ครอบ
      await MemberModel.create({
        userId: userId,
        orgId: invitationInfo.org_id,
        roleId: parseInt(invitationInfo.role_id, 10),
      }, transaction);

      // ✅ Update invitation status
      await InvitationModel.updateStatus(
        invitationInfo.invitation_id,
        'accepted',
        transaction
      );

      console.log('✅ Member added and invitation accepted');
      return invitationInfo.org_id;
    } catch (error) {
      console.error("❌ Process invite token error:", error);
      throw error; // Throw เพื่อให้ parent function rollback
    }
  }

  /**
   * เข้าสู่ระบบ
   */
  async login(email, password) {
    if (!email || !password) {
      throw new Error("กรุณากรอกอีเมลและรหัสผ่าน");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await UserModel.findByEmailWithPassword(normalizedEmail);

    if (!user || !user.password_hash || !user.is_active) {
      throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.user_id);
    const refreshToken = generateRefreshToken(user.user_id);

    // Calculate expiration
    const expiresAt = new Date();
    const expiryDays = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN?.replace('d', '')) || 7;
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    // Save refresh token
    await RefreshTokenModel.create({
      userId: user.user_id,
      refreshToken: refreshToken,
      expiresAt: expiresAt
    });

    const safeUser = {
      user_id: user.user_id,
      email: user.email,
      name: user.name,
      surname: user.surname,
      full_name: user.full_name,
      role: user.role,
    };

    return { accessToken, refreshToken, user: safeUser };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    try {
      if (!refreshToken) {
        throw new Error('Refresh token is required');
      }

      // Verify the refresh token first
      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded || !decoded.user_id) {
        throw new Error('Invalid refresh token');
      }

      // Find token in database
      const tokenRecord = await RefreshTokenModel.findOne(refreshToken);

      if (!tokenRecord) {
        throw new Error('Invalid or expired refresh token');
      }

      // Get user info
      const user = await UserModel.findById(tokenRecord.user_id);

      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is active
      if (!user.is_active) {
        throw new Error('Account is deactivated');
      }

      // Generate new tokens
      const newAccessToken = generateAccessToken(user.user_id);
      const newRefreshToken = generateRefreshToken(user.user_id);

      // Calculate expiration
      const expiresAt = new Date();
      const expiryDays = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN?.replace('d', '')) || 7;
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      // Delete old token and save new one
      await RefreshTokenModel.deleteOne(refreshToken);
      await RefreshTokenModel.create({
        userId: user.user_id,
        refreshToken: newRefreshToken,
        expiresAt: expiresAt
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      console.error('Refresh token error:', error);
      throw error;
    }
  }

  /**
   * ขอรีเซ็ตรหัสผ่าน
   */
  async forgotPassword(email) {
    if (!email) {
      throw new Error("กรุณากรอกอีเมล");
    }

    const user = await UserModel.findByEmail(email);

    // Security: Always return success even if user doesn't exist
    if (!user) {
      return { success: true };
    }

    const token = crypto.randomUUID();
    const expire = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes

    await UserModel.setResetToken(user.user_id, token, expire);

    // Send email
    const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const html = `
      <h2>รีเซ็ตรหัสผ่าน</h2>
      <p>คุณได้ขอรีเซ็ตรหัสผ่าน กรุณาคลิกลิงก์ด้านล่างเพื่อดำเนินการต่อ:</p>
      <a href="${link}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">รีเซ็ตรหัสผ่าน</a>
      <p>ลิงก์นี้จะหมดอายุใน 15 นาที</p>
      <p>ถ้าคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยอีเมลนี้</p>
    `;

    await sendEmail(email, "รีเซ็ตรหัสผ่าน", html);

    return { success: true };
  }

  /**
   * ตรวจสอบ reset token
   */
  async verifyResetToken(token) {
    if (!token) {
      throw new Error("token หาย");
    }

    const user = await UserModel.findByResetToken(token);

    if (!user) {
      throw new Error("token ไม่ถูกต้องหรือหมดอายุ");
    }

    return { valid: true };
  }

  /**
   * รีเซ็ตรหัสผ่าน
   */
  async resetPassword(token, password) {
    if (!token || !password) {
      throw new Error("ข้อมูลไม่ครบ");
    }

    if (password.length < 6) {
      throw new Error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
    }

    const user = await UserModel.findByResetToken(token);

    if (!user) {
      throw new Error("token ไม่ถูกต้อง หรือหมดอายุ");
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
    const hash = await bcrypt.hash(password, saltRounds);

    await UserModel.updatePassword(user.user_id, hash);

    return { success: true };
  }

  /**
   * เปลี่ยนอีเมล
   */
  async changeEmail(userId, newEmail, password) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error("ไม่พบผู้ใช้");
    }

    const userWithPassword = await UserModel.findByEmailWithPassword(user.email);
    if (!userWithPassword || !userWithPassword.password_hash) {
      throw new Error("ไม่สามารถตรวจสอบรหัสผ่านได้");
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      userWithPassword.password_hash
    );
    if (!isPasswordValid) {
      throw new Error("รหัสผ่านไม่ถูกต้อง");
    }

    const existing = await UserModel.findByEmail(newEmail);
    if (existing && existing.user_id !== user.user_id) {
      throw new Error("อีเมลใหม่นี้ถูกใช้งานแล้ว");
    }

    await UserModel.updateEmail(user.user_id, newEmail);

    return {
      user_id: user.user_id,
      email: newEmail,
    };
  }

  /**
   * เปลี่ยนรหัสผ่าน
   */
  async changePassword(userId, oldPassword, newPassword) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error("ไม่พบผู้ใช้");
    }

    const userWithPass = await UserModel.findByEmailWithPassword(user.email);
    if (!userWithPass || !userWithPass.password_hash) {
      throw new Error("ไม่สามารถตรวจสอบรหัสผ่านได้");
    }

    const isPasswordValid = await bcrypt.compare(
      oldPassword,
      userWithPass.password_hash
    );
    if (!isPasswordValid) {
      throw new Error("รหัสผ่านเดิมไม่ถูกต้อง");
    }

    const salt = await bcrypt.genSalt(
      parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10
    );
    const newHashedPassword = await bcrypt.hash(newPassword, salt);

    await UserModel.updatePassword(user.user_id, newHashedPassword);

    // Revoke all refresh tokens
    await RefreshTokenModel.deleteAllByUser(user.user_id);

    return { success: true };
  }

  /**
   * อัพเดทโปรไฟล์
   */
  async updateProfile(userId, data) {
    // Trim strings
    for (const key in data) {
      if (typeof data[key] === "string") {
        data[key] = data[key].trim();
      }
    }

    // ✅ กรองเฉพาะ field ที่มีค่าจริงๆ
    const cleanData = {};
    for (const key in data) {
      if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
        cleanData[key] = data[key];
      }
    }

    // Validation
    if (cleanData.name !== undefined && cleanData.name === "") {
      throw new Error("ชื่อต้องไม่เป็นค่าว่าง");
    }
    if (cleanData.surname !== undefined && cleanData.surname === "") {
      throw new Error("นามสกุลต้องไม่เป็นค่าว่าง");
    }

    // Update full_name if needed
    if (cleanData.name || cleanData.surname) {
      const currentUser = await UserModel.findById(userId);
      const newName = cleanData.name || currentUser.name;
      const newSurname = cleanData.surname || currentUser.surname;
      cleanData.full_name = `${newName} ${newSurname}`;
    }

    try {
      const updatedUser = await UserModel.updateProfile(userId, cleanData);
      return updatedUser;
    } catch (error) {
      console.error("🔥 UPDATE FAILED:", error.message);
      if (error.errors) {
        error.errors.forEach(e => console.error(`   - ${e.path}: ${e.message}`));
      }
      throw error;
    }
  }

  /**
   * ออกจากระบบ
   */
  async logout(refreshToken) {
    if (!refreshToken) {
      throw new Error("ไม่พบ refresh token");
    }

    await RefreshTokenModel.deleteOne(refreshToken);
    return { success: true };
  }

  /**
   * ออกจากระบบทุกอุปกรณ์
   */
  async logoutAll(userId) {
    await RefreshTokenModel.deleteAllByUser(userId);
    return { success: true };
  }

  /**
   * ดึงข้อมูลโปรไฟล์
   */
  async getProfile(userId) {
    const user = await UserModel.findById(userId);

    if (!user) {
      throw new Error("ไม่พบข้อมูลผู้ใช้");
    }

    const userJson = user.toJSON();

    // Remove sensitive fields
    delete userJson.password_hash;
    delete userJson.reset_token;
    delete userJson.reset_token_expire;

    return userJson;
  }

  /**
   * Google OAuth callback
   */
  async googleAuthCallback(user) {
    const accessToken = generateAccessToken(user.user_id);
    const refreshToken = generateRefreshToken(user.user_id);

    // Calculate expiration
    const expiresAt = new Date();
    const expiryDays = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN?.replace('d', '')) || 7;
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    await RefreshTokenModel.create({
      userId: user.user_id,
      refreshToken: refreshToken,
      expiresAt: expiresAt
    });

    return { accessToken, refreshToken };
  }
}
export default new AuthService();