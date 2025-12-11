// src/config/redis.js
import { createClient } from 'redis';
import logger from '../utils/logger.js';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 20) {
        logger.error('❌ Redis connection retries exhausted');
        return new Error('Redis connection retries exhausted');
      }
      return Math.min(retries * 100, 3000);
    }
  }
});

redisClient.on('error', (err) => logger.error('❌ Redis Client Error:', err));
redisClient.on('connect', () => logger.info('✅ Redis Client Connected'));

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
    } catch (err) {
      logger.error('❌ Failed to connect to Redis:', err);
      process.exit(1);
    }
  }
};

export default redisClient;