// src/models/OtpModel.js
import { DataTypes, Op } from "sequelize";
import sequelize from "../config/dbConnection.js";
import crypto from "crypto";

// ==================== OTP MODEL ====================
export const Otp = sequelize.define(
  "sys_otp_codes",
  {
    otp_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },
    otp_code: {
      type: DataTypes.STRING(255), // Hashed OTP
      allowNull: false,
    },
    purpose: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [["email_verification", "change_email"]],
      },
    },
    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    is_used: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
  },
  {
    timestamps: false,
    tableName: "sys_otp_codes",
    indexes: [{ fields: ["email"] }, { fields: ["expires_at"] }],
  },
);

/**
 * Hash OTP code using SHA256
 */
const hashOtp = (otp) => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

/**
 * Generate 6-digit OTP
 */
const generateOtpCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Create new OTP
 */
const create = async (email, purpose, otpCode = null, transaction = null) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Invalidate all previous OTPs for this email and purpose
  await Otp.update(
    { is_used: true },
    {
      where: {
        email: normalizedEmail,
        purpose,
        is_used: false,
      },
      transaction,
    },
  );

  // Generate OTP if not provided
  const plainOtp = otpCode || generateOtpCode();
  const hashedOtp = hashOtp(plainOtp);

  // OTP expires in 5 minutes
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 5);

  const otp = await Otp.create(
    {
      email: normalizedEmail,
      otp_code: hashedOtp,
      purpose,
      expires_at: expiresAt,
    },
    { transaction },
  );

  return {
    otp_id: otp.otp_id,
    email: normalizedEmail,
    plainOtp, // Return plain OTP for sending via email
    expires_at: expiresAt,
  };
};

/**
 * Verify OTP
 */
const verify = async (email, otpCode, purpose, transaction = null) => {
  const normalizedEmail = email.toLowerCase().trim();
  const hashedOtp = hashOtp(otpCode);

  // Find valid OTP
  const otp = await Otp.findOne({
    where: {
      email: normalizedEmail,
      purpose,
      is_used: false,
      expires_at: { [Op.gt]: new Date() },
    },
    order: [["created_at", "DESC"]],
    transaction,
  });

  if (!otp) {
    return { valid: false, reason: "OTP ไม่ถูกต้องหรือหมดอายุ" };
  }

  // Increment attempts
  otp.attempts += 1;
  await otp.save({ transaction });

  // Check max attempts (5 attempts max)
  if (otp.attempts > 5) {
    otp.is_used = true;
    await otp.save({ transaction });
    return { valid: false, reason: "ใส่ OTP ผิดเกินจำนวนครั้งที่กำหนด" };
  }

  // Verify OTP code
  if (otp.otp_code !== hashedOtp) {
    return {
      valid: false,
      reason: "รหัส OTP ไม่ถูกต้อง",
      attemptsLeft: 5 - otp.attempts,
    };
  }

  // Mark as used
  otp.is_used = true;
  await otp.save({ transaction });

  return { valid: true, otp_id: otp.otp_id };
};

/**
 * Get recent OTP count for rate limiting
 */
const getRecentCount = async (email, purpose, minutes = 15) => {
  const normalizedEmail = email.toLowerCase().trim();
  const since = new Date();
  since.setMinutes(since.getMinutes() - minutes);

  return await Otp.count({
    where: {
      email: normalizedEmail,
      purpose,
      created_at: { [Op.gte]: since },
    },
  });
};

/**
 * Cleanup expired OTPs
 * - Keep records for at least 20 minutes to support rate limiting (15 min window)
 * - Delete records older than 20 minutes
 */
const cleanupExpired = async () => {
  const retentionTime = new Date(Date.now() - 20 * 60 * 1000); // 20 minutes ago

  const deleted = await Otp.destroy({
    where: {
      created_at: { [Op.lt]: retentionTime },
    },
  });
  return deleted;
};

/**
 * Find pending OTP by email
 */
const findPendingByEmail = async (email, purpose) => {
  const normalizedEmail = email.toLowerCase().trim();

  return await Otp.findOne({
    where: {
      email: normalizedEmail,
      purpose,
      is_used: false,
      expires_at: { [Op.gt]: new Date() },
    },
    order: [["created_at", "DESC"]],
  });
};

export const OtpModel = {
  generateOtpCode,
  hashOtp,
  create,
  verify,
  getRecentCount,
  cleanupExpired,
  findPendingByEmail,
};

export default OtpModel;
