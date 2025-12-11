// src/models/TrustedDeviceModel.js
import { DataTypes, Op } from "sequelize";
import sequelize from "../config/dbConnection.js";

// Define Model
export const TrustedDevice = sequelize.define(
  "sys_trusted_devices",
  {
    device_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    device_fingerprint: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    device_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    last_used_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "sys_trusted_devices",
    timestamps: false,
    indexes: [
      { fields: ["user_id"] },
      { fields: ["device_fingerprint"] },
      { fields: ["expires_at"] },
      {
        unique: true,
        fields: ["user_id", "device_fingerprint"],
      },
    ],
  },
);

// ===========================================
// Model Functions
// ===========================================

const EXPIRATION_DAYS = 30;

/**
 * Create or update a trusted device
 */
const create = async (userId, fingerprint, deviceName, ipAddress) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + EXPIRATION_DAYS);

  // Upsert - create or update
  const [device] = await TrustedDevice.upsert(
    {
      user_id: userId,
      device_fingerprint: fingerprint,
      device_name: deviceName,
      ip_address: ipAddress,
      last_used_at: new Date(),
      expires_at: expiresAt,
    },
    {
      returning: true,
    },
  );

  return device;
};

/**
 * Find trusted device by fingerprint
 * Returns null if not found, expired, or inactive > 30 days
 */
const findByFingerprint = async (userId, fingerprint) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - EXPIRATION_DAYS);

  const device = await TrustedDevice.findOne({
    where: {
      user_id: userId,
      device_fingerprint: fingerprint,
      // Not expired
      [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: new Date() } }],
      // Used within last 30 days
      last_used_at: { [Op.gt]: thirtyDaysAgo },
    },
  });

  return device;
};

/**
 * Update last_used_at timestamp
 */
const updateLastUsed = async (deviceId) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + EXPIRATION_DAYS);

  return await TrustedDevice.update(
    {
      last_used_at: new Date(),
      expires_at: expiresAt,
    },
    { where: { device_id: deviceId } },
  );
};

/**
 * Get all trusted devices for a user
 */
const findByUser = async (userId) => {
  return await TrustedDevice.findAll({
    where: { user_id: userId },
    order: [["last_used_at", "DESC"]],
  });
};

/**
 * Delete a specific device
 */
const deleteById = async (deviceId, userId) => {
  return await TrustedDevice.destroy({
    where: {
      device_id: deviceId,
      user_id: userId,
    },
  });
};

/**
 * Delete all trusted devices for a user
 */
const deleteByUser = async (userId) => {
  return await TrustedDevice.destroy({
    where: { user_id: userId },
  });
};

/**
 * Cleanup expired or inactive devices
 */
const cleanupExpired = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - EXPIRATION_DAYS);

  return await TrustedDevice.destroy({
    where: {
      [Op.or]: [
        // Expired
        { expires_at: { [Op.lt]: new Date() } },
        // Inactive for 30 days
        { last_used_at: { [Op.lt]: thirtyDaysAgo } },
      ],
    },
  });
};

// Export
export const TrustedDeviceModel = {
  create,
  findByFingerprint,
  updateLastUsed,
  findByUser,
  deleteById,
  deleteByUser,
  cleanupExpired,
};

export default TrustedDeviceModel;
