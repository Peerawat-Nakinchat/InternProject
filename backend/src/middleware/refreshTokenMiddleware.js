import { verifyToken, generateAccessToken, generateRefreshToken } from '../utils/token.js';
import AUTH_CONFIG from '../config/auth.js';
import { TokenModel } from '../models/TokenModel.js';

const REFRESH_TOKEN_SECRET = AUTH_CONFIG.REFRESH_TOKEN_SECRET;

const refreshAccessToken = async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ success: false, message: 'ต้องส่ง Refresh Token' });
    }

    try {
        // 1. ตรวจสอบลายเซ็น token
        const decoded = verifyToken(refreshToken, REFRESH_TOKEN_SECRET);

        if (!decoded?.user_id) {
            return res.status(403).json({ success: false, message: 'Refresh Token ไม่ถูกต้อง' });
        }

        // 2. ตรวจสอบว่า token อยู่ใน DB (ไม่ถูกลบ)
        const saved = await TokenModel.findRefreshToken(refreshToken);

        if (!saved) {
            return res.status(403).json({
                success: false,
                message: 'Refresh Token ไม่มีอยู่ในระบบหรือถูกเพิกถอนแล้ว'
            });
        }

        // 3. ออก Access Token ใหม่
        const newAccessToken = generateAccessToken({
            user_id: decoded.user_id,
            role_id: decoded.role_id
        });

        // 4. ออก Refresh Token ใหม่ (Rotation)
        const newRefreshToken = generateRefreshToken({
            user_id: decoded.user_id,
            role_id: decoded.role_id
        });

        // 5. ลบ token เดิมออก
        await TokenModel.deleteRefreshToken(refreshToken);

        // 6. บันทึก token ใหม่
        await TokenModel.saveRefreshToken(decoded.user_id, newRefreshToken);

        return res.status(200).json({
            success: true,
            message: 'Token ใหม่ถูกสร้างแล้ว',
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        });

    } catch (err) {
        return res.status(403).json({
            success: false,
            message: 'Refresh Token ไม่ถูกต้องหรือหมดอายุ'
        });
    }
};

export { refreshAccessToken };
