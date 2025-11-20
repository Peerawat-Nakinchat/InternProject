import { verifyRefreshToken, generateAccessToken } from '../utils/token.js';
import { TokenModel } from '../models/TokenModel.js';
import { UserModel } from '../models/UserModel.js';

export const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken =
      req.body.refreshToken ||
      req.cookies?.refresh_token ||
      req.headers['x-refresh-token'];

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'ต้องส่ง Refresh Token' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded || !decoded.user_id) {
      return res.status(401).json({ success: false, message: 'Refresh Token ไม่ถูกต้องหรือหมดอายุ' });
    }

    // ตรวจว่าผู้ใช้นี้ยังมีอยู่จริง
    const user = await UserModel.findUserById(decoded.user_id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'ผู้ใช้นี้ไม่มีอยู่แล้ว' });
    }

    // ตรวจว่า refresh token ยังไม่ถูกเพิกถอน
    const stored = await TokenModel.findRefreshToken(refreshToken);
    if (!stored) {
      return res.status(401).json({ success: false, message: 'Refresh Token ถูกเพิกถอน' });
    }

    // ออก access token ใหม่
    const newAccessToken = generateAccessToken(decoded.user_id);

    return res.status(200).json({
      success: true,
      accessToken: newAccessToken
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
};
