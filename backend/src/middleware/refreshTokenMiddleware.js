import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from '../utils/token.js';
import { RefreshTokenModel } from '../models/TokenModel.js';
import { UserModel } from '../models/UserModel.js';
import { securityLogger } from '../utils/logger.js';

/**
 * Middleware to refresh access token using refresh token
 * Supports token rotation for enhanced security
 */
export const refreshAccessToken = async (req, res) => {
  try {
    // Extract refresh token from multiple sources
    const refreshToken =
      req.body.refreshToken ||
      req.cookies?.refresh_token ||
      req.headers['x-refresh-token'];

    if (!refreshToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'Refresh token required' 
      });
    }

    // Verify token signature
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded || !decoded.user_id) {
      securityLogger.suspiciousActivity(
        'Invalid refresh token attempt',
        req.clientInfo?.ipAddress || req.ip,
        req.clientInfo?.userAgent || 'unknown',
        { reason: 'Invalid signature or payload' }
      );

      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired refresh token' 
      });
    }

    // Check if user exists and is active (using Sequelize)
    const user = await UserModel.findById(decoded.user_id);
    if (!user) {
      securityLogger.suspiciousActivity(
        'Refresh token for non-existent user',
        req.clientInfo?.ipAddress || req.ip,
        req.clientInfo?.userAgent || 'unknown',
        { userId: decoded.user_id }
      );

      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Check if user account is active
    if (!user.is_active) {
      securityLogger.suspiciousActivity(
        'Refresh token attempt for inactive account',
        req.clientInfo?.ipAddress || req.ip,
        req.clientInfo?.userAgent || 'unknown',
        { userId: user.user_id, email: user.email }
      );

      return res.status(401).json({ 
        success: false, 
        message: 'Account is inactive' 
      });
    }

    // Check if refresh token exists in database (using Sequelize)
    const storedToken = await RefreshTokenModel.findRefreshToken(refreshToken);
    if (!storedToken) {
      securityLogger.suspiciousActivity(
        'Revoked or non-existent refresh token used',
        req.clientInfo?.ipAddress || req.ip,
        req.clientInfo?.userAgent || 'unknown',
        { userId: decoded.user_id }
      );

      return res.status(401).json({ 
        success: false, 
        message: 'Refresh token has been revoked' 
      });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken({
      user_id: user.user_id,
      email: user.email,
      role_id: user.role_id
    });

    // Optional: Token Rotation (more secure)
    // Generate new refresh token and revoke old one
    const enableTokenRotation = process.env.ENABLE_TOKEN_ROTATION === 'true';
    let newRefreshToken = null;

    if (enableTokenRotation) {
      newRefreshToken = generateRefreshToken({
        user_id: user.user_id,
        role_id: user.role_id
      });

      // Rotate token atomically
      await RefreshTokenModel.rotateToken(
        refreshToken,
        user.user_id,
        newRefreshToken
      );

      console.log('🔄 Token rotated for user:', user.user_id);
    }

    // Log successful token refresh
    console.log('✅ Access token refreshed:', {
      userId: user.user_id,
      email: user.email,
      rotated: enableTokenRotation
    });

    const response = {
      success: true,
      accessToken: newAccessToken
    };

    // Include new refresh token if rotation is enabled
    if (enableTokenRotation && newRefreshToken) {
      response.refreshToken = newRefreshToken;
    }

    return res.status(200).json(response);

  } catch (err) {
    console.error('❌ Refresh token error:', err);

    // Log error
    securityLogger.suspiciousActivity(
      'Refresh token processing error',
      req.clientInfo?.ipAddress || req.ip,
      req.clientInfo?.userAgent || 'unknown',
      { error: err.message }
    );

    // Distinguish between different error types
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token format' 
      });
    }

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Refresh token expired' 
      });
    }

    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

/**
 * Middleware to validate refresh token without refreshing
 * Useful for checking token validity
 */
export const validateRefreshToken = async (req, res, next) => {
  try {
    const refreshToken = 
      req.body.refreshToken ||
      req.cookies?.refresh_token ||
      req.headers['x-refresh-token'];

    if (!refreshToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'Refresh token required' 
      });
    }

    // Verify token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ 
        success: false, 
        valid: false,
        message: 'Invalid refresh token' 
      });
    }

    // Check if token exists in database
    const storedToken = await RefreshTokenModel.findRefreshToken(refreshToken);
    if (!storedToken) {
      return res.status(401).json({ 
        success: false, 
        valid: false,
        message: 'Token has been revoked' 
      });
    }

    // Check if user is active
    const user = await UserModel.findById(decoded.user_id);
    if (!user || !user.is_active) {
      return res.status(401).json({ 
        success: false, 
        valid: false,
        message: 'User account is inactive' 
      });
    }

    req.tokenData = {
      userId: decoded.user_id,
      valid: true
    };

    next();
  } catch (err) {
    console.error('❌ Validate refresh token error:', err);
    return res.status(401).json({ 
      success: false, 
      valid: false,
      message: 'Invalid token' 
    });
  }
};

export default {
  refreshAccessToken,
  validateRefreshToken
};