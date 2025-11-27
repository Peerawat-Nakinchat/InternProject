import { User } from './dbModels.js'; // Model ของ User
import { generateAccessToken } from './AuthController.js';

export const createNewAccessToken = async (req, res) => {
  try {
    const userId = req.refreshUserId;

    // ดึงข้อมูล user จากฐานข้อมูล
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "ไม่พบผู้ใช้งาน"
      });
    }

    // สร้าง access token จากข้อมูล user
    const newAccessToken = generateAccessToken(user.id); // หรือใช้ user object ขึ้นอยู่กับฟังก์ชัน

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
