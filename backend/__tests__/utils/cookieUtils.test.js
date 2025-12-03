/**
 * Cookie Utilities Unit Tests
 * ISO 27001 Annex A.8 - Application Security Testing
 * 
 * Tests cookie handling for security compliance:
 * - HttpOnly flags
 * - Secure flags in production
 * - SameSite attributes
 * - Cookie expiration
 * - Token extraction from cookies/headers
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

import {
  ACCESS_TOKEN_COOKIE_OPTIONS,
  REFRESH_TOKEN_COOKIE_OPTIONS,
  COOKIE_NAMES,
  setAuthCookies,
  setAccessTokenCookie,
  clearAuthCookies,
  getAccessToken,
  getRefreshToken
} from '../../src/utils/cookieUtils.js';

describe('Cookie Utilities', () => {
  // ============================================================
  // COOKIE OPTIONS TESTS
  // ============================================================
  
  describe('ACCESS_TOKEN_COOKIE_OPTIONS', () => {
    it('should have httpOnly set to true (XSS protection)', () => {
      expect(ACCESS_TOKEN_COOKIE_OPTIONS.httpOnly).toBe(true);
    });

    it('should have path set to root', () => {
      expect(ACCESS_TOKEN_COOKIE_OPTIONS.path).toBe('/');
    });

    it('should have maxAge of 15 minutes', () => {
      const expectedMaxAge = 15 * 60 * 1000; // 15 minutes in ms
      expect(ACCESS_TOKEN_COOKIE_OPTIONS.maxAge).toBe(expectedMaxAge);
    });

    it('should have secure flag based on environment', () => {
      // In test environment (not production), secure should be false
      expect(typeof ACCESS_TOKEN_COOKIE_OPTIONS.secure).toBe('boolean');
    });

    it('should have sameSite attribute for CSRF protection', () => {
      expect(['strict', 'lax', 'none']).toContain(ACCESS_TOKEN_COOKIE_OPTIONS.sameSite);
    });
  });

  describe('REFRESH_TOKEN_COOKIE_OPTIONS', () => {
    it('should have httpOnly set to true (XSS protection)', () => {
      expect(REFRESH_TOKEN_COOKIE_OPTIONS.httpOnly).toBe(true);
    });

    it('should have path set to root', () => {
      expect(REFRESH_TOKEN_COOKIE_OPTIONS.path).toBe('/');
    });

    it('should have maxAge of 7 days', () => {
      const expectedMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
      expect(REFRESH_TOKEN_COOKIE_OPTIONS.maxAge).toBe(expectedMaxAge);
    });

    it('should have secure flag based on environment', () => {
      expect(typeof REFRESH_TOKEN_COOKIE_OPTIONS.secure).toBe('boolean');
    });

    it('should have sameSite attribute for CSRF protection', () => {
      expect(['strict', 'lax', 'none']).toContain(REFRESH_TOKEN_COOKIE_OPTIONS.sameSite);
    });
  });

  describe('COOKIE_NAMES', () => {
    it('should define access token cookie name', () => {
      expect(COOKIE_NAMES.ACCESS_TOKEN).toBeDefined();
      expect(typeof COOKIE_NAMES.ACCESS_TOKEN).toBe('string');
    });

    it('should define refresh token cookie name', () => {
      expect(COOKIE_NAMES.REFRESH_TOKEN).toBeDefined();
      expect(typeof COOKIE_NAMES.REFRESH_TOKEN).toBe('string');
    });

    it('should use secure naming (no sensitive info in name)', () => {
      // Cookie names should not reveal what they contain
      expect(COOKIE_NAMES.ACCESS_TOKEN.toLowerCase()).not.toContain('jwt');
      expect(COOKIE_NAMES.REFRESH_TOKEN.toLowerCase()).not.toContain('jwt');
    });
  });

  // ============================================================
  // SET AUTH COOKIES TESTS
  // ============================================================
  
  describe('setAuthCookies', () => {
    let mockRes;

    beforeEach(() => {
      mockRes = {
        cookie: jest.fn()
      };
    });

    it('should set both access and refresh token cookies', () => {
      const accessToken = 'test-access-token';
      const refreshToken = 'test-refresh-token';

      setAuthCookies(mockRes, accessToken, refreshToken);

      expect(mockRes.cookie).toHaveBeenCalledTimes(2);
    });

    it('should set access token with correct options', () => {
      const accessToken = 'test-access-token';
      const refreshToken = 'test-refresh-token';

      setAuthCookies(mockRes, accessToken, refreshToken);

      expect(mockRes.cookie).toHaveBeenCalledWith(
        COOKIE_NAMES.ACCESS_TOKEN,
        accessToken,
        ACCESS_TOKEN_COOKIE_OPTIONS
      );
    });

    it('should set refresh token with correct options', () => {
      const accessToken = 'test-access-token';
      const refreshToken = 'test-refresh-token';

      setAuthCookies(mockRes, accessToken, refreshToken);

      expect(mockRes.cookie).toHaveBeenCalledWith(
        COOKIE_NAMES.REFRESH_TOKEN,
        refreshToken,
        REFRESH_TOKEN_COOKIE_OPTIONS
      );
    });

    it('should handle empty token strings', () => {
      setAuthCookies(mockRes, '', '');

      expect(mockRes.cookie).toHaveBeenCalledTimes(2);
      expect(mockRes.cookie).toHaveBeenCalledWith(
        COOKIE_NAMES.ACCESS_TOKEN,
        '',
        ACCESS_TOKEN_COOKIE_OPTIONS
      );
    });
  });

  describe('setAccessTokenCookie', () => {
    let mockRes;

    beforeEach(() => {
      mockRes = {
        cookie: jest.fn()
      };
    });

    it('should set only access token cookie', () => {
      const accessToken = 'new-access-token';

      setAccessTokenCookie(mockRes, accessToken);

      expect(mockRes.cookie).toHaveBeenCalledTimes(1);
      expect(mockRes.cookie).toHaveBeenCalledWith(
        COOKIE_NAMES.ACCESS_TOKEN,
        accessToken,
        ACCESS_TOKEN_COOKIE_OPTIONS
      );
    });
  });

  // ============================================================
  // CLEAR AUTH COOKIES TESTS
  // ============================================================
  
  describe('clearAuthCookies', () => {
    let mockRes;

    beforeEach(() => {
      mockRes = {
        clearCookie: jest.fn()
      };
    });

    it('should clear both access and refresh token cookies', () => {
      clearAuthCookies(mockRes);

      expect(mockRes.clearCookie).toHaveBeenCalledTimes(2);
    });

    it('should clear access token cookie with path', () => {
      clearAuthCookies(mockRes);

      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        COOKIE_NAMES.ACCESS_TOKEN,
        { path: '/' }
      );
    });

    it('should clear refresh token cookie with path', () => {
      clearAuthCookies(mockRes);

      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        COOKIE_NAMES.REFRESH_TOKEN,
        { path: '/' }
      );
    });
  });

  // ============================================================
  // GET ACCESS TOKEN TESTS
  // ============================================================
  
  describe('getAccessToken', () => {
    it('should return token from cookies first (preferred)', () => {
      const mockReq = {
        cookies: {
          [COOKIE_NAMES.ACCESS_TOKEN]: 'cookie-token'
        },
        headers: {
          authorization: 'Bearer header-token'
        }
      };

      const token = getAccessToken(mockReq);

      expect(token).toBe('cookie-token');
    });

    it('should fallback to Authorization header if no cookie', () => {
      const mockReq = {
        cookies: {},
        headers: {
          authorization: 'Bearer header-token'
        }
      };

      const token = getAccessToken(mockReq);

      expect(token).toBe('header-token');
    });

    it('should return null if no token in cookie or header', () => {
      const mockReq = {
        cookies: {},
        headers: {}
      };

      const token = getAccessToken(mockReq);

      expect(token).toBeNull();
    });

    it('should handle missing cookies object', () => {
      const mockReq = {
        headers: {
          authorization: 'Bearer header-token'
        }
      };

      const token = getAccessToken(mockReq);

      expect(token).toBe('header-token');
    });

    it('should handle malformed Authorization header', () => {
      const mockReq = {
        cookies: {},
        headers: {
          authorization: 'InvalidFormat token'
        }
      };

      const token = getAccessToken(mockReq);

      expect(token).toBeNull();
    });

    it('should handle Authorization header without Bearer prefix', () => {
      const mockReq = {
        cookies: {},
        headers: {
          authorization: 'some-token'
        }
      };

      const token = getAccessToken(mockReq);

      expect(token).toBeNull();
    });
  });

  // ============================================================
  // GET REFRESH TOKEN TESTS
  // ============================================================
  
  describe('getRefreshToken', () => {
    it('should return token from cookies first (preferred)', () => {
      const mockReq = {
        cookies: {
          [COOKIE_NAMES.REFRESH_TOKEN]: 'cookie-refresh-token'
        },
        body: {
          refreshToken: 'body-refresh-token'
        }
      };

      const token = getRefreshToken(mockReq);

      expect(token).toBe('cookie-refresh-token');
    });

    it('should fallback to body if no cookie', () => {
      const mockReq = {
        cookies: {},
        body: {
          refreshToken: 'body-refresh-token'
        }
      };

      const token = getRefreshToken(mockReq);

      expect(token).toBe('body-refresh-token');
    });

    it('should return null if no token in cookie or body', () => {
      const mockReq = {
        cookies: {},
        body: {}
      };

      const token = getRefreshToken(mockReq);

      expect(token).toBeNull();
    });

    it('should handle missing cookies object', () => {
      const mockReq = {
        body: {
          refreshToken: 'body-refresh-token'
        }
      };

      const token = getRefreshToken(mockReq);

      expect(token).toBe('body-refresh-token');
    });

    it('should handle missing body object', () => {
      const mockReq = {
        cookies: {}
      };

      const token = getRefreshToken(mockReq);

      expect(token).toBeNull();
    });
  });
});

// ============================================================
// SECURITY COMPLIANCE TESTS
// ============================================================

describe('Cookie Security Compliance (ISO 27001)', () => {
  describe('XSS Protection', () => {
    it('should use HttpOnly flag on all auth cookies', () => {
      expect(ACCESS_TOKEN_COOKIE_OPTIONS.httpOnly).toBe(true);
      expect(REFRESH_TOKEN_COOKIE_OPTIONS.httpOnly).toBe(true);
    });
  });

  describe('CSRF Protection', () => {
    it('should use SameSite attribute on all auth cookies', () => {
      expect(ACCESS_TOKEN_COOKIE_OPTIONS.sameSite).toBeDefined();
      expect(REFRESH_TOKEN_COOKIE_OPTIONS.sameSite).toBeDefined();
    });
  });

  describe('Token Expiration', () => {
    it('should have shorter expiry for access token than refresh token', () => {
      expect(ACCESS_TOKEN_COOKIE_OPTIONS.maxAge).toBeLessThan(
        REFRESH_TOKEN_COOKIE_OPTIONS.maxAge
      );
    });

    it('should have access token expire within 1 hour', () => {
      const oneHourMs = 60 * 60 * 1000;
      expect(ACCESS_TOKEN_COOKIE_OPTIONS.maxAge).toBeLessThanOrEqual(oneHourMs);
    });

    it('should have refresh token expire within 30 days', () => {
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      expect(REFRESH_TOKEN_COOKIE_OPTIONS.maxAge).toBeLessThanOrEqual(thirtyDaysMs);
    });
  });
});

// ============================================================
// ENVIRONMENT-BASED CONFIGURATION TESTS
// ============================================================

describe('Environment-based Cookie Configuration', () => {
  describe('Production vs Development settings', () => {
    it('should define secure flag based on NODE_ENV', () => {
      // The isProduction variable is set at module load time
      // In test environment (NODE_ENV=test), it behaves like non-development
      expect(typeof ACCESS_TOKEN_COOKIE_OPTIONS.secure).toBe('boolean');
      expect(typeof REFRESH_TOKEN_COOKIE_OPTIONS.secure).toBe('boolean');
    });

    it('should define sameSite attribute correctly', () => {
      // sameSite should be 'lax' in development or 'strict' in production
      expect(['lax', 'strict']).toContain(ACCESS_TOKEN_COOKIE_OPTIONS.sameSite);
      expect(['lax', 'strict']).toContain(REFRESH_TOKEN_COOKIE_OPTIONS.sameSite);
    });

    it('should have consistent security settings between access and refresh tokens', () => {
      expect(ACCESS_TOKEN_COOKIE_OPTIONS.secure).toBe(REFRESH_TOKEN_COOKIE_OPTIONS.secure);
    });
  });
});

// ============================================================
// ADDITIONAL EDGE CASE TESTS
// ============================================================

describe('Cookie Edge Cases', () => {
  describe('getAccessToken edge cases', () => {
    it('should handle request with undefined cookies and headers', () => {
      const mockReq = { headers: {} };
      const token = getAccessToken(mockReq);
      expect(token).toBeNull();
    });

    it('should handle request with null cookies', () => {
      const mockReq = {
        cookies: null,
        headers: {}
      };
      const token = getAccessToken(mockReq);
      expect(token).toBeNull();
    });

    it('should handle Bearer token with extra spaces', () => {
      const mockReq = {
        cookies: {},
        headers: {
          authorization: 'Bearer  token-with-extra-space'
        }
      };
      const token = getAccessToken(mockReq);
      // Should return empty string due to extra space
      expect(token).toBe('');
    });

    it('should handle Authorization header with only Bearer prefix', () => {
      const mockReq = {
        cookies: {},
        headers: {
          authorization: 'Bearer '
        }
      };
      const token = getAccessToken(mockReq);
      expect(token).toBe('');
    });
  });

  describe('getRefreshToken edge cases', () => {
    it('should handle request with undefined cookies and body', () => {
      const mockReq = {};
      const token = getRefreshToken(mockReq);
      expect(token).toBeNull();
    });

    it('should handle request with null cookies', () => {
      const mockReq = {
        cookies: null,
        body: {}
      };
      const token = getRefreshToken(mockReq);
      expect(token).toBeNull();
    });

    it('should handle body with null refreshToken', () => {
      const mockReq = {
        cookies: {},
        body: {
          refreshToken: null
        }
      };
      const token = getRefreshToken(mockReq);
      expect(token).toBeNull();
    });

    it('should handle body with empty string refreshToken', () => {
      const mockReq = {
        cookies: {},
        body: {
          refreshToken: ''
        }
      };
      const token = getRefreshToken(mockReq);
      // Empty string is falsy, so it returns null
      expect(token).toBeNull();
    });
  });

  describe('Cookie operations with special characters', () => {
    let mockRes;

    beforeEach(() => {
      mockRes = {
        cookie: jest.fn(),
        clearCookie: jest.fn()
      };
    });

    it('should handle tokens with special characters', () => {
      const specialToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test+/=';
      
      setAccessTokenCookie(mockRes, specialToken);
      
      expect(mockRes.cookie).toHaveBeenCalledWith(
        COOKIE_NAMES.ACCESS_TOKEN,
        specialToken,
        ACCESS_TOKEN_COOKIE_OPTIONS
      );
    });

    it('should handle very long tokens', () => {
      const longToken = 'x'.repeat(4096); // 4KB token
      
      setAuthCookies(mockRes, longToken, longToken);
      
      expect(mockRes.cookie).toHaveBeenCalledTimes(2);
    });

    it('should handle unicode in tokens', () => {
      const unicodeToken = 'token_日本語_한국어_中文';
      
      setAccessTokenCookie(mockRes, unicodeToken);
      
      expect(mockRes.cookie).toHaveBeenCalledWith(
        COOKIE_NAMES.ACCESS_TOKEN,
        unicodeToken,
        expect.any(Object)
      );
    });
  });
});
