import { User } from './dbModels.js'; 
import { generateAccessToken } from './AuthController.js';

export const createNewAccessToken = async (req, res) => {
  try {
    const userId = req.refreshUserId;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "ไม่พบผู้ใช้งาน"
      });
    }

    const newAccessToken = generateAccessToken(user.id); 

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
