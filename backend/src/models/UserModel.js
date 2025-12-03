// src/models/UserModel.js
import { DataTypes, Op } from 'sequelize';
import sequelize from "../config/dbConnection.js";
import Role from "./RoleModel.js";


// ==================== USER MODEL ====================
export const User = sequelize.define('sys_users', {
  user_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 200]
    }
  },
  surname: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 200]
    }
  },
  full_name: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  sex: {
    type: DataTypes.STRING(10),
    allowNull: true,
    validate: {
    isValidSex(value) {
        if (value === null || value === "") return;
        const allowed = ['M', 'F', 'O'];
        if (!allowed.includes(value)) {
        throw new Error("ค่าเพศไม่ถูกต้อง");
        }
    }   
    }
  },
  user_address_1: {
    type: DataTypes.STRING(1000),
    allowNull: true
  },
  user_address_2: {
    type: DataTypes.STRING(1000),
    allowNull: true
  },
  user_address_3: {
    type: DataTypes.STRING(1000),
    allowNull: true
  },
  profile_image_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      isUrlOrEmpty(value) {
      if (!value || value.trim() === '') {
        return;
      }
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(value)) {
        throw new Error('กรุณากรอก URL ที่ถูกต้อง');
      }
    }
    }
  },
  auth_provider: {
    type: DataTypes.STRING(50),
    defaultValue: 'local',
    validate: {
      isIn: [['local', 'google', 'facebook']]
    }
  },
  provider_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  role_id: {
  type: DataTypes.INTEGER,
  allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  reset_token: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  reset_token_expire: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  timestamps: true,
  tableName: 'sys_users',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: (user) => {
      if (user.name && user.surname) {
        user.full_name = `${user.name} ${user.surname}`;
      }
    },
    beforeUpdate: (user) => {
      if (user.changed('name') || user.changed('surname')) {
        user.full_name = `${user.name} ${user.surname}`;
      }
    }
  }
});

/**
 * Find user by ID
 */
const findById = async (userId) => {
  return await User.findByPk(userId, {
    attributes: {
      exclude: ['password_hash', 'reset_token', 'reset_token_expire']
    },
    include: [{
      model: sequelize.models.sys_role,
      as: 'role',
      attributes: ['role_id', 'role_name']
    }]
  });
};

/**
 * Find user by email
 */
const findByEmail = async (email) => {
  return await User.findOne({
    where: { email: email.toLowerCase().trim() },
    include: [{
      model: sequelize.models.sys_role,
      as: 'role',
      attributes: ['role_id', 'role_name']
    }]
  });
};

/**
 * Find user by email with password (for authentication)
 */
const findByEmailWithPassword = async (email) => {
  return await User.findOne({
    where: { email: email.toLowerCase().trim() },
    include: [{
      model: sequelize.models.sys_role,
      as: 'role',
      attributes: ['role_id', 'role_name']
    }]
  });
};

/**
 * Create new user
 */
const create = async (userData, transaction = null) => {
  return await User.create({
    email: userData.email.toLowerCase().trim(),
    password_hash: userData.passwordHash,
    name: userData.name.trim(),
    surname: userData.surname.trim(),
    sex: userData.sex || 'O',
    user_address_1: userData.user_address_1 || '',
    user_address_2: userData.user_address_2 || '',
    user_address_3: userData.user_address_3 || '',
    role_id: userData.role_id || 3, // Default USER role
    is_active: true
  }, { transaction });
};

/**
 * Update user password
 */
const updatePassword = async (userId, passwordHash, transaction = null) => {
  const [rowsUpdated, [updatedUser]] = await User.update(
    {
      password_hash: passwordHash,
      reset_token: null,
      reset_token_expire: null
    },
    {
      where: { user_id: userId },
      returning: true,
      transaction
    }
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
      reset_token_expire: expireDate
    },
    {
      where: { user_id: userId },
      returning: true,
      transaction
    }
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
        [Op.gt]: new Date()
      }
    },
    attributes: ['user_id', 'email', 'reset_token', 'reset_token_expire']
  });
};

/**
 * Update user email
 */
const updateEmail = async (userId, newEmail, transaction = null) => {
  const [rowsUpdated, [updatedUser]] = await User.update(
    {
      email: newEmail.toLowerCase().trim()
    },
    {
      where: { user_id: userId },
      returning: true,
      transaction
    }
  );

  return updatedUser;
};

/**
 * Update user profile
 */
const updateProfile = async (userId, data, transaction = null) => {
  // Only update fields that are provided
  const updateData = {};
  
  const allowedFields = [
    'name',
    'surname',
    'full_name',
    'sex',
    'user_address_1',
    'user_address_2',
    'user_address_3',
    'profile_image_url'
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      if (data[field] === '') {
         if (field === 'sex' || field === 'profile_image_url') {
            updateData[field] = null; 
         } else {
            // สำหรับ name/surname ถ้าส่งมาว่าง ให้คงไว้เพื่อให้ Sequelize ด่า (Validate) ว่าห้ามว่าง
            updateData[field] = data[field];
         }
      } else {
         // กรณีมีข้อมูลปกติ
         updateData[field] = data[field];
      }
    }
  }

  const [rowsUpdated, [updatedUser]] = await User.update(
    updateData,
    {
      where: { user_id: userId },
      returning: true,
      validate: true,
      transaction
    }
  );

  return updatedUser;
};

/**
 * Deactivate user (soft delete)
 */
const deactivate = async (userId, transaction = null) => {
  const [rowsUpdated] = await User.update(
    { is_active: false },
    { 
      where: { user_id: userId },
      transaction 
    }
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
      transaction 
    }
  );

  return rowsUpdated > 0;
};

/**
 * Delete user (hard delete)
 */
const deleteUser = async (userId, transaction = null) => {
  const deleted = await User.destroy({
    where: { user_id: userId },
    transaction
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
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = options;

  const where = {};

  if (filters.email) {
    where.email = { [Op.iLike]: `${filters.email}%` };
  }

  if (filters.name) {
    where[Op.or] = [
      { name: { [Op.iLike]: `${filters.name}%` } },
      { surname: { [Op.iLike]: `${filters.name}%` } },
      { full_name: { [Op.iLike]: `${filters.name}%` } }
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
      exclude: ['password_hash', 'reset_token', 'reset_token_expire'] 
    },
    include: [{
      model: sequelize.models.sys_role,
      as: 'role',
      attributes: ['role_id', 'role_name']
    }],
    limit,
    offset: (page - 1) * limit,
    order: [[sortBy, sortOrder]]
  });

  return {
    users: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit)
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
  return await User.bulkCreate(usersData, { 
    transaction,
    validate: true 
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
      transaction 
    }
  );

  return rowsUpdated > 0;
};

export const UserModel = {
  findById,
  findByEmail,
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
  updateRole
};

export default UserModel;