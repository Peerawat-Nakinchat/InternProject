// src/middleware/otpRateLimiter.js
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redisClient from "../config/redis.js";

// ✅ Helper
const createRedisStore = (prefix) => new RedisStore({
  sendCommand: (...args) => redisClient.sendCommand(args),
  prefix: prefix,
});

// ✅ Lazy Initialization Wrapper
const createLazyLimiter = (options, prefix) => {
  let limiter;

  return (req, res, next) => {
    if (!limiter) {
      limiter = rateLimit({
        ...options,
        store: createRedisStore(prefix), 
      });
    }
    return limiter(req, res, next);
  };
};

// Config กลางสำหรับ Error Response และ Headers
const commonOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json({
      success: false,
      error: options.message,
      retryAfter: Math.ceil(options.windowMs / 1000)
    });
  }
};

/**
 * ✅ Rate limiter for sending OTP
 * - Max 3 requests per 15 minutes per email
 */
export const sendOtpLimiter = createLazyLimiter({
  ...commonOptions,
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 3,
  message: "คุณขอ OTP บ่อยเกินไป กรุณารอ 15 นาที",
  keyGenerator: (req) => `otp-send:${req.body?.email?.toLowerCase() || "unknown"}`,
  skip: (req) => !req.body?.email,
}, 'rl:otp-send:');

/**
 * ✅ Rate limiter for verifying OTP
 * - Max 5 attempts per 15 minutes per email
 */
export const verifyOtpLimiter = createLazyLimiter({
  ...commonOptions,
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 5,
  message: "คุณพยายามยืนยัน OTP บ่อยเกินไป กรุณารอ 15 นาที",
  keyGenerator: (req) => `otp-verify:${req.body?.email?.toLowerCase() || "unknown"}`,
  skip: (req) => !req.body?.email,
}, 'rl:otp-verify:');

/**
 * ✅ Rate limiter for resending OTP
 * - Max 2 requests per 15 minutes per email
 */
export const resendOtpLimiter = createLazyLimiter({
  ...commonOptions,
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 2,
  message: "คุณขอส่ง OTP ใหม่บ่อยเกินไป กรุณารอ 15 นาที",
  keyGenerator: (req) => `otp-resend:${req.body?.email?.toLowerCase() || "unknown"}`,
  skip: (req) => !req.body?.email,
}, 'rl:otp-resend:');

export default {
  sendOtpLimiter,
  verifyOtpLimiter,
  resendOtpLimiter,
};