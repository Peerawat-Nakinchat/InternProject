// src/utils/token.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import logger from "../utils/logger.js";

// ==========================================
// ✅ New Function: สำหรับ MFA หรือ Custom Payload
// ==========================================
/**
 * สร้าง JWT Token แบบกำหนด Payload เองได้ (ใช้สำหรับ MFA Temp Token)
 * @param {Object} payload - ข้อมูลที่จะใส่ใน Token
 * @param {string} [expiresIn] - เวลาหมดอายุ (เช่น '5m')
 */
export const signAccessToken = (payload, expiresIn = null) => {
    if (!process.env.ACCESS_TOKEN_SECRET) {
        throw new Error('ACCESS_TOKEN_SECRET not configured');
    }
    
    const options = {
        expiresIn: expiresIn || process.env.ACCESS_EXPIRES || '15m'
    };

    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, options);
};

// ==========================================
// ✅ Legacy Function: สำหรับ Login/Register ปกติ
// (คงไว้เพื่อให้ AuthService.js ไม่พัง)
// ==========================================
export const generateAccessToken = (userId) => {
    // เรียกใช้ logic เดียวกัน แต่ wrap userId ให้เหมือนเดิม
    return signAccessToken({ user_id: userId });
};

// ==========================================
// ✅ Refresh Token Function
// ==========================================
export const generateRefreshToken = (userId) => {
    if (!process.env.REFRESH_TOKEN_SECRET) {
        throw new Error('REFRESH_TOKEN_SECRET not configured');
    }
    return jwt.sign(
        { user_id: userId },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_EXPIRES || '7d' }
    );
};

// ฟังก์ชันเดิมสำหรับ MFA ในแบบที่คุณต้องการ (ถ้า AuthService มีการเรียกใช้ชื่อนี้)
export const signRefreshToken = (payload, expiresIn = null) => {
     if (!process.env.REFRESH_TOKEN_SECRET) {
        throw new Error('REFRESH_TOKEN_SECRET not configured');
    }
    const options = {
        expiresIn: expiresIn || process.env.REFRESH_EXPIRES || '7d'
    };
    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, options);
}


// ==========================================
// ✅ Verify Functions
// ==========================================
export const verifyAccessToken = (token) => {
    try {
        if (!process.env.ACCESS_TOKEN_SECRET) {
            throw new Error('ACCESS_TOKEN_SECRET not configured');
        }
        return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
        if (error.name !== 'TokenExpiredError') {
            logger.error('❌ Token verification failed:', error.message);
        }
        return null;
    }
};

export const verifyRefreshToken = (token) => {
    try {
        if (!process.env.REFRESH_TOKEN_SECRET) {
            throw new Error('REFRESH_TOKEN_SECRET not configured');
        }
        return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
        logger.error('❌ Refresh token verification failed:', error.message);
        return null;
    }
};

// ==========================================
// ✅ Utility Functions
// ==========================================
export const generateSecureToken = () => {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    return { token, hashedToken };
};

export const hashToken = (token) => {
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
};

export default {
    signAccessToken,     
    generateAccessToken, 
    generateRefreshToken,
    signRefreshToken,    
    verifyAccessToken,
    verifyRefreshToken,
    generateSecureToken,
    hashToken,
};