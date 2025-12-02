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
 * Factory for AuthService
 */
export const createAuthService = (deps = {}) => {
  // Inject Dependencies (Default to real implementations)
  const User = deps.UserModel || UserModel;
  const Member = deps.MemberModel || MemberModel;
  const Token = deps.RefreshTokenModel || RefreshTokenModel;
  const Invitation = deps.InvitationModel || InvitationModel;
  const InviteService = deps.InvitationService || InvitationService;
  const db = deps.sequelize || sequelize;
  const hasher = deps.bcrypt || bcrypt;
  const random = deps.crypto || crypto;
  const mailer = deps.sendEmail || sendEmail;
  const tokenUtils = deps.tokenUtils || {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken
  };
  const env = deps.env || process.env; // Inject process.env for easier testing

  // --- Internal Helper ---
  const processInviteToken = async (userId, inviteToken, invitationInfo, transaction) => {
    try {
      const invitation = await Invitation.findByToken(inviteToken);

      if (!invitation || invitation.status !== 'pending') {
        throw new Error("Invitation is not valid or has been used");
      }

      await Member.create({
        userId: userId,
        orgId: invitationInfo.org_id,
        roleId: parseInt(invitationInfo.role_id, 10),
      }, transaction);

      await Invitation.updateStatus(
        invitationInfo.invitation_id,
        'accepted',
        transaction
      );

      console.log('✅ Member added and invitation accepted');
      return invitationInfo.org_id;
    } catch (error) {
      console.error("❌ Process invite token error:", error);
      throw error;
    }
  };

  // --- Main Methods ---

  const register = async (userData) => {
    const {
      email, password, name, surname, sex,
      user_address_1, user_address_2, user_address_3, inviteToken
    } = userData;

    if (!email || !password || !name || !surname || !sex) {
      throw new Error("กรุณากรอกข้อมูลที่จำเป็น");
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check invite token validity first
    let invitationInfo = null;
    if (inviteToken) {
      try {
        invitationInfo = await InviteService.getInvitationInfo(inviteToken);
        if (invitationInfo.email.toLowerCase() !== normalizedEmail) {
          throw new Error("อีเมลไม่ตรงกับคำเชิญ กรุณาใช้อีเมล " + invitationInfo.email);
        }
      } catch (error) {
        console.error("Invitation validation error:", error);
        throw error;
      }
    }

    const existingUser = await User.findByEmail(normalizedEmail);
    if (existingUser) {
      const error = new Error("ไม่สามารถลงทะเบียนได้ กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง");
      error.code = "USER_EXISTS";
      throw error;
    }

    const t = await db.transaction();

    try {
      const saltRounds = parseInt(env.BCRYPT_SALT_ROUNDS, 10) || 10;
      const salt = await hasher.genSalt(saltRounds);
      const hashedPassword = await hasher.hash(password, salt);

      const created = await User.create(
        {
          email: normalizedEmail,
          passwordHash: hashedPassword,
          name, surname, sex,
          user_address_1, user_address_2, user_address_3,
        },
        t
      );

      const userId = created.user_id;
      const accessToken = tokenUtils.generateAccessToken(userId);
      const refreshToken = tokenUtils.generateRefreshToken(userId);

      const expiresAt = new Date();
      const expiryDays = parseInt(env.REFRESH_TOKEN_EXPIRES_IN?.replace('d', '')) || 7;
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      await Token.create(
        { userId, refreshToken, expiresAt },
        t
      );

      let orgId = null;
      if (inviteToken && invitationInfo) {
        try {
          orgId = await processInviteToken(userId, inviteToken, invitationInfo, t);
          console.log('✅ Invitation accepted during registration:', orgId);
        } catch (error) {
          console.error("❌ Process invitation error:", error);
          throw new Error("ไม่สามารถประมวลผลคำเชิญได้: " + error.message);
        }
      }

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
        ...(orgId && { org_id: orgId, invitation_accepted: true })
      };
    } catch (error) {
      console.error("Register transaction error:", error);
      if (!t.finished) await t.rollback();
      throw error;
    }
  };

  const login = async (email, password) => {
    if (!email || !password) throw new Error("กรุณากรอกอีเมลและรหัสผ่าน");

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findByEmailWithPassword(normalizedEmail);

    if (!user || !user.password_hash || !user.is_active) {
      throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }

    const isPasswordValid = await hasher.compare(password, user.password_hash);
    if (!isPasswordValid) throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");

    const accessToken = tokenUtils.generateAccessToken(user.user_id);
    const refreshToken = tokenUtils.generateRefreshToken(user.user_id);

    const expiresAt = new Date();
    const expiryDays = parseInt(env.REFRESH_TOKEN_EXPIRES_IN?.replace('d', '')) || 7;
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    await Token.create({
      userId: user.user_id,
      refreshToken: refreshToken,
      expiresAt: expiresAt
    });

    return {
      accessToken,
      refreshToken,
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        full_name: user.full_name,
        role: user.role,
      }
    };
  };

  const refreshToken = async (tokenStr) => {
    try {
      if (!tokenStr) throw new Error('Refresh token is required');

      const decoded = tokenUtils.verifyRefreshToken(tokenStr);
      if (!decoded || !decoded.user_id) throw new Error('Invalid refresh token');

      const tokenRecord = await Token.findOne(tokenStr);
      if (!tokenRecord) throw new Error('Invalid or expired refresh token');

      const user = await User.findById(tokenRecord.user_id);
      if (!user) throw new Error('User not found');
      if (!user.is_active) throw new Error('Account is deactivated');

      const newAccessToken = tokenUtils.generateAccessToken(user.user_id);
      const newRefreshToken = tokenUtils.generateRefreshToken(user.user_id);

      const expiresAt = new Date();
      const expiryDays = parseInt(env.REFRESH_TOKEN_EXPIRES_IN?.replace('d', '')) || 7;
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      await Token.deleteOne(tokenStr);
      await Token.create({
        userId: user.user_id,
        refreshToken: newRefreshToken,
        expiresAt: expiresAt
      });

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
      console.error('Refresh token error:', error);
      throw error;
    }
  };

  const forgotPassword = async (email) => {
    if (!email) throw new Error("กรุณากรอกอีเมล");

    const user = await User.findByEmail(email);
    if (!user) return { success: true };

    const token = random.randomUUID();
    const expire = new Date(Date.now() + 1000 * 60 * 15);

    await User.setResetToken(user.user_id, token, expire);

    const link = `${env.FRONTEND_URL}/reset-password?token=${token}`;
    const html = `
      <h2>รีเซ็ตรหัสผ่าน</h2>
      <p>คุณได้ขอรีเซ็ตรหัสผ่าน กรุณาคลิกลิงก์ด้านล่างเพื่อดำเนินการต่อ:</p>
      <a href="${link}" style="...">รีเซ็ตรหัสผ่าน</a>
      <p>ลิงก์นี้จะหมดอายุใน 15 นาที</p>
    `;

    await mailer(email, "รีเซ็ตรหัสผ่าน", html);
    return { success: true };
  };

  const verifyResetToken = async (token) => {
    if (!token) throw new Error("token หาย");
    const user = await User.findByResetToken(token);
    if (!user) throw new Error("token ไม่ถูกต้องหรือหมดอายุ");
    return { valid: true };
  };

  const resetPassword = async (token, password) => {
    if (!token || !password) throw new Error("ข้อมูลไม่ครบ");
    if (password.length < 6) throw new Error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");

    const user = await User.findByResetToken(token);
    if (!user) throw new Error("token ไม่ถูกต้อง หรือหมดอายุ");

    const saltRounds = parseInt(env.BCRYPT_SALT_ROUNDS, 10) || 10;
    const hash = await hasher.hash(password, saltRounds);

    await User.updatePassword(user.user_id, hash);
    return { success: true };
  };

  const changeEmail = async (userId, newEmail, password) => {
    const user = await User.findById(userId);
    if (!user) throw new Error("ไม่พบผู้ใช้");

    const userWithPassword = await User.findByEmailWithPassword(user.email);
    if (!userWithPassword?.password_hash) throw new Error("ไม่สามารถตรวจสอบรหัสผ่านได้");

    const isPasswordValid = await hasher.compare(password, userWithPassword.password_hash);
    if (!isPasswordValid) throw new Error("รหัสผ่านไม่ถูกต้อง");

    const existing = await User.findByEmail(newEmail);
    if (existing && existing.user_id !== user.user_id) throw new Error("อีเมลใหม่นี้ถูกใช้งานแล้ว");

    await User.updateEmail(user.user_id, newEmail);
    return { user_id: user.user_id, email: newEmail };
  };

  const changePassword = async (userId, oldPassword, newPassword) => {
    const user = await User.findById(userId);
    if (!user) throw new Error("ไม่พบผู้ใช้");

    const userWithPass = await User.findByEmailWithPassword(user.email);
    if (!userWithPass?.password_hash) throw new Error("ไม่สามารถตรวจสอบรหัสผ่านได้");

    const isPasswordValid = await hasher.compare(oldPassword, userWithPass.password_hash);
    if (!isPasswordValid) throw new Error("รหัสผ่านเดิมไม่ถูกต้อง");

    const salt = await hasher.genSalt(parseInt(env.BCRYPT_SALT_ROUNDS) || 10);
    const newHashedPassword = await hasher.hash(newPassword, salt);

    await User.updatePassword(user.user_id, newHashedPassword);
    await Token.deleteAllByUser(user.user_id);

    return { success: true };
  };

  const updateProfile = async (userId, data) => {
    for (const key in data) {
      if (typeof data[key] === "string") data[key] = data[key].trim();
    }

    if (data.name !== undefined && data.name === "") {
        throw new Error("ชื่อต้องไม่เป็นค่าว่าง");
    }
    if (data.surname !== undefined && data.surname === "") {
        throw new Error("นามสกุลต้องไม่เป็นค่าว่าง");
    }

    const cleanData = {};
    for (const key in data) {
      if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
        cleanData[key] = data[key];
      }
    }

    if (cleanData.name || cleanData.surname) {
      const currentUser = await User.findById(userId);
      const newName = cleanData.name || currentUser.name;
      const newSurname = cleanData.surname || currentUser.surname;
      cleanData.full_name = `${newName} ${newSurname}`;
    }

    try {
      return await User.updateProfile(userId, cleanData);
    } catch (error) {
      console.error("🔥 UPDATE FAILED:", error.message);
      throw error;
    }
  };

  const logout = async (refreshToken) => {
    if (!refreshToken) throw new Error("ไม่พบ refresh token");
    await Token.deleteOne(refreshToken);
    return { success: true };
  };

  const logoutAll = async (userId) => {
    await Token.deleteAllByUser(userId);
    return { success: true };
  };

  const getProfile = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new Error("ไม่พบข้อมูลผู้ใช้");

    const userJson = user.toJSON ? user.toJSON() : user;
    delete userJson.password_hash;
    delete userJson.reset_token;
    delete userJson.reset_token_expire;

    return userJson;
  };

  const googleAuthCallback = async (user) => {
    const accessToken = tokenUtils.generateAccessToken(user.user_id);
    const refreshToken = tokenUtils.generateRefreshToken(user.user_id);

    const expiresAt = new Date();
    const expiryDays = parseInt(env.REFRESH_TOKEN_EXPIRES_IN?.replace('d', '')) || 7;
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    await Token.create({
      userId: user.user_id,
      refreshToken: refreshToken,
      expiresAt: expiresAt
    });

    return { accessToken, refreshToken };
  };

  return {
    register,
    login,
    refreshToken,
    forgotPassword,
    verifyResetToken,
    resetPassword,
    changeEmail,
    changePassword,
    updateProfile,
    logout,
    logoutAll,
    getProfile,
    googleAuthCallback,
    processInviteToken
  };
};

// Default Instance
const defaultInstance = createAuthService();
export default defaultInstance;