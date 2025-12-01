/**
 * Auth Configuration Unit Tests
 * ISO 27001 Annex A.8 - Security Configuration Testing
 * 
 * Tests all branches in auth.js for 95%+ branch coverage
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('AUTH_CONFIG - Branch Coverage', () => {
  const originalEnv = { ...process.env };
  let exitSpy;
  let errorSpy;

  beforeEach(() => {
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    exitSpy.mockRestore();
    errorSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('ACCESS_TOKEN_EXPIRES_IN Branches', () => {
    it('should use default 15m when ACCESS_TOKEN_EXPIRES_IN not set', async () => {
      process.env.ACCESS_TOKEN_SECRET = 'test-secret';
      process.env.REFRESH_TOKEN_SECRET = 'test-secret';
      delete process.env.ACCESS_TOKEN_EXPIRES_IN;
      
      const { AUTH_CONFIG } = await import('../../src/config/auth.js?expires-default');
      
      expect(AUTH_CONFIG.ACCESS_TOKEN_EXPIRES_IN).toBe('15m');
    });

    it('should use custom ACCESS_TOKEN_EXPIRES_IN from env', async () => {
      process.env.ACCESS_TOKEN_SECRET = 'test-secret';
      process.env.REFRESH_TOKEN_SECRET = 'test-secret';
      process.env.ACCESS_TOKEN_EXPIRES_IN = '30m';
      
      const { AUTH_CONFIG } = await import('../../src/config/auth.js?expires-custom');
      
      expect(AUTH_CONFIG.ACCESS_TOKEN_EXPIRES_IN).toBe('30m');
    });
  });

  describe('REFRESH_TOKEN_EXPIRES_IN Branches', () => {
    it('should use default 7d when REFRESH_TOKEN_EXPIRES_IN not set', async () => {
      process.env.ACCESS_TOKEN_SECRET = 'test-secret';
      process.env.REFRESH_TOKEN_SECRET = 'test-secret';
      delete process.env.REFRESH_TOKEN_EXPIRES_IN;
      
      const { AUTH_CONFIG } = await import('../../src/config/auth.js?refresh-default');
      
      expect(AUTH_CONFIG.REFRESH_TOKEN_EXPIRES_IN).toBe('7d');
    });

    it('should use custom REFRESH_TOKEN_EXPIRES_IN from env', async () => {
      process.env.ACCESS_TOKEN_SECRET = 'test-secret';
      process.env.REFRESH_TOKEN_SECRET = 'test-secret';
      process.env.REFRESH_TOKEN_EXPIRES_IN = '14d';
      
      const { AUTH_CONFIG } = await import('../../src/config/auth.js?refresh-custom');
      
      expect(AUTH_CONFIG.REFRESH_TOKEN_EXPIRES_IN).toBe('14d');
    });
  });

  describe('BCRYPT_SALT_ROUNDS Branches', () => {
    it('should use default 10 when BCRYPT_SALT_ROUNDS not set', async () => {
      process.env.ACCESS_TOKEN_SECRET = 'test-secret';
      process.env.REFRESH_TOKEN_SECRET = 'test-secret';
      delete process.env.BCRYPT_SALT_ROUNDS;
      
      const { AUTH_CONFIG } = await import('../../src/config/auth.js?bcrypt-default');
      
      expect(AUTH_CONFIG.BCRYPT_SALT_ROUNDS).toBe(10);
    });

    it('should use custom BCRYPT_SALT_ROUNDS from env', async () => {
      process.env.ACCESS_TOKEN_SECRET = 'test-secret';
      process.env.REFRESH_TOKEN_SECRET = 'test-secret';
      process.env.BCRYPT_SALT_ROUNDS = '12';
      
      const { AUTH_CONFIG } = await import('../../src/config/auth.js?bcrypt-custom');
      
      expect(AUTH_CONFIG.BCRYPT_SALT_ROUNDS).toBe(12);
    });

    it('should handle invalid BCRYPT_SALT_ROUNDS (NaN fallback to 10)', async () => {
      process.env.ACCESS_TOKEN_SECRET = 'test-secret';
      process.env.REFRESH_TOKEN_SECRET = 'test-secret';
      process.env.BCRYPT_SALT_ROUNDS = 'invalid';
      
      const { AUTH_CONFIG } = await import('../../src/config/auth.js?bcrypt-invalid');
      
      expect(AUTH_CONFIG.BCRYPT_SALT_ROUNDS).toBe(10);
    });
  });

  describe('Secret Validation Branches', () => {
    it('should have both secrets when properly configured', async () => {
      process.env.ACCESS_TOKEN_SECRET = 'my-access-secret';
      process.env.REFRESH_TOKEN_SECRET = 'my-refresh-secret';
      
      const { AUTH_CONFIG } = await import('../../src/config/auth.js?secrets-valid');
      
      expect(AUTH_CONFIG.ACCESS_TOKEN_SECRET).toBe('my-access-secret');
      expect(AUTH_CONFIG.REFRESH_TOKEN_SECRET).toBe('my-refresh-secret');
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('should exit when ACCESS_TOKEN_SECRET is missing', async () => {
      delete process.env.ACCESS_TOKEN_SECRET;
      process.env.REFRESH_TOKEN_SECRET = 'my-refresh-secret';
      
      try {
        await import('../../src/config/auth.js?access-missing');
      } catch (e) {
        // Module may throw or call process.exit
      }
      
      // Verify the validation behavior
      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should exit when REFRESH_TOKEN_SECRET is missing', async () => {
      process.env.ACCESS_TOKEN_SECRET = 'my-access-secret';
      delete process.env.REFRESH_TOKEN_SECRET;
      
      try {
        await import('../../src/config/auth.js?refresh-missing');
      } catch (e) {
        // Module may throw or call process.exit
      }
      
      // Verify the validation behavior
      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should exit when both secrets are missing', async () => {
      delete process.env.ACCESS_TOKEN_SECRET;
      delete process.env.REFRESH_TOKEN_SECRET;
      
      try {
        await import('../../src/config/auth.js?both-missing');
      } catch (e) {
        // Module may throw or call process.exit
      }
      
      // Verify the validation behavior
      expect(errorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('Static Configuration Values', () => {
    beforeEach(() => {
      process.env.ACCESS_TOKEN_SECRET = 'test-secret';
      process.env.REFRESH_TOKEN_SECRET = 'test-secret';
    });

    it('should have ACCESS_TOKEN_NAME as accessToken', async () => {
      const { AUTH_CONFIG } = await import('../../src/config/auth.js?token-name');
      expect(AUTH_CONFIG.ACCESS_TOKEN_NAME).toBe('accessToken');
    });

    it('should have REFRESH_TOKEN_NAME as refreshToken', async () => {
      const { AUTH_CONFIG } = await import('../../src/config/auth.js?refresh-name');
      expect(AUTH_CONFIG.REFRESH_TOKEN_NAME).toBe('refreshToken');
    });

    it('should export default AUTH_CONFIG', async () => {
      const module = await import('../../src/config/auth.js?default-export');
      expect(module.default).toBeDefined();
      expect(module.default.ACCESS_TOKEN_SECRET).toBeDefined();
    });
  });
});

describe('AUTH_CONFIG Security Compliance (ISO 27001)', () => {
  beforeEach(() => {
    process.env.ACCESS_TOKEN_SECRET = 'test-secret-123';
    process.env.REFRESH_TOKEN_SECRET = 'test-secret-456';
  });

  it('should require both secrets (defense in depth - A.8.24)', async () => {
    const { AUTH_CONFIG } = await import('../../src/config/auth.js?iso-secrets');
    
    expect(AUTH_CONFIG.ACCESS_TOKEN_SECRET).toBeDefined();
    expect(AUTH_CONFIG.REFRESH_TOKEN_SECRET).toBeDefined();
  });

  it('should use separate secrets for access and refresh tokens (A.8.12)', async () => {
    const { AUTH_CONFIG } = await import('../../src/config/auth.js?iso-separate');
    
    // Best practice: different secrets
    expect(AUTH_CONFIG.ACCESS_TOKEN_SECRET).not.toBe(AUTH_CONFIG.REFRESH_TOKEN_SECRET);
  });

  it('should have reasonable default token expiration (A.9.4)', async () => {
    delete process.env.ACCESS_TOKEN_EXPIRES_IN;
    delete process.env.REFRESH_TOKEN_EXPIRES_IN;
    
    const { AUTH_CONFIG } = await import('../../src/config/auth.js?iso-expiry');
    
    expect(AUTH_CONFIG.ACCESS_TOKEN_EXPIRES_IN).toBe('15m');
    expect(AUTH_CONFIG.REFRESH_TOKEN_EXPIRES_IN).toBe('7d');
  });

  it('should use strong bcrypt rounds (A.8.24)', async () => {
    const { AUTH_CONFIG } = await import('../../src/config/auth.js?iso-bcrypt');
    
    expect(AUTH_CONFIG.BCRYPT_SALT_ROUNDS).toBeGreaterThanOrEqual(10);
  });
});
