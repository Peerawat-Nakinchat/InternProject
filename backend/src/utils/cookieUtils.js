// src/utils/cookieUtils.js
/**
 * Utility functions สำหรับจัดการ HTTP Cookies อย่างปลอดภัย
 * ตาม ISO 27001 Annex A.8 - Application Security
 * Security Update: Enhanced Environment Checks & Zero Trust Defaults
 */

// 1. Logic ตรวจสอบ Environment ที่รัดกุมขึ้น (ป้องกัน error จาก trailing spaces)
const ENV = (process.env.NODE_ENV || 'development').trim().toLowerCase();
const isProduction = ENV === 'production';

/**
 * ระดับความปลอดภัยของ Cookie (Secure Flag):
 * - Default: ตาม Environment (Production = true)
 * - Override: สามารถบังคับค่าผ่าน env COOKIE_SECURE ได้ (เช่น กรณี Test บน HTTPS หรือ Prod หลัง Reverse Proxy)
 */
const secureCookie = process.env.COOKIE_SECURE 
  ? process.env.COOKIE_SECURE === 'true' 
  : isProduction;

/**
 * SameSite Strategy (CSRF Protection):
 * - 'Strict': ปลอดภัยสุด (แนะนำถ้า Frontend/Backend อยู่ Domain เดียวกันเป๊ะ)
 * - 'Lax': เหมาะสำหรับเว็บทั่วไป (รองรับ Link จากภายนอก)
 * - Default: Production ใช้ 'strict' (หรือตาม env), Development ใช้ 'lax'
 */
const sameSiteStrategy = process.env.COOKIE_SAME_SITE 
  ? process.env.COOKIE_SAME_SITE 
  : (isProduction ? 'strict' : 'lax');

/**
 * Base Cookie Options - ใช้เป็นมาตรฐานสำหรับทุก Cookie
 */
const BASE_COOKIE_OPTIONS = {
  httpOnly: true,       // บังคับเสมอ: ป้องกัน XSS (JavaScript เข้าถึงไม่ได้)
  secure: secureCookie, // ส่งผ่าน HTTPS เท่านั้น (ถ้าเป็น Production หรือ config ไว้)
  sameSite: sameSiteStrategy, // ป้องกัน CSRF
  path: '/',            // ขอบเขต Cookie
};

/**
 * Cookie options สำหรับ Access Token
 * - maxAge: 15 นาที (เท่ากับ access token expiry)
 */
export const ACCESS_TOKEN_COOKIE_OPTIONS = {
  ...BASE_COOKIE_OPTIONS,
  maxAge: 15 * 60 * 1000, // 15 นาที
};

/**
 * Cookie options สำหรับ Refresh Token
 * - maxAge: 7 วัน (เท่ากับ refresh token expiry)
 */
export const REFRESH_TOKEN_COOKIE_OPTIONS = {
  ...BASE_COOKIE_OPTIONS,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 วัน
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
 * Set เฉพาะ access token cookie (สำหรับ refresh flow)
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
  // Clear โดยระบุ option ให้ตรงกับตอน Set เพื่อความชัวร์
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, { path: '/' });
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, { path: '/' });
};

/**
 * Get access token จาก cookies หรือ Authorization header (fallback)
 * @param {Request} req - Express request object
 * @returns {string|null} - Access token หรือ null
 */
export const getAccessToken = (req) => {
  // 1. ตรวจสอบจาก cookie ก่อน (preferred for web)
  if (req.cookies && req.cookies[COOKIE_NAMES.ACCESS_TOKEN]) {
    return req.cookies[COOKIE_NAMES.ACCESS_TOKEN];
  }
  
  // 2. Fallback: ตรวจสอบจาก Authorization header (สำหรับ Mobile/API clients)
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
  
  // 2. Fallback: ตรวจสอบจาก body (สำหรับ backward compatibility/mobile)
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