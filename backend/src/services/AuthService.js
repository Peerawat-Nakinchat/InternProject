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
  hashToken,
} from "../utils/token.js";
import { sendEmail } from "../utils/mailer.js";
import { createError } from "../middleware/errorHandler.js";
import StorageService from "./StorageService.js";
import logger from "../utils/logger.js";

export const createAuthService = (deps = {}) => {
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
    verifyRefreshToken,
  };
  const env = deps.env || process.env;

  const generateTokens = async (user) => {
    const accessToken = tokenUtils.generateAccessToken(user.user_id);
    const refreshToken = tokenUtils.generateRefreshToken(user.user_id);

    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() +
        (parseInt(env.REFRESH_TOKEN_EXPIRES_IN?.replace("d", "")) || 7),
    );

    await Token.create({ userId: user.user_id, refreshToken, expiresAt });

    return { accessToken, refreshToken };
  };

  const processInviteToken = async (
    userId,
    inviteToken,
    invitationInfo,
    transaction,
  ) => {
    try {
      const hashedToken = hashToken(inviteToken);
      const invitation = await Invitation.findByToken(hashedToken);
      if (!invitation || invitation.status !== "pending") {
        throw createError.badRequest(
          "Invitation is not valid or has been used",
        );
      }

      await Member.create(
        {
          userId: userId,
          orgId: invitationInfo.org_id,
          roleId: parseInt(invitationInfo.role_id, 10),
        },
        transaction,
      );

      await Invitation.updateStatus(
        invitationInfo.invitation_id,
        "accepted",
        transaction,
      );
      return invitationInfo.org_id;
    } catch (error) {
      logger.error("❌ Process invite token error:", error);
      throw error;
    }
  };

  const register = async (userData) => {
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
    } = userData;

    if (!email || !password || !name || !surname || !sex) {
      throw createError.badRequest("กรุณากรอกข้อมูลที่จำเป็น"); // ✅ 400
    }

    const normalizedEmail = email.toLowerCase().trim();
    let invitationInfo = null;

    if (inviteToken) {
      try {
        invitationInfo = await InviteService.getInvitationInfo(inviteToken);
        if (invitationInfo.email.toLowerCase() !== normalizedEmail) {
          throw createError.badRequest(
            "อีเมลไม่ตรงกับคำเชิญ กรุณาใช้อีเมล " + invitationInfo.email,
          ); // ✅ 400
        }
      } catch (error) {
        throw error;
      }
    }

    const existingUser = await User.findByEmail(normalizedEmail);
    if (existingUser) {
      throw createError.conflict("อีเมลนี้ถูกใช้งานแล้ว"); // ✅ 409 Conflict
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
          name,
          surname,
          sex,
          user_address_1,
          user_address_2,
          user_address_3,
          is_email_verified: !!inviteToken,
        },
        t,
      );

      const userId = created.user_id;
      const accessToken = tokenUtils.generateAccessToken(userId);
      const refreshToken = tokenUtils.generateRefreshToken(userId);

      const expiresAt = new Date();
      expiresAt.setDate(
        expiresAt.getDate() +
          (parseInt(env.REFRESH_TOKEN_EXPIRES_IN?.replace("d", "")) || 7),
      );

      await Token.create({ userId, refreshToken, expiresAt }, t);

      let orgId = null;
      if (inviteToken && invitationInfo) {
        orgId = await processInviteToken(
          userId,
          inviteToken,
          invitationInfo,
          t,
        );
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
        ...(orgId && { org_id: orgId, invitation_accepted: true }),
      };
    } catch (error) {
      if (!t.finished) await t.rollback();
      throw error;
    }
  };

  const login = async (email, password) => {
    if (!email || !password)
      throw createError.badRequest("กรุณากรอกอีเมลและรหัสผ่าน"); // ✅ 400

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findByEmailWithPassword(normalizedEmail);

    if (!user || !user.password_hash || !user.is_active) {
      throw createError.unauthorized("อีเมลหรือรหัสผ่านไม่ถูกต้อง"); // ✅ 401 Unauthorized
    }

    const isPasswordValid = await hasher.compare(password, user.password_hash);
    if (!isPasswordValid)
      throw createError.unauthorized("อีเมลหรือรหัสผ่านไม่ถูกต้อง"); // ✅ 401
    if (user.is_email_verified === false) {
      const error = createError.forbidden("กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ");
      error.code = "EMAIL_NOT_VERIFIED";
      error.email = user.email;
      throw error;
    }

    // ✅ NEW: Check MFA enabled
    if (user.mfa_enabled === true) {
      // Generate temporary token for MFA verification
      const tempToken = tokenUtils.generateAccessToken(user.user_id);
      return {
        mfaRequired: true,
        tempToken,
        user: {
          user_id: user.user_id,
          email: user.email,
        },
      };
    }

    const tokens = await generateTokens(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        full_name: user.full_name,
        role: user.role,
      },
    };
  };

  const refreshToken = async (tokenStr) => {
    if (!tokenStr) throw createError.badRequest("Refresh token is required"); // ✅ 400

    const decoded = tokenUtils.verifyRefreshToken(tokenStr);
    if (!decoded || !decoded.user_id)
      throw createError.unauthorized("Invalid refresh token"); // ✅ 401

    const tokenRecord = await Token.findByToken(tokenStr);
    if (!tokenRecord)
      throw createError.unauthorized("Invalid or expired refresh token"); // ✅ 401

    const user = await User.findById(tokenRecord.user_id);
    if (!user) throw createError.notFound("User not found");
    if (!user.is_active)
      throw createError.unauthorized("Account is deactivated");

    const newAccessToken = tokenUtils.generateAccessToken(user.user_id);
    const newRefreshToken = tokenUtils.generateRefreshToken(user.user_id);

    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() +
        (parseInt(env.REFRESH_TOKEN_EXPIRES_IN?.replace("d", "")) || 7),
    );

    await Token.deleteOne(tokenStr);
    await Token.create({
      userId: user.user_id,
      refreshToken: newRefreshToken,
      expiresAt,
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  };

  const forgotPassword = async (email) => {
    if (!email) throw createError.badRequest("กรุณากรอกอีเมล");
    const user = await User.findByEmail(email);
    if (!user) return { success: true };

    const token = random.randomUUID();
    const expire = new Date(Date.now() + 1000 * 60 * 15);
    await User.setResetToken(user.user_id, token, expire);

    const link = `${env.FRONTEND_URL}/reset-password?token=${token}`;
    const html = `<h2>รีเซ็ตรหัสผ่าน</h2><p>คลิกลิงก์: <a href="${link}">รีเซ็ตรหัสผ่าน</a></p>`;
    await mailer(email, "รีเซ็ตรหัสผ่าน", html);
    return { success: true };
  };

  const verifyResetToken = async (token) => {
    if (!token) throw createError.badRequest("Token required");
    const user = await User.findByResetToken(token);
    if (!user) throw createError.badRequest("Token ไม่ถูกต้องหรือหมดอายุ");
    return { valid: true };
  };

  const resetPassword = async (token, password) => {
    if (!token || !password) throw createError.badRequest("ข้อมูลไม่ครบ");
    if (password.length < 6)
      throw createError.badRequest("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");

    const user = await User.findByResetToken(token);
    if (!user) throw createError.badRequest("Token ไม่ถูกต้อง หรือหมดอายุ");

    const saltRounds = parseInt(env.BCRYPT_SALT_ROUNDS, 10) || 10;
    const hash = await hasher.hash(password, saltRounds);
    await User.updatePassword(user.user_id, hash);
    return { success: true };
  };

  const changeEmail = async (userId, newEmail, password) => {
    const user = await User.findById(userId);
    if (!user) throw createError.notFound("ไม่พบผู้ใช้");

    const userWithPassword = await User.findByEmailWithPassword(user.email);
    const isPasswordValid = await hasher.compare(
      password,
      userWithPassword.password_hash,
    );
    if (!isPasswordValid) throw createError.unauthorized("รหัสผ่านไม่ถูกต้อง"); // ✅ 401

    const existing = await User.findByEmail(newEmail);
    if (existing && existing.user_id !== user.user_id)
      throw createError.conflict("อีเมลใหม่นี้ถูกใช้งานแล้ว"); // ✅ 409

    await User.updateEmail(user.user_id, newEmail);
    return { user_id: user.user_id, email: newEmail };
  };

  const changePassword = async (userId, oldPassword, newPassword) => {
    const user = await User.findById(userId);
    if (!user) throw createError.notFound("ไม่พบผู้ใช้");

    const userWithPass = await User.findByEmailWithPassword(user.email);
    const isPasswordValid = await hasher.compare(
      oldPassword,
      userWithPass.password_hash,
    );
    if (!isPasswordValid)
      throw createError.unauthorized("รหัสผ่านเดิมไม่ถูกต้อง"); // ✅ 401

    const salt = await hasher.genSalt(parseInt(env.BCRYPT_SALT_ROUNDS) || 10);
    const newHashedPassword = await hasher.hash(newPassword, salt);

    await User.updatePassword(user.user_id, newHashedPassword);
    await Token.deleteAllByUser(user.user_id);
    return { success: true };
  };

  const updateProfile = async (userId, data) => {
    for (const key in data)
      if (typeof data[key] === "string") data[key] = data[key].trim();

    if (data.name === "" || data.surname === "")
      throw createError.badRequest("ชื่อ-นามสกุล ต้องไม่เป็นค่าว่าง");

    const cleanData = {};
    for (const key in data) {
      if (data[key] !== undefined && data[key] !== null && data[key] !== "")
        cleanData[key] = data[key];
    }

    if (
      cleanData.profile_image_url &&
      cleanData.profile_image_url.startsWith("data:image/")
    ) {
      try {
        const uploadResult = await StorageService.uploadBase64Image(
          cleanData.profile_image_url,
          userId,
        );

        if (uploadResult) {
          const currentUser = await User.findById(userId);
          if (currentUser?.profile_image_url) {
            await StorageService.deleteOldProfileImage(
              currentUser.profile_image_url,
            );
          }
          cleanData.profile_image_url = uploadResult.url;
        }
      } catch (error) {
        if (error.statusCode === 503) {
          logger.warn("⚠️ Supabase not configured, skipping image upload");
          delete cleanData.profile_image_url;
        } else {
          throw error;
        }
      }
    }
    try {
      return await User.updateProfile(userId, cleanData);
    } catch (error) {
      throw error;
    }
  };

  const logout = async (refreshToken) => {
    if (!refreshToken) throw createError.badRequest("ไม่พบ refresh token");
    await Token.deleteOne(refreshToken);
    return { success: true };
  };

  const logoutAll = async (userId) => {
    await Token.deleteAllByUser(userId);
    return { success: true };
  };

  const getProfile = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw createError.notFound("ไม่พบข้อมูลผู้ใช้");

    const userJson = user.toJSON ? user.toJSON() : user;
    delete userJson.password_hash;
    delete userJson.reset_token;
    return userJson;
  };

  const googleAuthCallback = async (user) => {
    const accessToken = tokenUtils.generateAccessToken(user.user_id);
    const refreshToken = tokenUtils.generateRefreshToken(user.user_id);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await Token.create({ userId: user.user_id, refreshToken, expiresAt });
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
    processInviteToken,
    generateTokens,
  };
};

const defaultInstance = createAuthService();
export default defaultInstance;
