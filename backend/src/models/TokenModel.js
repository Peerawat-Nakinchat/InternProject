import { RefreshToken, User } from './dbModels.js';
import crypto from 'crypto';

/**
 * RefreshTokenModel with Sequelize
 * เพิ่มความปลอดภัย: Hash tokens, Token rotation, Expiration
 */

// Hash token for storage (security best practice)
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const saveRefreshToken = async (userId, refreshToken, expiresAt = null) => {
  try {
    // Hash token before storing
    const hashedToken = hashToken(refreshToken);

    // Calculate expiration (default 7 days)
    const expiration = expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const token = await RefreshToken.create({
      user_id: userId,
      refresh_token: hashedToken,
      expires_at: expiration,
      created_at: new Date()
    });

    return token;
  } catch (error) {
    console.error('❌ Error saving refresh token:', error);
    throw error;
  }
};

const findRefreshToken = async (refreshToken) => {
  try {
    const hashedToken = hashToken(refreshToken);
    
    // ✅ ดึง Op มาจาก Model โดยตรง (แก้ปัญหา Invalid value)
    const Op = RefreshToken.sequelize.Sequelize.Op; 

    const token = await RefreshToken.findOne({
      where: {
        refresh_token: hashedToken,
        [Op.or]: [
          { expires_at: { [Op.gte]: new Date() } },
          { expires_at: null } // รองรับ tokens เก่าที่ไม่มี expires_at
        ]
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['user_id', 'email', 'is_active', 'role_id']
      }]
    });

    return token;
  } catch (error) {
    console.error('❌ Error finding refresh token:', error);
    throw error;
  }
};

const deleteRefreshToken = async (refreshToken) => {
  try {
    const hashedToken = hashToken(refreshToken);
    const deleted = await RefreshToken.destroy({
      where: { refresh_token: hashedToken }
    });
    return deleted > 0;
  } catch (error) {
    console.error('❌ Error deleting refresh token:', error);
    throw error;
  }
};
const deleteAllTokensForUser = async (userId) => {
  try {
    console.log("🗑️ Deleting all tokens for user:", userId);
    
    // คำสั่งนี้จะทำงานได้ปกติเมื่อไม่มี Op ที่ import ผิดมาตีกัน
    const deleted = await RefreshToken.destroy({
      where: { user_id: userId }
    });

    return deleted;
  } catch (error) {
    console.error('❌ Error deleting all tokens for user:', error);
    throw error;
  }
};
const cleanupExpiredTokens = async () => {
  try {
    // ✅ ดึง Op มาจาก Model โดยตรง
    const Op = RefreshToken.sequelize.Sequelize.Op;

    const deleted = await RefreshToken.destroy({
      where: {
        expires_at: {
          [Op.lt]: new Date()
        }
      }
    });

    console.log(`🧹 Cleaned up ${deleted} expired tokens`);
    return deleted;
  } catch (error) {
    console.error('❌ Error cleaning up expired tokens:', error);
    throw error;
  }
};

const getUserActiveTokens = async (userId) => {
  try {
    // ✅ ดึง Op มาจาก Model โดยตรง
    const Op = RefreshToken.sequelize.Sequelize.Op;

    const tokens = await RefreshToken.findAll({
      where: {
        user_id: userId,
        [Op.or]: [
          { expires_at: { [Op.gte]: new Date() } },
          { expires_at: null } // รองรับ tokens เก่าที่ไม่มี expires_at
        ]
      },
      attributes: ['token_id', 'created_at', 'expires_at'],
      order: [['created_at', 'DESC']]
    });

    return tokens;
  } catch (error) {
    console.error('❌ Error getting user active tokens:', error);
    throw error;
  }
};

// Revoke specific token by ID (for user to logout specific device)
const revokeTokenById = async (tokenId, userId) => {
  try {
    const deleted = await RefreshToken.destroy({
      where: {
        token_id: tokenId,
        user_id: userId // Ensure user owns the token
      }
    });

    return deleted > 0;
  } catch (error) {
    console.error('❌ Error revoking token:', error);
    throw error;
  }
};

// Token rotation: Delete old token and create new one
const rotateToken = async (oldRefreshToken, userId, newRefreshToken) => {
  try {
    // Use transaction for atomic operation
    const result = await RefreshToken.sequelize.transaction(async (t) => {
      // Delete old token
      await deleteRefreshToken(oldRefreshToken);

      // Create new token
      const newToken = await saveRefreshToken(userId, newRefreshToken);

      return newToken;
    });

    return result;
  } catch (error) {
    console.error('❌ Error rotating token:', error);
    throw error;
  }
};

// Get token statistics
const getTokenStats = async () => {
  try {
    const Op = RefreshToken.sequelize.Sequelize.Op;
    const total = await RefreshToken.count();
    const active = await RefreshToken.count({
      where: {
        [Op.or]: [
          { expires_at: { [Op.gte]: new Date() } },
          { expires_at: null } // รองรับ tokens เก่าที่ไม่มี expires_at
        ]
      }
    });
    const expired = total - active;

    return { total, active, expired };
  } catch (error) {
    console.error('❌ Error getting token stats:', error);
    throw error;
  }
};

export const RefreshTokenModel = {
  saveRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
  deleteAllTokensForUser,
  cleanupExpiredTokens,
  getUserActiveTokens,
  revokeTokenById,
  rotateToken,
  getTokenStats,
  hashToken // Export for testing
};