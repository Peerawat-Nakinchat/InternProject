// src/middleware/security/rateLimiters.js
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redisClient, {
  isConnected as isRedisConnected,
} from "../../config/redis.js";

/**
 * ✅ Helper: Create rate limiter with Redis/Memory fallback
 * - If Redis is connected: use RedisStore
 * - If Redis is not connected: use built-in MemoryStore
 */
const createLazyLimiter = (options, prefix) => {
  let limiter;
  return (req, res, next) => {
    if (!limiter) {
      const storeConfig = isRedisConnected()
        ? {
            store: new RedisStore({
              sendCommand: (...args) => redisClient.sendCommand(args),
              prefix: prefix,
            }),
          }
        : {}; // MemoryStore is the default

      limiter = rateLimit({
        ...options,
        ...storeConfig,
      });
    }
    return limiter(req, res, next);
  };
};

// --- Config ---

export const inviteLimiter = createLazyLimiter(
  {
    windowMs: 15 * 60 * 1000, // 15 นาที
    max: 10,
    message: {
      success: false,
      error: "คุณส่งคำเชิญบ่อยเกินไป กรุณารอสักครู่ (Spam Protection)",
    },
    standardHeaders: true,
    legacyHeaders: false,
  },
  "rl:invite:",
);

export const acceptLimiter = createLazyLimiter(
  {
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
      success: false,
      error: "มีการพยายามเข้าถึงมากเกินไป กรุณาลองใหม่ภายหลัง",
    },
    standardHeaders: true,
    legacyHeaders: false,
  },
  "rl:accept:",
);
