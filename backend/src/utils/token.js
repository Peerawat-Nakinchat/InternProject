// src/utils/token.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const verifyAccessToken = (token) => {
    try {
        if (!process.env.ACCESS_TOKEN_SECRET) {
            throw new Error('ACCESS_TOKEN_SECRET not configured');
        }
        return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
        console.error('❌ Token verification failed:', error.message);
        return null;
    }
};

export const generateAccessToken = (userId) => {
    if (!process.env.ACCESS_TOKEN_SECRET) {
        throw new Error('ACCESS_TOKEN_SECRET not configured');
    }
    return jwt.sign(
        { user_id: userId },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_EXPIRES || '15m' }
    );
};

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

export const verifyRefreshToken = (token) => {
    try {
        if (!process.env.REFRESH_TOKEN_SECRET) {
            throw new Error('REFRESH_TOKEN_SECRET not configured');
        }
        return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
        console.error('❌ Refresh token verification failed:', error.message);
        return null;
    }
};


/**
 * สร้าง Random Token และค่า Hash สำหรับเก็บลง DB
 * @returns { token: string, hashedToken: string }
 */
export const generateSecureToken = () => {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    return { token, hashedToken };
};

/**
 * Hash Token ที่รับมาจาก User เพื่อนำไปค้นหาใน DB
 * @param {string} token - token ดิบที่ user ส่งมา
 * @returns {string} - token ที่ hash แล้ว
 */
export const hashToken = (token) => {
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
};