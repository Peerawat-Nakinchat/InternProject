// src/utils/token.js
import jwt from 'jsonwebtoken';

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