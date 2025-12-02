// src/middleware/securityMonitoring.js
import { securityLogger } from '../utils/logger.js';

// --- Pure Helper Functions ---

/**
 * Clean IP Address
 */
export const cleanIp = (rawIp) => {
  if (!rawIp) return 'unknown';
  let ip = rawIp;
  // Clean up IPv4-mapped IPv6 addresses
  if (typeof ip === 'string' && ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  // Normalize Localhost
  if (ip === '::1') {
    ip = '127.0.0.1';
  }
  return ip;
};

/**
 * Check for SQL Injection Patterns
 */
export const checkSqlInjection = (str) => {
  // Regex ที่ครอบคลุมมากขึ้น
  const sqlPatterns = /('[\s\S]*--)|(\s+OR\s+[\w\s]+=)|(;\s*DROP\s+TABLE)|(UNION\s+SELECT)|(\%27)|(\-\-)|(\%23)|(#)/i;
  return sqlPatterns.test(str);
};

/**
 * Check for XSS Patterns
 */
export const checkXss = (str) => {
  const xssPatterns = /<script|javascript:|onerror=|onload=|onclick=|onmouseover=/i;
  return xssPatterns.test(str);
};

// --- Factory Function ---

/**
 * Factory for Security Monitoring Middleware
 * @param {Object} deps - Dependencies & Config
 */
export const createSecurityMiddleware = (deps = {}) => {
  const logger = deps.securityLogger || securityLogger;
  const config = {
    maxFailedAttempts: deps.maxFailedAttempts || 5,
    lockoutDuration: deps.lockoutDuration || 15 * 60 * 1000, // 15 mins
    cleanupInterval: deps.cleanupInterval || 60 * 60 * 1000, // 1 hour
    ...deps.config
  };

  // Internal State (Isolated per instance)
  const failedLoginAttempts = new Map();
  let cleanupTimer = null;

  /**
   * Start cleanup interval
   */
  const startCleanup = () => {
    if (cleanupTimer) clearInterval(cleanupTimer);
    cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [ip, attempts] of failedLoginAttempts.entries()) {
        if (now - attempts.lastAttempt > config.lockoutDuration) {
          failedLoginAttempts.delete(ip);
        }
      }
    }, config.cleanupInterval);
  };

  // Start immediately if not disabled (for testing)
  if (deps.autoStart !== false) startCleanup();

  /**
   * Stop cleanup interval (useful for tests)
   */
  const stopCleanup = () => {
    if (cleanupTimer) clearInterval(cleanupTimer);
  };

  // --- Middleware Functions ---

  const extractClientInfo = (req, res, next) => {
    const rawIp = req.ip || req.connection?.remoteAddress;
    const ip = cleanIp(rawIp);

    req.clientInfo = {
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || 'unknown',
    };
    next();
  };

  const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const ip = req.clientInfo?.ipAddress || cleanIp(req.ip);
      const userAgent = req.clientInfo?.userAgent || req.headers['user-agent'] || 'unknown';

      // Log suspicious status codes (4xx, 5xx)
      if (res.statusCode >= 400) {
        logger.suspiciousActivity(
          `HTTP ${res.statusCode} on ${req.method} ${req.url}`,
          ip,
          userAgent,
          { statusCode: res.statusCode, duration: `${duration}ms` }
        );
      }
    });

    next();
  };

  const bruteForceProtection = (req, res, next) => {
    const ip = req.clientInfo?.ipAddress || cleanIp(req.ip);
    
    if (failedLoginAttempts.has(ip)) {
      const attempts = failedLoginAttempts.get(ip);
      
      if (attempts.count >= config.maxFailedAttempts) {
        const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
        
        if (timeSinceLastAttempt < config.lockoutDuration) {
          logger.suspiciousActivity(
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
          // Reset counter after lockout duration expired
          failedLoginAttempts.delete(ip);
        }
      }
    }
    
    next();
  };

  const recordFailedLogin = (ip) => {
    const clean = cleanIp(ip);
    if (failedLoginAttempts.has(clean)) {
      const attempts = failedLoginAttempts.get(clean);
      attempts.count++;
      attempts.lastAttempt = Date.now();
    } else {
      failedLoginAttempts.set(clean, {
        count: 1,
        lastAttempt: Date.now(),
      });
    }
  };

  const clearFailedLogins = (ip) => {
    const clean = cleanIp(ip);
    failedLoginAttempts.delete(clean);
  };

  const detectSuspiciousPatterns = (req, res, next) => {
    const { body, headers, clientInfo } = req;
    const ip = clientInfo?.ipAddress || cleanIp(req.ip);
    const userAgent = clientInfo?.userAgent || headers['user-agent'];
    
    const bodyStr = JSON.stringify(body || {});
    
    // Check SQL Injection
    if (checkSqlInjection(bodyStr)) {
      logger.suspiciousActivity(
        'Possible SQL injection attempt detected',
        ip,
        userAgent,
        { endpoint: req.url, body: bodyStr.substring(0, 200) }
      );
    }
    
    // Check XSS
    if (checkXss(bodyStr)) {
      logger.suspiciousActivity(
        'Possible XSS attempt detected',
        ip,
        userAgent,
        { endpoint: req.url, body: bodyStr.substring(0, 200) }
      );
    }
    
    // Check suspicious User Agent
    if (!userAgent || userAgent.length < 5) {
      logger.suspiciousActivity(
        'Suspicious or missing user agent',
        ip,
        userAgent || 'unknown',
        { endpoint: req.url }
      );
    }
    
    next();
  };

  // Expose methods and internal state control
  return {
    extractClientInfo,
    requestLogger,
    bruteForceProtection,
    recordFailedLogin,
    clearFailedLogins,
    detectSuspiciousPatterns,
    stopCleanup, // For testing cleanup
    _failedLoginAttempts: failedLoginAttempts // For testing state inspection
  };
};

// Default Instance
const defaultInstance = createSecurityMiddleware();
export const extractClientInfo = defaultInstance.extractClientInfo;
export const requestLogger = defaultInstance.requestLogger;
export const bruteForceProtection = defaultInstance.bruteForceProtection;
export const recordFailedLogin = defaultInstance.recordFailedLogin;
export const clearFailedLogins = defaultInstance.clearFailedLogins;
export const detectSuspiciousPatterns = defaultInstance.detectSuspiciousPatterns;

export default defaultInstance;