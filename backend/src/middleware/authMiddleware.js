import { verifyAccessToken } from '../utils/token.js'; // <--- เปลี่ยนจาก verifyToken เป็น verifyAccessToken
import { UserModel } from '../models/UserModel.js'; // <--- เปลี่ยนจาก * as UserModel
import AUTH_CONFIG from '../config/auth.js';

const ACCESS_TOKEN_SECRET = AUTH_CONFIG.ACCESS_TOKEN_SECRET;

/**
 * Middleware to protect routes by verifying Access Token from the Authorization header.
 * Expected format: "Bearer <token>"
 */
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // 1. Verify token using the Access Token Secret
            const decoded = verifyAccessToken(token); // <--- เปลี่ยนจาก verifyToken เป็น verifyAccessToken (และไม่ต้องส่ง SECRET เพราะฟังก์ชันใช้ภายใน)

            if (!decoded || !decoded.user_id) {
                return res.status(401).json({ success: false, message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
            }

            // 2. Find user by ID and attach to request object
            const user = await UserModel.findById(decoded.user_id); // <--- เปลี่ยนจาก findUserById เป็น findById

            if (!user) {
                return res.status(401).json({ success: false, message: 'ไม่พบผู้ใช้งานในระบบ' });
            }

            // Remove sensitive data
            delete user.password_hash;
            
            req.user = user;
            req.user.role_id = decoded.role_id;
            req.user.user_id = decoded.user_id; 

            next();
        } catch (error) {
            console.error('Auth check error:', error);
            return res.status(401).json({ success: false, message: 'ไม่ได้รับอนุญาตให้เข้าถึง' });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'ไม่พบ Token, กรุณาเข้าสู่ระบบ' });
    }
};

export {
    protect,
};