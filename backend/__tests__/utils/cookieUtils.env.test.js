/**
 * Cookie Utilities Environment Tests
 * Target: Branch Coverage ≥ 96%
 * 
 * Tests cookie configuration for different NODE_ENV values
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Cookie Configuration - Development Environment', () => {
  let originalNodeEnv;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    // Reset module registry
    jest.resetModules();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.resetModules();
  });

  it('should set secure to true when NODE_ENV is development', async () => {
    process.env.NODE_ENV = 'development';
    
    const cookieUtils = await import('../../src/utils/cookieUtils.js');
    
    // isProduction = process.env.NODE_ENV === 'development' evaluates to true in development
    expect(cookieUtils.ACCESS_TOKEN_COOKIE_OPTIONS.secure).toBe(true);
    expect(cookieUtils.REFRESH_TOKEN_COOKIE_OPTIONS.secure).toBe(true);
  });

  it('should set sameSite to strict when NODE_ENV is development', async () => {
    process.env.NODE_ENV = 'development';
    
    const cookieUtils = await import('../../src/utils/cookieUtils.js');
    
    // isProduction = true in development, so sameSite = 'strict'
    expect(cookieUtils.ACCESS_TOKEN_COOKIE_OPTIONS.sameSite).toBe('strict');
    expect(cookieUtils.REFRESH_TOKEN_COOKIE_OPTIONS.sameSite).toBe('strict');
  });
});

describe('Cookie Configuration - Production Environment', () => {
  let originalNodeEnv;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    jest.resetModules();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.resetModules();
  });

  it('should set secure to false when NODE_ENV is production', async () => {
    process.env.NODE_ENV = 'production';
    
    const cookieUtils = await import('../../src/utils/cookieUtils.js');
    
    // isProduction = process.env.NODE_ENV === 'development' evaluates to false in production
    expect(cookieUtils.ACCESS_TOKEN_COOKIE_OPTIONS.secure).toBe(false);
    expect(cookieUtils.REFRESH_TOKEN_COOKIE_OPTIONS.secure).toBe(false);
  });

  it('should set sameSite to lax when NODE_ENV is production', async () => {
    process.env.NODE_ENV = 'production';
    
    const cookieUtils = await import('../../src/utils/cookieUtils.js');
    
    // isProduction = false in production, so sameSite = 'lax'
    expect(cookieUtils.ACCESS_TOKEN_COOKIE_OPTIONS.sameSite).toBe('lax');
    expect(cookieUtils.REFRESH_TOKEN_COOKIE_OPTIONS.sameSite).toBe('lax');
  });
});

describe('Cookie Configuration - Test Environment', () => {
  let originalNodeEnv;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    jest.resetModules();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.resetModules();
  });

  it('should set secure to false when NODE_ENV is test', async () => {
    process.env.NODE_ENV = 'test';
    
    const cookieUtils = await import('../../src/utils/cookieUtils.js');
    
    // isProduction = false in test environment
    expect(cookieUtils.ACCESS_TOKEN_COOKIE_OPTIONS.secure).toBe(false);
    expect(cookieUtils.REFRESH_TOKEN_COOKIE_OPTIONS.secure).toBe(false);
  });

  it('should set sameSite to lax when NODE_ENV is test', async () => {
    process.env.NODE_ENV = 'test';
    
    const cookieUtils = await import('../../src/utils/cookieUtils.js');
    
    // isProduction = false in test, so sameSite = 'lax'
    expect(cookieUtils.ACCESS_TOKEN_COOKIE_OPTIONS.sameSite).toBe('lax');
    expect(cookieUtils.REFRESH_TOKEN_COOKIE_OPTIONS.sameSite).toBe('lax');
  });
});

describe('Cookie Configuration - Undefined Environment', () => {
  let originalNodeEnv;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    jest.resetModules();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.resetModules();
  });

  it('should set secure to false when NODE_ENV is undefined', async () => {
    delete process.env.NODE_ENV;
    
    const cookieUtils = await import('../../src/utils/cookieUtils.js');
    
    // isProduction = false when NODE_ENV is undefined
    expect(cookieUtils.ACCESS_TOKEN_COOKIE_OPTIONS.secure).toBe(false);
    expect(cookieUtils.REFRESH_TOKEN_COOKIE_OPTIONS.secure).toBe(false);
  });

  it('should set sameSite to lax when NODE_ENV is undefined', async () => {
    delete process.env.NODE_ENV;
    
    const cookieUtils = await import('../../src/utils/cookieUtils.js');
    
    expect(cookieUtils.ACCESS_TOKEN_COOKIE_OPTIONS.sameSite).toBe('lax');
    expect(cookieUtils.REFRESH_TOKEN_COOKIE_OPTIONS.sameSite).toBe('lax');
  });
});

describe('Cookie Default Export', () => {
  it('should export all functions through default export', async () => {
    const cookieUtils = await import('../../src/utils/cookieUtils.js');
    
    expect(cookieUtils.default).toBeDefined();
    expect(cookieUtils.default.COOKIE_NAMES).toBeDefined();
    expect(cookieUtils.default.ACCESS_TOKEN_COOKIE_OPTIONS).toBeDefined();
    expect(cookieUtils.default.REFRESH_TOKEN_COOKIE_OPTIONS).toBeDefined();
    expect(cookieUtils.default.setAuthCookies).toBeDefined();
    expect(cookieUtils.default.setAccessTokenCookie).toBeDefined();
    expect(cookieUtils.default.clearAuthCookies).toBeDefined();
    expect(cookieUtils.default.getAccessToken).toBeDefined();
    expect(cookieUtils.default.getRefreshToken).toBeDefined();
  });

  it('should have matching exports between named and default exports', async () => {
    const cookieUtils = await import('../../src/utils/cookieUtils.js');
    
    expect(cookieUtils.default.COOKIE_NAMES).toBe(cookieUtils.COOKIE_NAMES);
    expect(cookieUtils.default.setAuthCookies).toBe(cookieUtils.setAuthCookies);
    expect(cookieUtils.default.clearAuthCookies).toBe(cookieUtils.clearAuthCookies);
  });
});
