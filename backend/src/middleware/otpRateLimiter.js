// src/middleware/otpRateLimiter.js
import rateLimit from "express-rate-limit";

/**
 * ✅ Rate limiter for sending OTP
 * - Max 3 requests per 15 minutes per email
 */
export const sendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  message: {
    success: false,
    error: "คุณขอ OTP บ่อยเกินไป กรุณารอ 15 นาที",
    retryAfter: 15,
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use email only for rate limiting (avoid IPv6 issues)
  keyGenerator: (req) => {
    const email = req.body?.email?.toLowerCase() || "unknown";
    return `otp-send-${email}`;
  },
  skip: (req) => {
    // Skip if no email provided (will fail validation anyway)
    return !req.body?.email;
  },
});

/**
 * ✅ Rate limiter for verifying OTP
 * - Max 5 attempts per 15 minutes per email
 */
export const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    error: "คุณพยายามยืนยัน OTP บ่อยเกินไป กรุณารอ 15 นาที",
    retryAfter: 15,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body?.email?.toLowerCase() || "unknown";
    return `otp-verify-${email}`;
  },
  skip: (req) => {
    return !req.body?.email;
  },
});

/**
 * ✅ Rate limiter for resending OTP
 * - Max 2 requests per 15 minutes per email (more strict)
 */
export const resendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2,
  message: {
    success: false,
    error: "คุณขอส่ง OTP ใหม่บ่อยเกินไป กรุณารอ 15 นาที",
    retryAfter: 15,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body?.email?.toLowerCase() || "unknown";
    return `otp-resend-${email}`;
  },
  skip: (req) => {
    return !req.body?.email;
  },
});

export default {
  sendOtpLimiter,
  verifyOtpLimiter,
  resendOtpLimiter,
};
