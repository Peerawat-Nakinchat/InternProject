/**
 * Token Utilities Unit Tests
 * ISO 27001 Annex A.8 - Authentication Token Security Testing
 * 
 * Tests JWT token generation and verification:
 * - Access token generation/verification
 * - Refresh token generation/verification
 * - Token expiration handling
 * - Error handling for invalid tokens
 */

import jwt from 'jsonwebtoken';
import {
  verifyAccessToken,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from '../../src/utils/token.js';

describe('Token Utilities', () => {
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
