// __tests__/config/supabase.test.js
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

// --- 1. Setup Absolute Paths ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const supabaseConfigPath = path.resolve(__dirname, '../../src/config/supabase.js');
const loggerPath = path.resolve(__dirname, '../../src/utils/logger.js');

// --- 2. Create Global Mocks (ประกาศตัวแปร Mock ไว้ตรงนี้ เพื่อให้ Reference คงที่) ---
const mockCreateClient = jest.fn();
const mockLoggerWarn = jest.fn();

// --- 3. Mock Modules ---
// เชื่อม Mock Module ให้ชี้มาที่ตัวแปร Global ของเรา
await jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

await jest.unstable_mockModule(loggerPath, () => ({
  default: {
    warn: mockLoggerWarn,
  }
}));

describe('Supabase Configuration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules(); // ล้าง Cache
    
    // Clear Mock History (สำคัญมาก: ล้างค่าก่อนเริ่ม test ใหม่)
    mockCreateClient.mockClear();
    mockLoggerWarn.mockClear();

    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // Helper function
  const loadSupabaseConfig = async () => {
    return import(`${supabaseConfigPath}?t=${Date.now()}`);
  };

  describe('Initialization Success', () => {
    it('should create Supabase client when credentials are provided', async () => {
      process.env.SUPABASE_URL = 'https://example.supabase.co';
      process.env.SUPABASE_ANON_KEY = 'test-key-123';

      const module = await loadSupabaseConfig();

      // ตรวจสอบที่ตัวแปร Global mockCreateClient โดยตรง
      expect(mockCreateClient).toHaveBeenCalledWith('https://example.supabase.co', 'test-key-123');
      expect(mockCreateClient).toHaveBeenCalledTimes(1);
      expect(module.supabase).not.toBeNull();
      expect(mockLoggerWarn).not.toHaveBeenCalled();
    });
  });

  describe('Initialization Failure (Missing Config)', () => {
    it('should log warning and return null if SUPABASE_URL is missing', async () => {
      delete process.env.SUPABASE_URL;
      process.env.SUPABASE_ANON_KEY = 'test-key';

      const module = await loadSupabaseConfig();

      expect(mockCreateClient).not.toHaveBeenCalled();
      expect(module.supabase).toBeNull();
      // ตรวจสอบที่ตัวแปร Global mockLoggerWarn
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.stringContaining('Supabase credentials not configured')
      );
    });

    it('should log warning and return null if SUPABASE_ANON_KEY is missing', async () => {
      process.env.SUPABASE_URL = 'https://example.supabase.co';
      delete process.env.SUPABASE_ANON_KEY;

      const module = await loadSupabaseConfig();

      expect(mockCreateClient).not.toHaveBeenCalled();
      expect(module.supabase).toBeNull();
      expect(mockLoggerWarn).toHaveBeenCalled();
    });

    it('should log warning and return null if BOTH are missing', async () => {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_ANON_KEY;

      const module = await loadSupabaseConfig();

      expect(mockCreateClient).not.toHaveBeenCalled();
      expect(module.supabase).toBeNull();
      expect(mockLoggerWarn).toHaveBeenCalled();
    });
  });
});