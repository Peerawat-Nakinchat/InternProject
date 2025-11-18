import { verifyAccessToken } from '../utils/token.js';
import { pool } from '../config/db.js';

/**
 * Middleware ป้องกัน route ด้วย Access Token
 */
const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'ไม่พบ Token, กรุณาเข้าสู่ระบบ' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verifyAccessToken(token); // payload จะมี { id: userId }

        if (!decoded || !decoded.id) {
            return res.status(401).json({ success: false, message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
        }

        const client = await pool.connect();
        try {
            const result = await client.query(
                'SELECT id, email, name, role_id, created_at, last_login FROM users WHERE id = $1',
                [decoded.id]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({ success: false, message: 'ไม่พบผู้ใช้งานในระบบ' });
            }

            const user = result.rows[0];
            req.user = user; // attach user object
            next();
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        return res.status(401).json({ success: false, message: 'ไม่ได้รับอนุญาตให้เข้าถึง' });
    }
};

/**
 * Middleware RBAC
 * @param {Array} roles - array ของ role_id ที่อนุญาต
 */
const authorize = (roles = []) => {
    // roles สามารถส่งเป็น string หรือ array ของ role_id
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'ไม่พบผู้ใช้งาน' });
        }

        if (!roles.includes(req.user.role_id)) {
            return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้' });
        }

        next();
    };
};

export {
    protect,
    authorize
};
