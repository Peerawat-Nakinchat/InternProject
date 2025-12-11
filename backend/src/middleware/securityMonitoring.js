// src/middleware/securityMonitoring.js
import { securityLogger } from "../utils/logger.js";
import redisClient, {
  isConnected as isRedisConnected,
} from "../config/redis.js";

// --- In-Memory Fallback Store ---
const inMemoryStore = new Map();

// --- Pure Helper Functions ---

/**
 * Clean IP Address
 */
export const cleanIp = (rawIp) => {
  if (!rawIp) return "unknown";
  let ip = rawIp;
  // Clean up IPv4-mapped IPv6 addresses
  if (typeof ip === "string" && ip.startsWith("::ffff:")) {
    ip = ip.substring(7);
  }
  // Normalize Localhost
  if (ip === "::1") {
    ip = "127.0.0.1";
  }
  return ip;
};

/**
 * Check for SQL Injection Patterns
 */
export const checkSqlInjection = (str) => {
  const sqlPatterns = /('[\s\S]*--)|(UNION\s+SELECT)|(%27)|(--)|(%23)|(#)/i;
  return sqlPatterns.test(str);
};

/**
 * Check for XSS Patterns
 */
export const checkXss = (str) => {
  const xssPatterns =
    /<script|javascript:|onerror=|onload=|onclick=|onmouseover=/i;
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
    lockoutDuration: (deps.lockoutDuration || 15 * 60 * 1000) / 1000,
    prefix: "bf_protect:",
    ...deps.config,
  };

  // --- Middleware Functions ---

  const extractClientInfo = (req, res, next) => {
    // Try to get real IP from various sources
    // req.ip is the most reliable when trust proxy is set
    let rawIp = req.ip;

    // Fallback to other common proxy headers if needed
    if (!rawIp || rawIp === "127.0.0.1") {
      rawIp =
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.headers["x-real-ip"] ||
        req.connection?.remoteAddress ||
        req.ip;
    }

    const ip = cleanIp(rawIp);

    req.clientInfo = {
      ipAddress: ip,
      userAgent: req.headers["user-agent"] || "unknown",
    };
    next();
  };

  const requestLogger = (req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - start;
      const ip = req.clientInfo?.ipAddress || cleanIp(req.ip);
      const userAgent =
        req.clientInfo?.userAgent || req.headers["user-agent"] || "unknown";
      const isAuthEndpoint =
        req.url.includes("/auth/") || req.url.includes("/refresh");
      const isNormal401 = res.statusCode === 401 && isAuthEndpoint;

      if (res.statusCode >= 400 && !isNormal401) {
        logger.suspiciousActivity(
          `HTTP ${res.statusCode} on ${req.method} ${req.url}`,
          ip,
          userAgent,
          { statusCode: res.statusCode, duration: `${duration}ms` },
        );
      }
    });

    next();
  };

  /**
   * ✅ Brute Force Protection (Redis with In-Memory Fallback)
   */
  const bruteForceProtection = async (req, res, next) => {
    try {
      const ip = req.clientInfo?.ipAddress || cleanIp(req.ip);
      const key = `${config.prefix}${ip}`;

      let attempts;

      if (isRedisConnected()) {
        // Use Redis
        attempts = await redisClient.get(key);
        attempts = attempts ? parseInt(attempts) : 0;
      } else {
        // Use In-Memory Fallback
        const entry = inMemoryStore.get(key);
        if (entry && Date.now() < entry.expiresAt) {
          attempts = entry.count;
        } else {
          attempts = 0;
          inMemoryStore.delete(key);
        }
      }

      if (attempts >= config.maxFailedAttempts) {
        logger.suspiciousActivity(
          "Brute force attempt detected - too many failed logins",
          ip,
          req.clientInfo?.userAgent || "unknown",
          {
            attempts: attempts,
            store: isRedisConnected() ? "redis" : "memory",
          },
        );

        return res.status(429).json({
          success: false,
          error: "คุณทำรายการผิดพลาดเกินกำหนด กรุณารอ 15 นาที",
        });
      }

      next();
    } catch (error) {
      console.error("❌ Error in BruteForce Protection:", error);
      // Fail Open: ถ้าเกิด error ให้ปล่อยผ่านไปก่อนเพื่อให้ User ใช้งานได้
      next();
    }
  };

  /**
   * ✅ Record Failed Login (Redis with In-Memory Fallback)
   */
  const recordFailedLogin = async (ip) => {
    try {
      const clean = cleanIp(ip);
      const key = `${config.prefix}${clean}`;

      if (isRedisConnected()) {
        // Use Redis
        const multi = redisClient.multi();
        multi.incr(key);
        // NX = Set expiry only when the key has no expiry (ตั้งเวลาแค่ครั้งแรก)
        multi.expire(key, config.lockoutDuration, "NX");
        await multi.exec();
      } else {
        // Use In-Memory Fallback
        const entry = inMemoryStore.get(key) || {
          count: 0,
          expiresAt: Date.now() + config.lockoutDuration * 1000,
        };
        entry.count++;
        inMemoryStore.set(key, entry);
      }
    } catch (error) {
      console.error("❌ Error in recordFailedLogin:", error);
    }
  };

  /**
   * ✅ Clear Failed Login (Redis with In-Memory Fallback)
   */
  const clearFailedLogins = async (ip) => {
    try {
      const clean = cleanIp(ip);
      const key = `${config.prefix}${clean}`;

      if (isRedisConnected()) {
        await redisClient.del(key);
      } else {
        inMemoryStore.delete(key);
      }
    } catch (error) {
      console.error("❌ Error in clearFailedLogins:", error);
    }
  };

  const detectSuspiciousPatterns = (req, res, next) => {
    const { body, headers, clientInfo } = req;
    const ip = clientInfo?.ipAddress || cleanIp(req.ip);
    const userAgent = clientInfo?.userAgent || headers["user-agent"];
    const bodyStr = JSON.stringify(body || {});

    // Check SQL Injection
    if (checkSqlInjection(bodyStr)) {
      logger.suspiciousActivity(
        "Possible SQL injection attempt detected",
        ip,
        userAgent,
        { endpoint: req.url, body: bodyStr.substring(0, 200) },
      );
    }

    // Check XSS
    if (checkXss(bodyStr)) {
      logger.suspiciousActivity(
        "Possible XSS attempt detected",
        ip,
        userAgent,
        { endpoint: req.url, body: bodyStr.substring(0, 200) },
      );
    }

    // Check suspicious User Agent
    if (!userAgent || userAgent.length < 5) {
      logger.suspiciousActivity(
        "Suspicious or missing user agent",
        ip,
        userAgent || "unknown",
        { endpoint: req.url },
      );
    }

    next();
  };

  return {
    extractClientInfo,
    requestLogger,
    bruteForceProtection,
    recordFailedLogin,
    clearFailedLogins,
    detectSuspiciousPatterns,
  };
};

const defaultInstance = createSecurityMiddleware();
export const extractClientInfo = defaultInstance.extractClientInfo;
export const requestLogger = defaultInstance.requestLogger;
export const bruteForceProtection = defaultInstance.bruteForceProtection;
export const recordFailedLogin = defaultInstance.recordFailedLogin;
export const clearFailedLogins = defaultInstance.clearFailedLogins;
export const detectSuspiciousPatterns =
  defaultInstance.detectSuspiciousPatterns;

export default defaultInstance;
