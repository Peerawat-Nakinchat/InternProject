// src/middleware/securityMonitoring.js
import { securityLogger } from '../utils/logger.js';

/**
 * Security Event Types for monitoring
 */
export const SecurityEventTypes = {
  TOKEN_REUSE: 'TOKEN_REUSE_DETECTED',
  BRUTE_FORCE: 'BRUTE_FORCE_ATTEMPT',
  SQL_INJECTION: 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT: 'XSS_ATTEMPT',
  SUSPICIOUS_AGENT: 'SUSPICIOUS_USER_AGENT',
  RATE_LIMIT: 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  SESSION_HIJACK: 'POSSIBLE_SESSION_HIJACK',
};

/**
 * In-memory security metrics (could be replaced with Redis for production)
 */
const securityMetrics = {
  totalRequests: 0,
  blockedRequests: 0,
  suspiciousActivities: [],
  tokenRefreshes: 0,
  tokenReuses: 0,
  failedLogins: new Map(), // IP -> count
  activeAlerts: [],
};

/**
 * Get security metrics for dashboard
 */
export const getSecurityMetrics = () => {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  
  // Clean old suspicious activities (keep last hour)
  securityMetrics.suspiciousActivities = securityMetrics.suspiciousActivities.filter(
    a => a.timestamp > oneHourAgo
  );

  return {
    totalRequests: securityMetrics.totalRequests,
    blockedRequests: securityMetrics.blockedRequests,
    recentSuspiciousActivities: securityMetrics.suspiciousActivities.slice(-50),
    tokenRefreshes: securityMetrics.tokenRefreshes,
    tokenReuses: securityMetrics.tokenReuses,
    activeAlerts: securityMetrics.activeAlerts,
    failedLoginsByIP: Array.from(securityMetrics.failedLogins.entries()).map(([ip, data]) => ({
      ip,
      count: data.count,
      lastAttempt: new Date(data.lastAttempt).toISOString(),
    })),
  };
};

/**
 * Add suspicious activity to metrics
 */
export const addSuspiciousActivity = (type, ip, details = {}) => {
  const activity = {
    type,
    ip,
    timestamp: Date.now(),
    details,
  };
  
  securityMetrics.suspiciousActivities.push(activity);
  
  // Create alert for critical events
  if ([SecurityEventTypes.TOKEN_REUSE, SecurityEventTypes.BRUTE_FORCE, SecurityEventTypes.SESSION_HIJACK].includes(type)) {
    securityMetrics.activeAlerts.push({
      ...activity,
      severity: 'HIGH',
      acknowledged: false,
    });
  }
};

/**
 * Increment token refresh count
 */
export const recordTokenRefresh = () => {
  securityMetrics.tokenRefreshes++;
};

/**
 * Increment token reuse count (security incident)
 */
export const recordTokenReuse = (ip, userId) => {
  securityMetrics.tokenReuses++;
  addSuspiciousActivity(SecurityEventTypes.TOKEN_REUSE, ip, { userId });
};

/**
 * Middleware to extract client information
 */
