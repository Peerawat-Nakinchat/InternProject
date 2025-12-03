/**
 * Token Utilities Unit Tests
 * ISO 27001 Annex A.8 - Authentication Token Security Testing
 * Target: Branch Coverage ≥ 96%
 * 
 * Tests JWT token generation and verification:
 * - Access token generation/verification
 * - Refresh token generation/verification
 * - Token expiration handling
 * - Error handling for invalid tokens
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import {
  verifyAccessToken,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from '../../src/utils/token.js';

// Save original console.error
const originalConsoleError = console.error;

describe('Token Utilities', () => {
  beforeEach(() => {
    // Mock console.error to prevent noise in test output
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  // ============================================================
  // GENERATE ACCESS TOKEN TESTS
  // ============================================================
  
  describe('generateAccessToken', () => {
    it('should generate a valid JWT access token', () => {
      const userId = 'test-user-123';
      const token = generateAccessToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should include user_id in token payload', () => {
      const userId = 'test-user-123';
      const token = generateAccessToken(userId);
      const decoded = jwt.decode(token);

      expect(decoded.user_id).toBe(userId);
    });

    it('should include expiration in token', () => {
      const userId = 'test-user-123';
      const token = generateAccessToken(userId);
      const decoded = jwt.decode(token);

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    it('should throw error if ACCESS_TOKEN_SECRET is not configured', () => {
      const originalSecret = process.env.ACCESS_TOKEN_SECRET;
      delete process.env.ACCESS_TOKEN_SECRET;

      expect(() => generateAccessToken('user-123')).toThrow('ACCESS_TOKEN_SECRET not configured');

      process.env.ACCESS_TOKEN_SECRET = originalSecret;
    });

    it('should generate unique tokens for same user', async () => {
      const userId = 'test-user-123';
      const token1 = generateAccessToken(userId);
      
      // Add delay to ensure different iat (JWT uses seconds, not milliseconds)
      await new Promise(resolve => setTimeout(resolve, 1100));
      const token2 = generateAccessToken(userId);

      // Tokens should be different due to iat timestamp
      expect(token1).not.toBe(token2);
    });

    it('should handle numeric userId', () => {
      const userId = 12345;
      const token = generateAccessToken(userId);
      const decoded = jwt.decode(token);

      expect(decoded.user_id).toBe(userId);
    });

    it('should handle empty string userId', () => {
      const userId = '';
      const token = generateAccessToken(userId);
      const decoded = jwt.decode(token);

      expect(decoded.user_id).toBe('');
    });

    it('should handle object userId', () => {
      const userId = { id: 'complex-user' };
      const token = generateAccessToken(userId);
      const decoded = jwt.decode(token);

      expect(decoded.user_id).toEqual(userId);
    });

    it('should use default expiry if ACCESS_EXPIRES is not set', () => {
      const originalExpires = process.env.ACCESS_EXPIRES;
      delete process.env.ACCESS_EXPIRES;

      const token = generateAccessToken('user-123');
      const decoded = jwt.decode(token);

      // Default is 15m = 900 seconds
      const tokenLifespan = decoded.exp - decoded.iat;
      expect(tokenLifespan).toBeLessThanOrEqual(900);

      process.env.ACCESS_EXPIRES = originalExpires;
    });

    it('should use custom expiry from ACCESS_EXPIRES', () => {
      const originalExpires = process.env.ACCESS_EXPIRES;
      process.env.ACCESS_EXPIRES = '30m';

      const token = generateAccessToken('user-123');
      const decoded = jwt.decode(token);

      // 30m = 1800 seconds
      const tokenLifespan = decoded.exp - decoded.iat;
      expect(tokenLifespan).toBeLessThanOrEqual(1800);

      process.env.ACCESS_EXPIRES = originalExpires;
    });
  });

  // ============================================================
  // VERIFY ACCESS TOKEN TESTS
  // ============================================================
  
  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const userId = 'test-user-123';
      const token = generateAccessToken(userId);
      const decoded = verifyAccessToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.user_id).toBe(userId);
    });

    it('should return null for invalid token', () => {
      const result = verifyAccessToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null for expired token', () => {
      // Create an already expired token
      const expiredToken = jwt.sign(
        { user_id: 'test-user' },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '-1h' }
      );

      const result = verifyAccessToken(expiredToken);

      expect(result).toBeNull();
    });

    it('should return null for token signed with wrong secret', () => {
      const wrongSecretToken = jwt.sign(
        { user_id: 'test-user' },
        'wrong-secret-key',
        { expiresIn: '15m' }
      );

      const result = verifyAccessToken(wrongSecretToken);

      expect(result).toBeNull();
    });

    it('should return null for malformed token', () => {
      const result = verifyAccessToken('not.a.valid.jwt.token');

      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = verifyAccessToken('');

      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = verifyAccessToken(null);

      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = verifyAccessToken(undefined);

      expect(result).toBeNull();
    });

    it('should return null when ACCESS_TOKEN_SECRET is not configured', () => {
      const originalSecret = process.env.ACCESS_TOKEN_SECRET;
      const token = generateAccessToken('user-123');
      
      delete process.env.ACCESS_TOKEN_SECRET;

      const result = verifyAccessToken(token);

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        '❌ Token verification failed:',
        'ACCESS_TOKEN_SECRET not configured'
      );

      process.env.ACCESS_TOKEN_SECRET = originalSecret;
    });

    it('should log error message when verification fails', () => {
      verifyAccessToken('invalid-token');

      expect(console.error).toHaveBeenCalled();
      const errorCall = console.error.mock.calls[0];
      expect(errorCall[0]).toContain('Token verification failed');
    });

    it('should return null for token with different algorithm', () => {
      // Create token with different algorithm (none - unsigned)
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ user_id: 'test-user', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
      const unsignedToken = `${header}.${payload}.`;

      const result = verifyAccessToken(unsignedToken);

      expect(result).toBeNull();
    });

    it('should return full decoded token with all claims', () => {
      const userId = 'user-with-claims';
      const token = generateAccessToken(userId);
      const decoded = verifyAccessToken(token);

      expect(decoded).toHaveProperty('user_id', userId);
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('exp');
    });
  });

  // ============================================================
  // GENERATE REFRESH TOKEN TESTS
  // ============================================================
  
  describe('generateRefreshToken', () => {
    it('should generate a valid JWT refresh token', () => {
      const userId = 'test-user-123';
      const token = generateRefreshToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include user_id in token payload', () => {
      const userId = 'test-user-123';
      const token = generateRefreshToken(userId);
      const decoded = jwt.decode(token);

      expect(decoded.user_id).toBe(userId);
    });

    it('should have longer expiration than access token', () => {
      const userId = 'test-user-123';
      const accessToken = generateAccessToken(userId);
      const refreshToken = generateRefreshToken(userId);

      const accessDecoded = jwt.decode(accessToken);
      const refreshDecoded = jwt.decode(refreshToken);

      expect(refreshDecoded.exp).toBeGreaterThan(accessDecoded.exp);
    });

    it('should throw error if REFRESH_TOKEN_SECRET is not configured', () => {
      const originalSecret = process.env.REFRESH_TOKEN_SECRET;
      delete process.env.REFRESH_TOKEN_SECRET;

      expect(() => generateRefreshToken('user-123')).toThrow('REFRESH_TOKEN_SECRET not configured');

      process.env.REFRESH_TOKEN_SECRET = originalSecret;
    });

    it('should handle numeric userId', () => {
      const userId = 67890;
      const token = generateRefreshToken(userId);
      const decoded = jwt.decode(token);

      expect(decoded.user_id).toBe(userId);
    });

    it('should use default expiry if REFRESH_EXPIRES is not set', () => {
      const originalExpires = process.env.REFRESH_EXPIRES;
      delete process.env.REFRESH_EXPIRES;

      const token = generateRefreshToken('user-123');
      const decoded = jwt.decode(token);

      // Default is 7d = 604800 seconds
      const tokenLifespan = decoded.exp - decoded.iat;
      expect(tokenLifespan).toBeLessThanOrEqual(604800);

      process.env.REFRESH_EXPIRES = originalExpires;
    });

    it('should use custom expiry from REFRESH_EXPIRES', () => {
      const originalExpires = process.env.REFRESH_EXPIRES;
      process.env.REFRESH_EXPIRES = '14d';

      const token = generateRefreshToken('user-123');
      const decoded = jwt.decode(token);

      // 14d = 1209600 seconds
      const tokenLifespan = decoded.exp - decoded.iat;
      expect(tokenLifespan).toBeLessThanOrEqual(1209600);

      process.env.REFRESH_EXPIRES = originalExpires;
    });

    it('should generate unique refresh tokens for same user', async () => {
      const userId = 'test-user-456';
      const token1 = generateRefreshToken(userId);
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      const token2 = generateRefreshToken(userId);

      expect(token1).not.toBe(token2);
    });
  });

  // ============================================================
  // VERIFY REFRESH TOKEN TESTS
  // ============================================================
  
  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const userId = 'test-user-123';
      const token = generateRefreshToken(userId);
      const decoded = verifyRefreshToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.user_id).toBe(userId);
    });

    it('should return null for invalid token', () => {
      const result = verifyRefreshToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null for expired token', () => {
      const expiredToken = jwt.sign(
        { user_id: 'test-user' },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '-1d' }
      );

      const result = verifyRefreshToken(expiredToken);

      expect(result).toBeNull();
    });

    it('should return null for token signed with wrong secret', () => {
      const wrongSecretToken = jwt.sign(
        { user_id: 'test-user' },
        'wrong-secret-key',
        { expiresIn: '7d' }
      );

      const result = verifyRefreshToken(wrongSecretToken);

      expect(result).toBeNull();
    });

    it('should not accept access token as refresh token', () => {
      const userId = 'test-user-123';
      const accessToken = generateAccessToken(userId);
      const result = verifyRefreshToken(accessToken);

      // Should fail because signed with different secret
      expect(result).toBeNull();
    });

    it('should not accept refresh token as access token', () => {
      const userId = 'test-user-123';
      const refreshToken = generateRefreshToken(userId);
      const result = verifyAccessToken(refreshToken);

      // Should fail because signed with different secret
      expect(result).toBeNull();
    });

    it('should return null when REFRESH_TOKEN_SECRET is not configured', () => {
      const originalSecret = process.env.REFRESH_TOKEN_SECRET;
      const token = generateRefreshToken('user-123');
      
      delete process.env.REFRESH_TOKEN_SECRET;

      const result = verifyRefreshToken(token);

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        '❌ Refresh token verification failed:',
        'REFRESH_TOKEN_SECRET not configured'
      );

      process.env.REFRESH_TOKEN_SECRET = originalSecret;
    });

    it('should return null for malformed refresh token', () => {
      const result = verifyRefreshToken('not.valid.jwt.format.here');

      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = verifyRefreshToken('');

      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = verifyRefreshToken(null);

      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = verifyRefreshToken(undefined);

      expect(result).toBeNull();
    });

    it('should log error message when refresh verification fails', () => {
      verifyRefreshToken('invalid-refresh-token');

      expect(console.error).toHaveBeenCalled();
      const errorCall = console.error.mock.calls[0];
      expect(errorCall[0]).toContain('Refresh token verification failed');
    });

    it('should return full decoded token with all claims', () => {
      const userId = 'refresh-user-claims';
      const token = generateRefreshToken(userId);
      const decoded = verifyRefreshToken(token);

      expect(decoded).toHaveProperty('user_id', userId);
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('exp');
    });
  });
});

// ============================================================
// TOKEN SECURITY COMPLIANCE TESTS
// ============================================================

describe('Token Security Compliance (ISO 27001)', () => {
  describe('Token Separation', () => {
    it('should use different secrets for access and refresh tokens', () => {
      // This is tested by cross-verification above
      const userId = 'test-user';
      const accessToken = generateAccessToken(userId);
      const refreshToken = generateRefreshToken(userId);

      // Cross verification should fail
      expect(verifyRefreshToken(accessToken)).toBeNull();
      expect(verifyAccessToken(refreshToken)).toBeNull();
    });
  });

  describe('Token Payload Security', () => {
    it('should not include sensitive data in access token', () => {
      const userId = 'test-user-123';
      const token = generateAccessToken(userId);
      const decoded = jwt.decode(token);

      // Should not contain password or other sensitive data
      expect(decoded.password).toBeUndefined();
      expect(decoded.password_hash).toBeUndefined();
      expect(decoded.email).toBeUndefined();
    });

    it('should not include sensitive data in refresh token', () => {
      const userId = 'test-user-123';
      const token = generateRefreshToken(userId);
      const decoded = jwt.decode(token);

      expect(decoded.password).toBeUndefined();
      expect(decoded.password_hash).toBeUndefined();
    });
  });

  describe('Token Expiration Policy', () => {
    it('should have access token expire within reasonable time', () => {
      const userId = 'test-user-123';
      const token = generateAccessToken(userId);
      const decoded = jwt.decode(token);

      const tokenLifespanSeconds = decoded.exp - decoded.iat;
      const oneHourInSeconds = 3600;

      // Access token should expire within 1 hour
      expect(tokenLifespanSeconds).toBeLessThanOrEqual(oneHourInSeconds);
    });

    it('should have refresh token expire within reasonable time', () => {
      const userId = 'test-user-123';
      const token = generateRefreshToken(userId);
      const decoded = jwt.decode(token);

      const tokenLifespanSeconds = decoded.exp - decoded.iat;
      const thirtyDaysInSeconds = 30 * 24 * 3600;

      // Refresh token should expire within 30 days
      expect(tokenLifespanSeconds).toBeLessThanOrEqual(thirtyDaysInSeconds);
    });
  });
});
