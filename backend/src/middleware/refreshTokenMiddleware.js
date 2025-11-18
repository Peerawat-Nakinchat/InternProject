import { verifyRefreshToken, generateAccessToken } from '../utils/token.js';
import { TokenModel } from '../models/TokenModel.js';

export const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'ต้องส่ง Refresh Token' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded || !decoded.user_id) {
      return res.status(401).json({ success: false, message: 'Refresh Token ไม่ถูกต้องหรือหมดอายุ' });
    }

    // check token exists in DB
    const stored = await TokenModel.findRefreshToken(refreshToken);
    if (!stored) {
      return res.status(401).json({ success: false, message: 'Refresh Token ถูกเพิกถอน' });
    }

    // generate new access token
    const newAccessToken = generateAccessToken({ user_id: decoded.user_id, role_id: decoded.role_id, email: decoded.email });
    res.locals.newAccessToken = newAccessToken;
    next();
  } catch (error) {
    console.error('Refresh token middleware error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
};

export default { refreshAccessToken };
