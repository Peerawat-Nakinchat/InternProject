// src/models/UserModel.js
import { DataTypes, Op } from "sequelize";
import sequelize from "../config/dbConnection.js";
import { ROLE_ID } from "../constants/roles.js";

// ==================== USER MODEL ====================
export const User = sequelize.define(
  "sys_users",
  {
    user_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    // --- MFA FIELDS ---
    mfa_secret: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    mfa_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // ------------------
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200],
      },
    },
    surname: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200],
      },
    },
    full_name: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    sex: {
      type: DataTypes.STRING(10),
      allowNull: true,
      validate: {
        isValidSex(value) {
          if (value === null || value === "") return;
          const allowed = ["M", "F", "O"];
          if (!allowed.includes(value)) {
            throw new Error("ค่าเพศไม่ถูกต้อง");
          }
        },
      },
    },
    user_address_1: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    user_address_2: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    user_address_3: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    profile_image_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        isUrlOrEmpty(value) {
          if (!value || value.trim() === "") {
            return;
          }
          const urlPattern = /^https?:\/\/.+/;
          if (!urlPattern.test(value)) {
            throw new Error("กรุณากรอก URL ที่ถูกต้อง");
          }
        },
      },
    },
    auth_provider: {
      type: DataTypes.STRING(50),
      defaultValue: "local",
      validate: {
        isIn: [["local", "google", "facebook"]],
      },
    },
    provider_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isIn: {
          args: [Object.values(ROLE_ID)],
          msg: "Invalid Role ID",
        },
      },
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    reset_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    reset_token_expire: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "updated_at",
    },
  },
  {
    timestamps: true,
    tableName: "sys_users",
    createdAt: "created_at",
    updatedAt: "updated_at",
    hooks: {
      beforeCreate: (user) => {
        if (user.name && user.surname) {
          user.full_name = `${user.name} ${user.surname}`;
        }
      },
      beforeUpdate: (user) => {
        if (user.changed("name") || user.changed("surname")) {
          user.full_name = `${user.name} ${user.surname}`;
        }
      },
    },
  },
);

/**
 * Find user by ID (Safe: Excludes secrets)
 */
const findById = async (userId) => {
  return await User.findByPk(userId, {
    attributes: {
      exclude: ["password_hash", "reset_token", "reset_token_expire", "mfa_secret"], 
    },
    include: [
      {
        model: sequelize.models.sys_role,
        as: "role",
        attributes: ["role_id", "role_name"],
      },
    ],
  });
};

/**
 * Find user by email
 */
const findByEmail = async (email) => {
  return await User.findOne({
    where: { email: email.toLowerCase().trim() },
    include: [
      {
        model: sequelize.models.sys_role,
        as: "role",
        attributes: ["role_id", "role_name"],
      },
    ],
  });
};

/**
 * Find user by email with password (for authentication)
 */
const findByEmailWithPassword = async (email) => {
  return await User.findOne({
    where: { email: email.toLowerCase().trim() },
    include: [
      {
        model: sequelize.models.sys_role,
        as: "role",
        attributes: ["role_id", "role_name"],
      },
    ],
  });
};

/**
 * Create new user
 */
const create = async (userData, transaction = null) => {
  return await User.create(
    {
      email: userData.email.toLowerCase().trim(),
      password_hash: userData.passwordHash,
      name: userData.name.trim(),
      surname: userData.surname.trim(),
      sex: userData.sex || "O",
      user_address_1: userData.user_address_1 || "",
      user_address_2: userData.user_address_2 || "",
      user_address_3: userData.user_address_3 || "",
      role_id: userData.role_id || ROLE_ID.MEMBER, 
      is_active: true,
      is_email_verified: userData.is_email_verified || false,
    },
    { transaction },
  );
};

/**
 * Update user password
 */
const updatePassword = async (userId, passwordHash, transaction = null) => {
  const [rowsUpdated, [updatedUser]] = await User.update(
    {
      password_hash: passwordHash,
      reset_token: null,
      reset_token_expire: null,
    },
    {
      where: { user_id: userId },
      returning: true,
      transaction,
    },
  );

  return updatedUser;
};

/**
 * Set reset token
 */
const setResetToken = async (userId, token, expireDate, transaction = null) => {
  const [rowsUpdated, [updatedUser]] = await User.update(
    {
      reset_token: token,
      reset_token_expire: expireDate,
    },
    {
      where: { user_id: userId },
      returning: true,
      transaction,
    },
  );

  return updatedUser;
};

/**
 * Find user by reset token
 */
const findByResetToken = async (token) => {
  return await User.findOne({
    where: {
      reset_token: token,
      reset_token_expire: {
        [Op.gt]: new Date(),
      },
    },
    attributes: ["user_id", "email", "reset_token", "reset_token_expire"],
  });
};

/**
 * Update user email
 */
const updateEmail = async (userId, newEmail, transaction = null) => {
  const [rowsUpdated, [updatedUser]] = await User.update(
    {
      email: newEmail.toLowerCase().trim(),
    },
    {
      where: { user_id: userId },
      returning: true,
      transaction,
    },
  );

  return updatedUser;
};

/**
 * Update user profile
 */
