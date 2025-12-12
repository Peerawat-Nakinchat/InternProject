// src/services/AuthService.js
import bcrypt from "bcrypt";
import crypto from "crypto";
import { UserModel } from "../models/UserModel.js";
import { MemberModel } from "../models/MemberModel.js";
import { RefreshTokenModel } from "../models/TokenModel.js";
import { InvitationModel } from "../models/InvitationModel.js";
import TrustedDeviceModel from "../models/TrustedDeviceModel.js"; // ✅ Import Model
import InvitationService from "./InvitationService.js";
import { sequelize } from "../models/dbModels.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  verifyAccessToken, // ✅ Import เพิ่ม
  signAccessToken,   // ✅ Import เพิ่ม
} from "../utils/token.js";
import { sendEmail } from "../utils/mailer.js";
import { createError } from "../middleware/errorHandler.js";
import MfaService from "./MfaService.js"; // ✅ Import MFA Service
import StorageService from "./StorageService.js";
import logger from "../utils/logger.js";
import { parseUserAgent } from "../utils/deviceFingerprint.js"; // ✅ Import Helper

export const createAuthService = (deps = {}) => {
  const User = deps.UserModel || UserModel;
  const Member = deps.MemberModel || MemberModel;
  const Token = deps.RefreshTokenModel || RefreshTokenModel;
  const Invitation = deps.InvitationModel || InvitationModel;
  const TrustedDevice = deps.TrustedDeviceModel || TrustedDeviceModel;
  const InviteService = deps.InvitationService || InvitationService;
  const db = deps.sequelize || sequelize;
  const hasher = deps.bcrypt || bcrypt;
  const random = deps.crypto || crypto;
  const mailer = deps.sendEmail || sendEmail;
  const mfaService = deps.mfaService || MfaService; 
  const tokenUtils = deps.tokenUtils || {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    verifyAccessToken, // ✅
    signAccessToken,   // ✅
  };
  const env = deps.env || process.env;

  // ... (generateTokens, processInviteToken, register คงเดิม ...)
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

  const processInviteToken = async (userId, inviteToken, invitationInfo, transaction) => {
     // ... (Logic เดิม) ...
     try {
      const hashedToken = hashToken(inviteToken);
      const invitation = await Invitation.findByToken(hashedToken);
      if (!invitation || invitation.status !== "pending") {
        throw createError.badRequest("Invitation is not valid or has been used");
      }
      await Member.create({
          userId: userId,
          orgId: invitationInfo.org_id,
          roleId: parseInt(invitationInfo.role_id, 10),
        }, transaction);
      await Invitation.updateStatus(invitationInfo.invitation_id, "accepted", transaction);
      return invitationInfo.org_id;
    } catch (error) {
      logger.error("❌ Process invite token error:", error);
      throw error;
    }
  };

  const register = async (userData) => {
      // ... (Logic เดิม ของ function register) ...
      // เพื่อความกระชับ ขอละไว้ในฐานที่เข้าใจ (ใช้โค้ดเดิมที่คุณส่งมาได้เลย)
      const { email, password, name, surname, sex, inviteToken } = userData;
      if (!email || !password || !name || !surname || !sex) throw createError.badRequest("กรุณากรอกข้อมูลที่จำเป็น");

      const normalizedEmail = email.toLowerCase().trim();
      let invitationInfo = null;
      if (inviteToken) {
          invitationInfo = await InviteService.getInvitationInfo(inviteToken);
          if (invitationInfo.email.toLowerCase() !== normalizedEmail) throw createError.badRequest("อีเมลไม่ตรงกับคำเชิญ");
      }
      const existingUser = await User.findByEmail(normalizedEmail);
      if (existingUser) throw createError.conflict("อีเมลนี้ถูกใช้งานแล้ว");

      const t = await db.transaction();
      try {
          const hashedPassword = await hasher.hash(password, parseInt(env.BCRYPT_SALT_ROUNDS) || 10);
          const created = await User.create({
              email: normalizedEmail,
              passwordHash: hashedPassword,
              name, surname, sex,
              user_address_1: userData.user_address_1,
              user_address_2: userData.user_address_2,
              user_address_3: userData.user_address_3,
              is_email_verified: !!inviteToken,
          }, t);

          const tokens = await generateTokens({ user_id: created.user_id }); // Reuse internal function
          // Note: Logic เดิมมีการสร้าง Token ซ้ำซ้อนเล็กน้อย แต่เพื่อให้เหมือนเดิมที่สุด:
          // ... (Logic token creation & process invite)
          let orgId = null;
          if (inviteToken && invitationInfo) {
              orgId = await processInviteToken(created.user_id, inviteToken, invitationInfo, t);
          }
          await t.commit();
          return {
              success: true,
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              user: { user_id: created.user_id, email: normalizedEmail, name, surname, full_name: `${name} ${surname}` },
              ...(orgId && { org_id: orgId, invitation_accepted: true }),
          };
      } catch (error) {
          if (!t.finished) await t.rollback();
          throw error;
      }
  };

  // ✅ 1. ย้าย Logic การ Login + Smart MFA มาไว้ที่นี่
  const loginWithSmartMfa = async ({ email, password, fingerprint, ip }) => {
    if (!email || !password) throw createError.badRequest("กรุณากรอกอีเมลและรหัสผ่าน");

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findByEmailWithPassword(normalizedEmail);

    if (!user || !user.password_hash || !user.is_active) {
      throw createError.unauthorized("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }

    const isPasswordValid = await hasher.compare(password, user.password_hash);
    if (!isPasswordValid) throw createError.unauthorized("อีเมลหรือรหัสผ่านไม่ถูกต้อง");

    if (user.is_email_verified === false) {
      const error = createError.forbidden("กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ");
      error.code = "EMAIL_NOT_VERIFIED";
      error.email = user.email;
      throw error;
    }

    // --- Smart MFA Logic ---
    if (user.mfa_enabled === true) {
      // เช็คว่าอุปกรณ์นี้ Trust หรือยัง?
      let isTrusted = false;
      let trustedDevice = null;
      
      if (fingerprint) {
         trustedDevice = await TrustedDevice.findByFingerprint(user.user_id, fingerprint);
         isTrusted = !!trustedDevice;
      }

      if (isTrusted) {
        // ✅ อุปกรณ์เชื่อถือได้ -> ข้าม MFA -> Update Last Used
        await TrustedDevice.updateLastUsed(trustedDevice.device_id);
        logger.info(`Trusted device login for user: ${email}`);
      } else {
        // ❌ อุปกรณ์ใหม่ -> บังคับ MFA -> ส่ง Temp Token
        const tempToken = tokenUtils.signAccessToken(
            {
              user_id: user.user_id,
              mfa_pending: true,
              fingerprint: fingerprint, // ส่งต่อไปเพื่อ save ตอน verify ผ่าน
            },
            "5m"
        );
        
        return {
          status: "MFA_REQUIRED",
          mfaRequired: true,
          tempToken,
          message: "กรุณาระบุรหัส OTP (2FA) - อุปกรณ์ใหม่",
          isNewDevice: true,
        };
      }
    }

    // Login สำเร็จ (ไม่มี MFA หรือ Trusted แล้ว)
    const tokens = await generateTokens(user);

    return {
      status: "SUCCESS",
      ...tokens,
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

  // ✅ 2. ย้าย Logic Verify OTP + Save Device มาไว้ที่นี่
  const verifyMfaAndSaveDevice = async ({ tempToken, otp, ip, userAgent }) => {
    if (!tempToken) throw createError.unauthorized("ไม่พบ Token กรุณาเข้าสู่ระบบใหม่");

    // Decode Token
    let decoded;
    try {
        decoded = tokenUtils.verifyAccessToken(tempToken);
    } catch (err) {
        throw createError.unauthorized("Token ไม่ถูกต้องหรือหมดอายุ");
    }

    if (!decoded || !decoded.user_id) throw createError.unauthorized("Invalid Token Payload");

    // ✅ FIX CRITICAL BUG: ใช้ findByIdWithSecret เพื่อดึง mfa_secret มาเช็ค
    const user = await User.findByIdWithSecret(decoded.user_id);
    if (!user) throw createError.notFound("ไม่พบผู้ใช้งาน");
    if (!user.mfa_enabled || !user.mfa_secret) throw createError.badRequest("MFA not enabled for this user");

    // Verify OTP
    const isValid = mfaService.verifyLoginMfa(user, otp);
    if (!isValid) {
      throw createError.unauthorized("รหัส OTP ไม่ถูกต้อง");
    }

    // ✅ Save Trusted Device (ถ้ามี fingerprint จาก tempToken)
    if (decoded.fingerprint) {
        try {
            await TrustedDevice.create(
                user.user_id,
                decoded.fingerprint,
                parseUserAgent(userAgent),
                ip
            );
            logger.info(`New trusted device saved for user: ${user.email}`);
        } catch (err) {
            logger.warn(`Failed to save trusted device: ${err.message}`);
            // ไม่ throw error เพื่อให้ user login ได้แม้ save device ไม่ผ่าน
        }
    }

    // Generate Final Tokens
    const tokens = await generateTokens(user);
    
    // Prepare User Response (Clean sensitive data)
    const userResponse = user.toJSON ? user.toJSON() : user;
    delete userResponse.password_hash;
    delete userResponse.mfa_secret;

    return {
        ...tokens,
        user: userResponse
    };
  };

  // ... (Functions อื่นๆ: refreshToken, forgotPassword, etc. คงเดิม)
  const refreshToken = async (tokenStr) => {
    // (Logic เดิม...)
    if (!tokenStr) throw createError.badRequest("Refresh token is required");
    const decoded = tokenUtils.verifyRefreshToken(tokenStr);
    if (!decoded || !decoded.user_id) throw createError.unauthorized("Invalid refresh token");
    const tokenRecord = await Token.findByToken(tokenStr);
    if (!tokenRecord) throw createError.unauthorized("Invalid or expired refresh token");
    const user = await User.findById(tokenRecord.user_id);
    if (!user) throw createError.notFound("User not found");
    if (!user.is_active) throw createError.unauthorized("Account is deactivated");
    
    // Revoke old & Issue new
    await Token.deleteOne(tokenStr);
    const newTokens = await generateTokens(user); // Reuse helper
    return newTokens;
  };
  
  const forgotPassword = async (email) => {
    // (Logic เดิม...)
    if (!email) throw createError.badRequest("กรุณากรอกอีเมล");
    const user = await User.findByEmail(email);
    if (!user) return { success: true };
    const token = random.randomUUID();
    const expire = new Date(Date.now() + 1000 * 60 * 15);
    await User.setResetToken(user.user_id, token, expire);
    const link = `${env.FRONTEND_URL}/reset-password?token=${token}`;
    await mailer(email, "รีเซ็ตรหัสผ่าน", `<h2>รีเซ็ตรหัสผ่าน</h2><p><a href="${link}">คลิกที่นี่</a></p>`);
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
    if (password.length < 6) throw createError.badRequest("รหัสผ่านสั้นเกินไป");
    const user = await User.findByResetToken(token);
    if (!user) throw createError.badRequest("Token ไม่ถูกต้อง");
    const hash = await hasher.hash(password, parseInt(env.BCRYPT_SALT_ROUNDS) || 10);
    await User.updatePassword(user.user_id, hash);
    return { success: true };
  };
  
  const changeEmail = async (userId, newEmail, password) => {
      // (Logic เดิม...)
      const user = await User.findById(userId);
      const userPass = await User.findByEmailWithPassword(user.email);
      if (!await hasher.compare(password, userPass.password_hash)) throw createError.unauthorized("รหัสผ่านผิด");
      const exist = await User.findByEmail(newEmail);
      if (exist && exist.user_id !== userId) throw createError.conflict("อีเมลซ้ำ");
      await User.updateEmail(userId, newEmail);
      return { user_id: userId, email: newEmail };
  };

  const changePassword = async (userId, oldPassword, newPassword) => {
      // (Logic เดิม...)
      const user = await User.findById(userId);
      const userPass = await User.findByEmailWithPassword(user.email);
      if (!await hasher.compare(oldPassword, userPass.password_hash)) throw createError.unauthorized("รหัสผ่านเดิมผิด");
      const hash = await hasher.hash(newPassword, parseInt(env.BCRYPT_SALT_ROUNDS) || 10);
      await User.updatePassword(user.user_id, hash);
      await Token.deleteAllByUser(userId);
      return { success: true };
  };

  const updateProfile = async (userId, data) => {
      // (Logic เดิม...)
      const cleanData = {};
      for (const k in data) if (data[k]) cleanData[k] = typeof data[k] === 'string' ? data[k].trim() : data[k];
      
      if (cleanData.profile_image_url?.startsWith("data:image/")) {
         try {
             const res = await StorageService.uploadBase64Image(cleanData.profile_image_url, userId);
             if (res) cleanData.profile_image_url = res.url;
         } catch (e) { /* handle error */ }
      }
      return await User.updateProfile(userId, cleanData);
  };
  
  const logout = async (token) => { await Token.deleteOne(token); return { success: true }; };
  const logoutAll = async (userId) => { await Token.deleteAllByUser(userId); return { success: true }; };
  const getProfile = async (userId) => {
      const user = await User.findById(userId);
      if (!user) throw createError.notFound("User not found");
      const j = user.toJSON ? user.toJSON() : user;
      delete j.password_hash; delete j.reset_token;
      return j;
  };
  const googleAuthCallback = async (user) => { /* logic เดิม */ return await generateTokens(user); };

  // Note: ผมลบ login ตัวเก่าออกแล้วใช้ loginWithSmartMfa แทน
  return {
    register,
    loginWithSmartMfa,
    verifyMfaAndSaveDevice,
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
  };
};

const defaultInstance = createAuthService();
export default defaultInstance;