// src/config/redis.js
import { createClient } from "redis";
import logger from "../utils/logger.js";

// ✅ Track Redis connection status for fallback logic
let isRedisConnected = false;

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 5) {
        // Stop trying after 5 retries in dev mode
        logger.warn("⚠️ Redis connection failed - using in-memory fallback");
        return false; // Stop reconnecting
      }
      return Math.min(retries * 100, 3000);
    },
  },
});

redisClient.on("error", (err) => {
  if (isRedisConnected) {
    logger.error("❌ Redis Client Error:", err);
  }
  isRedisConnected = false;
});

redisClient.on("connect", () => {
  logger.info("✅ Redis Client Connected");
  isRedisConnected = true;
});

redisClient.on("end", () => {
  isRedisConnected = false;
});

/**
 * ✅ Connect to Redis with graceful fallback
 * - If Redis is available: use Redis
 * - If Redis is not available: continue without crashing (use in-memory fallback)
 */
export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
      isRedisConnected = true;
    } catch (err) {
      logger.warn(
        "⚠️ Redis not available - rate limiting will use in-memory store",
      );
      logger.warn(
        "   To use Redis, run: docker compose -f docker/docker-compose.yml up -d redis",
      );
      isRedisConnected = false;
      // ✅ Don't exit - allow app to continue with in-memory fallback
    }
  }
};

/**
 * ✅ Check if Redis is connected
 * Other modules use this to decide whether to use RedisStore or MemoryStore
 */
export const isConnected = () => isRedisConnected;

export default redisClient;
