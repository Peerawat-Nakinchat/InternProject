// src/config/__tests__/redis.test.js

import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

// --- 1. Setup Absolute Paths ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const redisConfigPath = path.resolve(__dirname, '../../src/config/redis.js');
const loggerPath = path.resolve(__dirname, '../../src/utils/logger.js');

// --- 2. Create Mock Objects (Defined OUTSIDE to be accessible everywhere) ---
const mRedisClient = {
  on: jest.fn(),
  connect: jest.fn(),
  isOpen: false,
};

// --- 3. Mock Modules ---
// ✅ แก้ไขจุดตาย: กำหนดให้ createClient คืนค่า mRedisClient ทันทีที่ถูกเรียก
await jest.unstable_mockModule('redis', () => ({
  createClient: jest.fn(() => mRedisClient), 
}));

await jest.unstable_mockModule(loggerPath, () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
  }
}));

describe('Redis Configuration', () => {
  let redisClient;
  let connectRedis;
  let logger;
  let mockExit;

  beforeEach(async () => {
    jest.resetModules(); // Clear cache
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

    // Clear previous mock calls
    jest.clearAllMocks();
    mRedisClient.on.mockClear();
    mRedisClient.connect.mockClear();
    
    // Reset state
    mRedisClient.isOpen = false;
    
    // Import Modules dynamically with query string to force reload (เหมือน auth.test)
    const uniqueId = Date.now(); 
    const redisConfigModule = await import(`${redisConfigPath}?t=${uniqueId}`);
    redisClient = redisConfigModule.default;
    connectRedis = redisConfigModule.connectRedis;

    const loggerModule = await import(loggerPath);
    logger = loggerModule.default;
  });

  afterEach(() => {
    mockExit.mockRestore();
  });

  describe('Client Creation', () => {
    it('should create a redis client with default or env URL', async () => {
        const redisModule = await import('redis');
        expect(redisModule.createClient).toHaveBeenCalled();
        
        const config = redisModule.createClient.mock.calls[0][0];
        expect(config).toHaveProperty('url');
        expect(config).toHaveProperty('socket.reconnectStrategy');
    });

    it('should validate reconnect strategy logic', async () => {
        const redisModule = await import('redis');
        const config = redisModule.createClient.mock.calls[0][0];
        const strategy = config.socket.reconnectStrategy;

        expect(strategy(1)).toBe(100);
        expect(strategy(5)).toBe(500);
        expect(strategy(20)).toBe(2000); // Max cap logic

        const errorResult = strategy(21);
        expect(logger.error).toHaveBeenCalledWith('❌ Redis connection retries exhausted');
        expect(errorResult).toBeInstanceOf(Error);
    });
  });

  describe('Event Handlers', () => {
    it('should log error on "error" event', () => {
      // redisClient.on ถูกเรียกตอน import ไฟล์
      // เราจึงไปเช็ค mock calls ของ mRedisClient
      const onCalls = mRedisClient.on.mock.calls;
      const errorEventHandler = onCalls.find(call => call[0] === 'error')?.[1];

      if (errorEventHandler) {
        const testError = new Error('Test Connection Error');
        errorEventHandler(testError);
        expect(logger.error).toHaveBeenCalledWith('❌ Redis Client Error:', testError);
      } else {
         throw new Error('Error event handler not registered');
      }
    });

    it('should log info on "connect" event', () => {
      const onCalls = mRedisClient.on.mock.calls;
      const connectEventHandler = onCalls.find(call => call[0] === 'connect')?.[1];

      if (connectEventHandler) {
        connectEventHandler();
        expect(logger.info).toHaveBeenCalledWith('✅ Redis Client Connected');
      } else {
        throw new Error('Connect event handler not registered');
      }
    });
  });

  describe('connectRedis function', () => {
    it('should connect if client is not open', async () => {
      // Override mock implementation for this specific test
      // ในไฟล์จริง check redisClient.isOpen
      // เราต้องปรับค่า isOpen ที่ตัว mock object หลัก เพราะ redisClient คือตัวเดียวกัน
      redisClient.isOpen = false; 
      
      await connectRedis();

      expect(mRedisClient.connect).toHaveBeenCalledTimes(1);
    });

    it('should NOT connect if client is already open', async () => {
      redisClient.isOpen = true; // Simulate open

      await connectRedis();

      expect(mRedisClient.connect).not.toHaveBeenCalled();
    });

    it('should log error and exit process if connection fails', async () => {
      redisClient.isOpen = false;
      const connectionError = new Error('Connection Refused');
      
      // สั่งให้ connect พังเฉพาะรอบนี้
      mRedisClient.connect.mockRejectedValueOnce(connectionError);

      await connectRedis();

      expect(logger.error).toHaveBeenCalledWith('❌ Failed to connect to Redis:', connectionError);
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});