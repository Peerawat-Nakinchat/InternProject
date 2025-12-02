// src/middleware/refreshTokenMiddleware.js
import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from '../utils/token.js';
import { RefreshTokenModel } from '../models/TokenModel.js';
import { UserModel } from '../models/UserModel.js';
import { securityLogger } from '../utils/logger.js';
import { 
  getRefreshToken as getRefreshTokenFromRequest, 
  setAuthCookies, 
  setAccessTokenCookie,
  clearAuthCookies 
} from '../utils/cookieUtils.js';

/**
 * Factory for Refresh Token Middleware
 */
export const createRefreshTokenMiddleware = (deps = {}) => {
  // Inject Dependencies (Default to real implementations)
  const verifyToken = deps.verifyRefreshToken || verifyRefreshToken;
  const genAccess = deps.generateAccessToken || generateAccessToken;
  const genRefresh = deps.generateRefreshToken || generateRefreshToken;
  const TokenModel = deps.RefreshTokenModel || RefreshTokenModel;
  const User = deps.UserModel || UserModel;
  const logger = deps.securityLogger || securityLogger;
  const getToken = deps.getRefreshToken || getRefreshTokenFromRequest;
  const cookies = deps.cookieUtils || { setAuthCookies, setAccessTokenCookie, clearAuthCookies };

  // Environment variable mock (for testing)
  const env = deps.env || process.env;

  /**
   * Middleware: Refresh Access Token
   */
  const refreshAccessToken = async (req, res) => {
    try {
      const refreshToken = getToken(req);

      if (!refreshToken) {
        return res.status(400).json({ 
          success: false, 
          message: 'Refresh token required' 
        });
      }

      // Verify token signature
      const decoded = verifyToken(refreshToken);
      if (!decoded || !decoded.user_id) {
        logger.suspiciousActivity(
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

      // Check user
      const user = await User.findById(decoded.user_id);
      if (!user) {
        logger.suspiciousActivity(
          'Refresh token for non-existent user',
          req.clientInfo?.ipAddress || req.ip,
          req.clientInfo?.userAgent || 'unknown',
          { userId: decoded.user_id }
        );

        return res.status(401).json({ success: false, message: 'User not found' });
      }

      if (!user.is_active) {
        logger.suspiciousActivity(
          'Refresh token attempt for inactive account',
          req.clientInfo?.ipAddress || req.ip,
          req.clientInfo?.userAgent || 'unknown',
          { userId: user.user_id, email: user.email }
        );

        return res.status(401).json({ success: false, message: 'Account is inactive' });
      }

      // Check token in DB
      const storedToken = await TokenModel.findRefreshToken(refreshToken);
      if (!storedToken) {
        logger.suspiciousActivity(
          'Revoked or non-existent refresh token used',
          req.clientInfo?.ipAddress || req.ip,
          req.clientInfo?.userAgent || 'unknown',
          { userId: decoded.user_id }
        );

        return res.status(401).json({ success: false, message: 'Refresh token has been revoked' });
      }

      // Generate new tokens
      const newAccessToken = genAccess({
        user_id: user.user_id,
        email: user.email,
        role_id: user.role_id
      });

      const enableTokenRotation = env.ENABLE_TOKEN_ROTATION === 'true';
      let newRefreshToken = null;

      if (enableTokenRotation) {
        newRefreshToken = genRefresh({
          user_id: user.user_id,
          role_id: user.role_id
        });

        await TokenModel.rotateToken(refreshToken, user.user_id, newRefreshToken);
      }

      // Set Cookies
      if (enableTokenRotation && newRefreshToken) {
        cookies.setAuthCookies(res, newAccessToken, newRefreshToken);
      } else {
        cookies.setAccessTokenCookie(res, newAccessToken);
      }

      const response = { success: true, accessToken: newAccessToken };
      if (enableTokenRotation && newRefreshToken) {
        response.refreshToken = newRefreshToken;
      }

      return res.status(200).json(response);

    } catch (err) {
      console.error('❌ Refresh token error:', err);
      cookies.clearAuthCookies(res);

      logger.suspiciousActivity(
        'Refresh token processing error',
        req.clientInfo?.ipAddress || req.ip,
        req.clientInfo?.userAgent || 'unknown',
        { error: err.message }
      );

      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, message: 'Invalid token format' });
      }
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Refresh token expired' });
      }

      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };

  /**
   * Middleware: Validate Refresh Token Only
   */
  const validateRefreshToken = async (req, res, next) => {
    try {
      const refreshToken = getToken(req);

      if (!refreshToken) {
        return res.status(400).json({ success: false, message: 'Refresh token required' });
      }

      const decoded = verifyToken(refreshToken);
      if (!decoded) {
        return res.status(401).json({ success: false, valid: false, message: 'Invalid refresh token' });
      }

      const storedToken = await TokenModel.findRefreshToken(refreshToken);
      if (!storedToken) {
        return res.status(401).json({ success: false, valid: false, message: 'Token has been revoked' });
      }

      const user = await User.findById(decoded.user_id);
      if (!user || !user.is_active) {
        return res.status(401).json({ success: false, valid: false, message: 'User account is inactive' });
      }

      req.tokenData = { userId: decoded.user_id, valid: true };
      next();
    } catch (err) {
      console.error('❌ Validate refresh token error:', err);
      return res.status(401).json({ success: false, valid: false, message: 'Invalid token' });
    }
  };

  return { refreshAccessToken, validateRefreshToken };
};

// Default Export
const defaultInstance = createRefreshTokenMiddleware();
export const refreshAccessToken = defaultInstance.refreshAccessToken;
export const validateRefreshToken = defaultInstance.validateRefreshToken;
export default defaultInstance;