const updateProfile = async (userId, data, transaction = null) => {
  const user = await User.findByPk(userId, { transaction });
  if (!user) return null;

  const allowedFields = [
    "name",
    "surname",
    "sex",
    "user_address_1",
    "user_address_2",
    "user_address_3",
    "profile_image_url",
  ];

  let hasChanges = false;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      let newValue = data[field];
      if (newValue === "") {
        if (field === "sex" || field === "profile_image_url") {
          newValue = null;
        }
      }

      if (user[field] !== newValue) {
        user[field] = newValue;
        hasChanges = true;
      }
    }
  }

  if (hasChanges) {
    await user.save({ transaction, validate: true });
  }

  return user;
};

/**
 * Deactivate user (soft delete)
 */
const deactivate = async (userId, transaction = null) => {
  const [rowsUpdated] = await User.update(
    { is_active: false },
    {
      where: { user_id: userId },
      transaction,
    },
  );

  return rowsUpdated > 0;
};

/**
 * Activate user
 */
const activate = async (userId, transaction = null) => {
  const [rowsUpdated] = await User.update(
    { is_active: true },
    {
      where: { user_id: userId },
      transaction,
    },
  );

  return rowsUpdated > 0;
};

/**
 * Delete user (hard delete)
 */
const deleteUser = async (userId, transaction = null) => {
  const deleted = await User.destroy({
    where: { user_id: userId },
    transaction,
  });

  return deleted > 0;
};

/**
 * Search users with filters
 */
const search = async (filters = {}, options = {}) => {
  const {
    page = 1,
    limit = 10,
    sortBy = "created_at",
    sortOrder = "DESC",
  } = options;

  const where = {};

  if (filters.email) {
    where.email = { [Op.iLike]: `${filters.email}%` };
  }

  if (filters.name) {
    where[Op.or] = [
      { name: { [Op.iLike]: `${filters.name}%` } },
      { surname: { [Op.iLike]: `${filters.name}%` } },
      { full_name: { [Op.iLike]: `${filters.name}%` } },
    ];
  }

  if (filters.role_id !== undefined) {
    where.role_id = filters.role_id;
  }

  if (filters.is_active !== undefined) {
    where.is_active = filters.is_active;
  }

  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: {
      exclude: ["password_hash", "reset_token", "reset_token_expire", "mfa_secret"], 
    },
    include: [
      {
        model: sequelize.models.sys_role,
        as: "role",
        attributes: ["role_id", "role_name"],
      },
    ],
    limit,
    offset: (page - 1) * limit,
    order: [[sortBy, sortOrder]],
  });

  return {
    users: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit),
  };
};

/**
 * Count users by criteria
 */
const count = async (where = {}) => {
  return await User.count({ where });
};

/**
 * Check if email exists
 */
const emailExists = async (email, excludeUserId = null) => {
  const where = { email: email.toLowerCase().trim() };

  if (excludeUserId) {
    where.user_id = { [Op.ne]: excludeUserId };
  }

  const count = await User.count({ where });
  return count > 0;
};

/**
 * Bulk create users
 */
const bulkCreate = async (usersData, transaction = null) => {
  const preparedData = usersData.map((u) => ({
    ...u,
    email: u.email?.toLowerCase().trim(),
    name: u.name?.trim(),
    surname: u.surname?.trim(),
    role_id: u.role_id || ROLE_ID.MEMBER,
    is_active: true,
  }));

  return await User.bulkCreate(preparedData, {
    transaction,
    validate: true,
    individualHooks: true,
  });
};

/**
 * Update user role
 */
const updateRole = async (userId, roleId, transaction = null) => {
  const [rowsUpdated] = await User.update(
    { role_id: roleId },
    {
      where: { user_id: userId },
      transaction,
    },
  );

  return rowsUpdated > 0;
};

/**
 * Set email verified status
 */
const setEmailVerified = async (
  userId,
  verified = true,
  transaction = null,
) => {
  const [rowsUpdated] = await User.update(
    { is_email_verified: verified },
    {
      where: { user_id: userId },
      transaction,
    },
  );

  return rowsUpdated > 0;
};

/**
 * Save MFA Secret (Internal)
 */
const saveMfaSecret = async (userId, secret) => {
  return await User.update(
    { mfa_secret: secret, mfa_enabled: false },
    { where: { user_id: userId } }
  );
};

/**
 * Enable MFA
 */
const enableMfa = async (userId) => {
  return await User.update(
    { mfa_enabled: true },
    { where: { user_id: userId } }
  );
};

/**
 * Find User Including Secret (Internal use for verifying OTP)
 */
const findByIdWithSecret = async (userId) => {
  return await User.findByPk(userId);
};

export const UserModel = {
  findById,
  findByEmail,
  findByIdWithSecret, 
  findByEmailWithPassword,
  create,
  updatePassword,
  setResetToken,
  findByResetToken,
  updateEmail,
  updateProfile,
  deactivate,
  activate,
  deleteUser,
  search,
  count,
  emailExists,
  bulkCreate,
  updateRole,
  setEmailVerified,
  saveMfaSecret, 
  enableMfa, 
};

export default UserModel;