export const extractClientInfo = (req, res, next) => {
  req.clientInfo = {
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  };
  securityMetrics.totalRequests++;
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
      
      if (res.statusCode === 429) {
        securityMetrics.blockedRequests++;
        addSuspiciousActivity(SecurityEventTypes.RATE_LIMIT, logData.ipAddress, { url: req.url });
      }
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
        
        addSuspiciousActivity(SecurityEventTypes.BRUTE_FORCE, ip, { attempts: attempts.count });
        securityMetrics.blockedRequests++;
        
        return res.status(429).json({
          success: false,
          error: 'Too many login attempts. Please try again later.',
          retryAfter: Math.ceil((LOCKOUT_DURATION - timeSinceLastAttempt) / 1000),
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
  
  // Update security metrics
  securityMetrics.failedLogins.set(ip, failedLoginAttempts.get(ip));
};

/**
 * Clear failed login attempts for IP (on successful login)
 */
export const clearFailedLogins = (ip) => {
  failedLoginAttempts.delete(ip);
  securityMetrics.failedLogins.delete(ip);
};

/**
 * Middleware to detect suspicious patterns
 */
export const detectSuspiciousPatterns = (req, res, next) => {
  const { body, headers, clientInfo } = req;
  const ip = clientInfo?.ipAddress || req.ip;
  const userAgent = clientInfo?.userAgent || headers['user-agent'];
  
  // Check for SQL injection patterns in body
  const sqlPatterns = /'|--|;|\/\*|\*\/|xp_|sp_|exec|execute|union|select|insert|update|delete|drop|create|alter/i;
  const bodyStr = JSON.stringify(body);
  
  if (sqlPatterns.test(bodyStr)) {
    securityLogger.suspiciousActivity(
      'Possible SQL injection attempt detected',
      ip,
      userAgent,
      { endpoint: req.url, body: bodyStr.substring(0, 200) }
    );
    addSuspiciousActivity(SecurityEventTypes.SQL_INJECTION, ip, { endpoint: req.url });
  }
  
  // Check for XSS patterns
  const xssPatterns = /<script|javascript:|onerror=|onload=/i;
  
  if (xssPatterns.test(bodyStr)) {
    securityLogger.suspiciousActivity(
      'Possible XSS attempt detected',
      ip,
      userAgent,
      { endpoint: req.url, body: bodyStr.substring(0, 200) }
    );
    addSuspiciousActivity(SecurityEventTypes.XSS_ATTEMPT, ip, { endpoint: req.url });
  }
  
  // Check for missing or suspicious user agent
  if (!userAgent || userAgent.length < 10) {
    securityLogger.suspiciousActivity(
      'Suspicious or missing user agent',
      ip,
      userAgent,
      { endpoint: req.url }
    );
    addSuspiciousActivity(SecurityEventTypes.SUSPICIOUS_AGENT, ip, { userAgent });
  }
  
  next();
};

/**
 * Middleware to detect potential session hijacking
 * (checks for sudden user agent changes)
 */
const sessionFingerprints = new Map();

export const detectSessionHijacking = (req, res, next) => {
  if (req.user && req.user.user_id) {
    const userId = req.user.user_id;
    const currentUserAgent = req.clientInfo?.userAgent || req.headers['user-agent'];
    const currentIP = req.clientInfo?.ipAddress || req.ip;
    
    const fingerprint = sessionFingerprints.get(userId);
    
    if (fingerprint) {
      // Check for significant user agent change (potential hijack)
      if (fingerprint.userAgent !== currentUserAgent) {
        securityLogger.suspiciousActivity(
          'Possible session hijacking - User agent changed',
          currentIP,
          currentUserAgent,
          { 
            userId, 
            previousUserAgent: fingerprint.userAgent,
            previousIP: fingerprint.ip 
          }
        );
        addSuspiciousActivity(SecurityEventTypes.SESSION_HIJACK, currentIP, { 
          userId,
          previousUserAgent: fingerprint.userAgent,
          currentUserAgent,
        });
      }
    }
    
    // Update fingerprint
    sessionFingerprints.set(userId, {
      userAgent: currentUserAgent,
      ip: currentIP,
      lastSeen: Date.now(),
    });
  }
  
  next();
};

/**
 * Clean up old entries periodically
 */
setInterval(() => {
  const now = Date.now();
  
  // Clean failed login attempts
  for (const [ip, attempts] of failedLoginAttempts.entries()) {
    if (now - attempts.lastAttempt > LOCKOUT_DURATION) {
      failedLoginAttempts.delete(ip);
      securityMetrics.failedLogins.delete(ip);
    }
  }
  
  // Clean session fingerprints (older than 24 hours)
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  for (const [userId, fingerprint] of sessionFingerprints.entries()) {
    if (fingerprint.lastSeen < oneDayAgo) {
      sessionFingerprints.delete(userId);
    }
  }
  
  // Keep only last 24 hours of suspicious activities
  securityMetrics.suspiciousActivities = securityMetrics.suspiciousActivities.filter(
    a => a.timestamp > oneDayAgo
  );
  
  // Clean acknowledged alerts older than 7 days
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  securityMetrics.activeAlerts = securityMetrics.activeAlerts.filter(
    a => !a.acknowledged || a.timestamp > oneWeekAgo
  );
  
}, 60 * 60 * 1000); // Clean up every hour
