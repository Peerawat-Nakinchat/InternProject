import { User } from '../models/dbModels.js'; 
import { generateAccessToken } from '../utils/token.js';

/**
 * Factory function for creating TokenController with dependency injection
 * @param {Object} deps - Dependencies
 * @param {Object} deps.userModel - The User model (default: User)
 * @param {Function} deps.tokenGenerator - Function to generate access tokens (default: generateAccessToken)
 * @returns {Object} Controller methods
 */
export const createTokenController = (deps = {}) => {
  const userModel = deps.userModel || User;
  const tokenGenerator = deps.tokenGenerator || generateAccessToken;

  const createNewAccessToken = async (req, res) => {
    try {
      const userId = req.refreshUserId;

      const user = await userModel.findByPk(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "ไม่พบผู้ใช้งาน"
        });
      }

      const newAccessToken = tokenGenerator(user.id); 

      res.json({
        success: true,
        accessToken: newAccessToken
      });
    } catch (error) {
      console.error("Refresh token creation error:", error);
      res.status(500).json({
        success: false,
        error: "เกิดข้อผิดพลาดในการออก access token ใหม่"
      });
    }
  };

  return {
    createNewAccessToken
  };
};

// Create default instance for backward compatibility
const defaultController = createTokenController();

export const createNewAccessToken = defaultController.createNewAccessToken;
