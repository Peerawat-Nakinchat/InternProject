// src/middleware/security/rateLimiters.js
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisClient from '../../config/redis.js'; 

// ✅ Helper: สร้าง Store เชื่อมกับ Redis (Lazy Init)
const createRedisStore = (prefix) => new RedisStore({
  sendCommand: (...args) => redisClient.sendCommand(args),
  prefix: prefix,
});

// ✅ Helper: Lazy Initialization Wrapper
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

// --- Config ---

export const inviteLimiter = createLazyLimiter({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 10, 
  message: {
    success: false,
    error: "คุณส่งคำเชิญบ่อยเกินไป กรุณารอสักครู่ (Spam Protection)"
  },
  standardHeaders: true,
  legacyHeaders: false,
}, 'rl:invite:'); 

export const acceptLimiter = createLazyLimiter({
  windowMs: 60 * 60 * 1000, 
  max: 10, 
  message: {
    success: false,
    error: "มีการพยายามเข้าถึงมากเกินไป กรุณาลองใหม่ภายหลัง"
  },
  standardHeaders: true,
  legacyHeaders: false,
}, 'rl:accept:'); 