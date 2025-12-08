// src/middleware/security/rateLimiters.js
import rateLimit from 'express-rate-limit';

export const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10, 
  message: {
    success: false,
    error: "คุณส่งคำเชิญบ่อยเกินไป กรุณารอสักครู่ (Spam Protection)"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const acceptLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ชั่วโมง
  max: 10, // กดผิดได้ไม่เกิน 10 ครั้ง
  message: {
    success: false,
    error: "มีการพยายามเข้าถึงมากเกินไป กรุณาลองใหม่ภายหลัง"
  }
});