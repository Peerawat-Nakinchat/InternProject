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

    const stored = await TokenModel.findRefreshToken(refreshToken);
    if (!stored) {
      return res.status(401).json({ success: false, message: 'Refresh Token ถูกเพิกถอน' });
    }

    const newAccessToken = generateAccessToken(decoded.user_id);
    res.locals.newAccessToken = newAccessToken;

    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
};


export default refreshAccessToken ;
