// src/middleware/securityMonitoring.js
import { securityLogger } from '../utils/logger.js';

/**
 * Middleware to extract client information
 */
export const extractClientInfo = (req, res, next) => {
  let ip = req.ip || req.connection.remoteAddress || 'unknown';

  // Clean up IPv4-mapped IPv6 addresses
  if (typeof ip === 'string' && ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  
  // Normalize Localhost
  if (ip === '::1') {
    ip = '127.0.0.1';
  }

  req.clientInfo = {
    ipAddress: ip,
    userAgent: req.headers['user-agent'] || 'unknown',
  };
  next();
};

/**
 * Middleware to log all requests (for monitoring)
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ipAddress: req.clientInfo?.ipAddress || req.ip,
      userAgent: req.clientInfo?.userAgent || req.headers['user-agent'],
    };

    // Log suspicious status codes
    if (res.statusCode >= 400) {
      securityLogger.suspiciousActivity(
        `HTTP ${res.statusCode} on ${req.method} ${req.url}`,
        logData.ipAddress,
        logData.userAgent,
        { statusCode: res.statusCode, duration }
      );
    }
  });

  next();
};

/**
 * Track failed login attempts by IP
 */
const failedLoginAttempts = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

/**
 * Middleware to check for brute force attacks
 */
export const bruteForceProtection = (req, res, next) => {
  const ip = req.clientInfo?.ipAddress || req.ip;
  
  if (failedLoginAttempts.has(ip)) {
    const attempts = failedLoginAttempts.get(ip);
    
    if (attempts.count >= MAX_FAILED_ATTEMPTS) {
      const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
      
      if (timeSinceLastAttempt < LOCKOUT_DURATION) {
        securityLogger.suspiciousActivity(
          'Brute force attempt detected - too many failed logins',
          ip,
          req.clientInfo?.userAgent || 'unknown',
          { attempts: attempts.count }
        );
        
        return res.status(429).json({
          success: false,
          error: 'Too many login attempts. Please try again later.',
        });
      } else {
        // Reset counter after lockout duration
        failedLoginAttempts.delete(ip);
      }
    }
  }
  
  next();
};

/**
 * Record failed login attempt
 */
export const recordFailedLogin = (ip) => {
  if (failedLoginAttempts.has(ip)) {
    const attempts = failedLoginAttempts.get(ip);
    attempts.count++;
    attempts.lastAttempt = Date.now();
  } else {
    failedLoginAttempts.set(ip, {
      count: 1,
      lastAttempt: Date.now(),
    });
  }
};

/**
 * Clear failed login attempts for IP (on successful login)
 */
export const clearFailedLogins = (ip) => {
  failedLoginAttempts.delete(ip);
};

/**
 * Middleware to detect suspicious patterns
 */
export const detectSuspiciousPatterns = (req, res, next) => {
  const { body, headers, clientInfo } = req;
  const ip = clientInfo?.ipAddress || req.ip;
  const userAgent = clientInfo?.userAgent || headers['user-agent'];
  
  // Check for SQL injection patterns in body
  const sqlPatterns = /('[\s\S]*--)|(\s+OR\s+[\w\s]+=)|(;\s*DROP\s+TABLE)|(UNION\s+SELECT)/i;
  const bodyStr = JSON.stringify(body);
  
  if (sqlPatterns.test(bodyStr)) {
    securityLogger.suspiciousActivity(
      'Possible SQL injection attempt detected',
      ip,
      userAgent,
      { endpoint: req.url, body: bodyStr.substring(0, 200) }
    );
  }
  
  // Check for XSS patterns
  const xssPatterns = /<script|javascript:|onerror=|onload=|onclick=|onmouseover=/i;
  
  if (xssPatterns.test(bodyStr)) {
    securityLogger.suspiciousActivity(
      'Possible XSS attempt detected',
      ip,
      userAgent,
      { endpoint: req.url, body: bodyStr.substring(0, 200) }
    );
  }
  
  // Check for missing or suspicious user agent
  if (!userAgent || userAgent.length < 5) {
    securityLogger.suspiciousActivity(
      'Suspicious or missing user agent',
      ip,
      userAgent,
      { endpoint: req.url }
    );
  }
  
  next();
};

/**
 * Clean up old entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [ip, attempts] of failedLoginAttempts.entries()) {
    if (now - attempts.lastAttempt > LOCKOUT_DURATION) {
      failedLoginAttempts.delete(ip);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour
