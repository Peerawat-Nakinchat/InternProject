// src/middleware/authMiddleware.js
import { verifyAccessToken } from '../utils/token.js';
import { pool } from '../config/db.js';

/**
 * Middleware ป้องกัน route ด้วย Access Token
 */
const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    // ✅ Debug: ตรวจสอบ Authorization Header
    console.log('🔐 Auth Middleware Debug:');
    console.log('  - Authorization Header:', authHeader ? 'มี' : 'ไม่มี');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('❌ ไม่มี Token หรือ format ผิด');
        return res.status(401).json({ 
            success: false, 
            message: 'ไม่พบ Token, กรุณาเข้าสู่ระบบ' 
        });
    }

    const token = authHeader.split(' ')[1];
    console.log('  - Token (first 20 chars):', token.substring(0, 20) + '...');

    try {
        const decoded = verifyAccessToken(token);
        console.log('  - Decoded Token:', decoded);

        if (!decoded || !decoded.user_id) {
            console.error('❌ Token decode ไม่สำเร็จหรือไม่มี user_id');
            return res.status(401).json({ 
                success: false, 
                message: 'Token ไม่ถูกต้องหรือหมดอายุ' 
            });
        }

        const client = await pool.connect();
        try {
            const result = await client.query(
                `SELECT 
                    user_id,
                    email,
                    name,
                    surname,
                    full_name,
                    role_id,
                    is_active,
                    created_at
                FROM sys_users 
                WHERE user_id = $1`,
                [decoded.user_id]
            );

            console.log('  - Query Result:', result.rows.length > 0 ? 'พบ user' : 'ไม่พบ user');

            if (result.rows.length === 0) {
                console.error('❌ ไม่พบ user ในฐานข้อมูล');
                return res.status(401).json({ 
                    success: false, 
                    message: 'ไม่พบผู้ใช้งานในระบบ' 
                });
            }

            const user = result.rows[0];

            // ตรวจสอบว่า account active หรือไม่
            if (user.is_active === false) {
                console.error('❌ Account inactive:', user.email);
                return res.status(401).json({ 
                    success: false, 
                    message: 'บัญชีนี้ถูกระงับการใช้งาน' 
                });
            }

            req.user = user;
            console.log('✅ Authentication สำเร็จ:', user.email);
            next();
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('💥 Auth check error:', error);
        return res.status(401).json({ 
            success: false, 
            message: 'ไม่ได้รับอนุญาตให้เข้าถึง',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Middleware ตรวจสอบสิทธิ์ในองค์กร
 * ใช้หลังจาก requireOrganization middleware
 */
export const checkOrgRole = (allowedRoles = []) => {
    return (req, res, next) => {
        // org_role_id จะถูกเพิ่มโดย requireOrganization middleware
        if (!req.user.org_role_id) {
            console.error('❌ ไม่พบ org_role_id ใน req.user');
            return res.status(403).json({ 
                success: false, 
                message: "ไม่พบสิทธิ์ของผู้ใช้งานในองค์กร" 
            });
        }

        if (!allowedRoles.includes(req.user.org_role_id)) {
            console.error('❌ org_role_id ไม่ตรงกับที่กำหนด:', {
                userRole: req.user.org_role_id,
                allowedRoles
            });
            return res.status(403).json({ 
                success: false, 
                message: "คุณไม่มีสิทธิ์ในองค์กรนี้" 
            });
        }

        console.log('✅ Organization role check passed');
        next();
    };
};

/**
 * Middleware RBAC สำหรับ System Role
 * @param {Array} roles - array ของ role_id ที่อนุญาต
 */
const authorize = (roles = []) => {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'ไม่พบผู้ใช้งาน' 
            });
        }

        if (!roles.includes(req.user.role_id)) {
            console.error('❌ System role ไม่ตรงกับที่กำหนด:', {
                userRole: req.user.role_id,
                allowedRoles: roles
            });
            return res.status(403).json({ 
                success: false, 
                message: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้' 
            });
        }

        console.log('✅ System role check passed');
        next();
    };
};

export {
    protect,
    authorize
};