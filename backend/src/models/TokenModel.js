// src/models/TokenModel.js
import sequelize from "../config/dbConnection.js";
import { DataTypes, Op } from 'sequelize';
import crypto from 'crypto';

// ==================== REFRESH TOKEN MODEL ====================
export const RefreshToken = sequelize.define('sys_refresh_tokens', {
  token_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  refresh_token: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  timestamps: false,
  tableName: 'sys_refresh_tokens'
});

/**
 * Hash token for secure storage
 */
const hashToken = (token) => {
  if (!token) {
    throw new Error('Token is required for hashing');
  }
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Create/save refresh token
 */
const create = async (data, transaction = null) => {
  // Validate input
  if (!data.userId) {
    throw new Error('userId is required');
  }
  if (!data.refreshToken) {
    throw new Error('refreshToken is required');
  }

  const hashedToken = hashToken(data.refreshToken);
  const expiration = data.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return await RefreshToken.create({
    user_id: data.userId,
    refresh_token: hashedToken,
    expires_at: expiration,
    created_at: new Date()
  }, { transaction });
};

/**
 * Find refresh token
 */
const findOne = async (refreshToken) => {
  const hashedToken = hashToken(refreshToken);
  
  return await RefreshToken.findOne({
    where: {
      refresh_token: hashedToken,
      expires_at: {
        [Op.gte]: new Date()
      }
    },
    include: [{
      model: User,
      as: 'user',
      attributes: ['user_id', 'email', 'is_active', 'role_id']
    }]
  });
};

/**
 * Find refresh token by token string only (no expiry check)
 */
const findByToken = async (refreshToken) => {
  const hashedToken = hashToken(refreshToken);
  
  return await RefreshToken.findOne({
    where: {
      refresh_token: hashedToken
    }
  });
};

/**
 * Find refresh token by ID
 */
const findById = async (tokenId) => {
  return await RefreshToken.findByPk(tokenId, {
    include: [{
      model: User,
      as: 'user',
      attributes: ['user_id', 'email', 'is_active']
    }]
  });
};

/**
 * Delete refresh token
 */
const deleteOne = async (refreshToken, transaction = null) => {
  const hashedToken = hashToken(refreshToken);
  
  const deleted = await RefreshToken.destroy({
    where: { refresh_token: hashedToken },
    transaction
  });

  return deleted > 0;
};

/**
 * Delete refresh token by ID
 */
const deleteById = async (tokenId, userId, transaction = null) => {
  const deleted = await RefreshToken.destroy({
    where: {
      token_id: tokenId,
      user_id: userId
    },
    transaction
  });

  return deleted > 0;
};

/**
 * Delete all tokens for user
 */
const deleteAllByUser = async (userId, transaction = null) => {
  const deleted = await RefreshToken.destroy({
    where: { user_id: userId },
    transaction
  });

  return deleted;
};

/**
 * Get all active tokens for user
 */
const findByUser = async (userId) => {
  return await RefreshToken.findAll({
    where: {
      user_id: userId,
      expires_at: {
        [Op.gte]: new Date()
      }
    },
    attributes: ['token_id', 'created_at', 'expires_at'],
    order: [['created_at', 'DESC']]
  });
};

/**
 * Cleanup expired tokens
 */
const deleteExpired = async (transaction = null) => {
  const deleted = await RefreshToken.destroy({
    where: {
      expires_at: {
        [Op.lt]: new Date()
      }
    },
    transaction
  });

  return deleted;
};

/**
 * Count tokens for user
 */
const countByUser = async (userId) => {
  return await RefreshToken.count({
    where: {
      user_id: userId,
      expires_at: {
        [Op.gte]: new Date()
      }
    }
  });
};

/**
 * Get token statistics
 */
const getStats = async () => {
  const total = await RefreshToken.count();
  
  const active = await RefreshToken.count({
    where: {
      expires_at: {
        [Op.gte]: new Date()
      }
    }
  });
  
  const expired = total - active;

  return { total, active, expired };
};

/**
 * Find tokens expiring soon
 */
const findExpiringSoon = async (hours = 24) => {
  const now = new Date();
  const threshold = new Date(now.getTime() + hours * 60 * 60 * 1000);

  return await RefreshToken.findAll({
    where: {
      expires_at: {
        [Op.between]: [now, threshold]
      }
    },
    include: [{
      model: User,
      as: 'user',
      attributes: ['user_id', 'email']
    }]
  });
};

/**
 * Update token expiration
 */
const updateExpiration = async (tokenId, newExpiresAt, transaction = null) => {
  const [rowsUpdated] = await RefreshToken.update(
    { expires_at: newExpiresAt },
    {
      where: { token_id: tokenId },
      transaction
    }
  );

  return rowsUpdated > 0;
};

/**
 * Bulk delete tokens
 */
const bulkDelete = async (tokenIds, transaction = null) => {
  const deleted = await RefreshToken.destroy({
    where: {
      token_id: { [Op.in]: tokenIds }
    },
    transaction
  });

  return deleted;
};

/**
 * Count all tokens
 */
const count = async (where = {}) => {
  return await RefreshToken.count({ where });
};

/**
 * Check if token exists
 */
const exists = async (refreshToken) => {
  const hashedToken = hashToken(refreshToken);
  
  const count = await RefreshToken.count({
    where: { refresh_token: hashedToken }
  });

  return count > 0;
};

export const RefreshTokenModel = {
  hashToken,
  create,
  findOne,
  findByToken,
  findById,
  deleteOne,
  deleteById,
  deleteAllByUser,
  findByUser,
  deleteExpired,
  countByUser,
  getStats,
  findExpiringSoon,
  updateExpiration,
  bulkDelete,
  count,
  exists
};

export default RefreshTokenModel;