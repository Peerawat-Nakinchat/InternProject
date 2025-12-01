// src/utils/cookieUtils.js
/**
 * Utility functions สำหรับจัดการ HTTP Cookies อย่างปลอดภัย
 * ตาม ISO 27001 Annex A.8 - Application Security
 */

// Cookie configuration สำหรับ tokens
const isProduction = process.env.NODE_ENV === 'development';

/**
 * Cookie options สำหรับ Access Token
 * - httpOnly: ป้องกัน XSS attacks (JavaScript ไม่สามารถอ่านได้)
 * - secure: ส่งผ่าน HTTPS เท่านั้น (ใน production)
 * - sameSite: ป้องกัน CSRF attacks
 * - maxAge: อายุ 15 นาที (เท่ากับ access token expiry)
 */
export const ACCESS_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction, // true ใน production (HTTPS only)
  sameSite: isProduction ? 'strict' : 'lax', // 'lax' สำหรับ development
  maxAge: 15 * 60 * 1000, // 15 นาที
  path: '/',
};

/**
 * Cookie options สำหรับ Refresh Token
 * - httpOnly: ป้องกัน XSS attacks
 * - secure: ส่งผ่าน HTTPS เท่านั้น (ใน production)
 * - sameSite: ป้องกัน CSRF attacks
 * - maxAge: อายุ 7 วัน (เท่ากับ refresh token expiry)
 */
export const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 วัน
  path: '/',
};

/**
 * Cookie names - ใช้ชื่อที่ไม่บอกข้อมูลมากเกินไป
 */
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
};

/**
 * Set authentication cookies ใน response
 * @param {Response} res - Express response object
 * @param {string} accessToken - JWT Access Token
 * @param {string} refreshToken - JWT Refresh Token
 */
export const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
};

/**
 * Set เฉพาะ access token cookie (สำหรับ refresh)
 * @param {Response} res - Express response object
 * @param {string} accessToken - JWT Access Token
 */
export const setAccessTokenCookie = (res, accessToken) => {
  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
};

/**
 * Clear authentication cookies (logout)
 * @param {Response} res - Express response object
 */
export const clearAuthCookies = (res) => {
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, { path: '/' });
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, { path: '/' });
};

/**
 * Get access token จาก cookies หรือ Authorization header (fallback)
 * @param {Request} req - Express request object
 * @returns {string|null} - Access token หรือ null
 */
export const getAccessToken = (req) => {
  // 1. ตรวจสอบจาก cookie ก่อน (preferred)
  if (req.cookies && req.cookies[COOKIE_NAMES.ACCESS_TOKEN]) {
    return req.cookies[COOKIE_NAMES.ACCESS_TOKEN];
  }
  
  // 2. Fallback: ตรวจสอบจาก Authorization header (สำหรับ API clients)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  
  return null;
};

/**
 * Get refresh token จาก cookies หรือ body (fallback)
 * @param {Request} req - Express request object
 * @returns {string|null} - Refresh token หรือ null
 */
export const getRefreshToken = (req) => {
  // 1. ตรวจสอบจาก cookie ก่อน (preferred)
  if (req.cookies && req.cookies[COOKIE_NAMES.REFRESH_TOKEN]) {
    return req.cookies[COOKIE_NAMES.REFRESH_TOKEN];
  }
  
  // 2. Fallback: ตรวจสอบจาก body (สำหรับ backward compatibility)
  if (req.body && req.body.refreshToken) {
    return req.body.refreshToken;
  }
  
  return null;
};

export default {
  COOKIE_NAMES,
  ACCESS_TOKEN_COOKIE_OPTIONS,
  REFRESH_TOKEN_COOKIE_OPTIONS,
  setAuthCookies,
  setAccessTokenCookie,
  clearAuthCookies,
  getAccessToken,
  getRefreshToken,
};
