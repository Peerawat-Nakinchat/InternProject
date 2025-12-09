// src/utils/logger.js
import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(colors);

/**
 *  Base Format: ใช้ร่วมกันทั้ง File และ Console (Production)
 * - timestamp: ลงเวลา
 * - errors: จับ Stack Trace อัตโนมัติเมื่อเกิด Error
 * - splat: รองรับ String Interpolation เช่น logger.info('Hello %s', 'World')
 * - json: จัดรูปแบบเป็น JSON เพื่อให้ Tools อ่านง่าย
 */
const baseFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

/**
 * ✅ Dev Console Format: สำหรับหน้าจอตอน Development (อ่านง่าย)
 */
const devConsoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack, ...meta } = info;
    let metaStr = "";
    if (Object.keys(meta).length > 0) {
      metaStr = "\n" + JSON.stringify(meta, null, 2);
    }
    // ถ้ามี Error Stack ให้แสดงต่อท้าย
    return `${timestamp} ${level}: ${message}${stack ? "\n" + stack : ""}${metaStr}`;
  }),
);

// Define transports
const transports = [
  new winston.transports.Console({
    format:
      process.env.NODE_ENV === "production" ? baseFormat : devConsoleFormat,
  }),

  // Error log file
  new winston.transports.File({
    filename: path.join(__dirname, "../../logs/error.log"),
    level: "error",
    format: baseFormat,
  }),

  // Combined log file
  new winston.transports.File({
    filename: path.join(__dirname, "../../logs/combined.log"),
    format: baseFormat,
  }),

  // Security events log file (includes info level for successful operations)
  new winston.transports.File({
    filename: path.join(__dirname, "../../logs/security.log"),
    level: "info",
    format: baseFormat,
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  levels,
  transports,
});

// Security-specific logging functions
export const securityLogger = {
  // ✅ Basic logging methods (delegate to winston logger)
  error: (message, meta = {}) => logger.error(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),

  loginSuccess: (userId, email, ipAddress, userAgent) => {
    logger.info("LOGIN_SUCCESS", {
      userId,
      email,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log failed login attempt
   */
  loginFailed: (email, ipAddress, userAgent, reason) => {
    logger.warn("LOGIN_FAILED", {
      email,
      ipAddress,
      userAgent,
      reason,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log registration success
   */
  registrationSuccess: (userId, email, ipAddress, userAgent) => {
    logger.info("REGISTRATION_SUCCESS", {
      userId,
      email,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log registration failure
   */
  registrationFailed: (email, ipAddress, userAgent, reason) => {
    logger.warn("REGISTRATION_FAILED", {
      email,
      ipAddress,
      userAgent,
      reason,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log password reset request
   */
  passwordResetRequest: (email, ipAddress, userAgent, userExists) => {
    logger.info("PASSWORD_RESET_REQUEST", {
      email,
      ipAddress,
      userAgent,
      userExists,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log password reset success
   */
  passwordResetSuccess: (userId, email, ipAddress, userAgent) => {
    logger.info("PASSWORD_RESET_SUCCESS", {
      userId,
      email,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log password reset failure
   */
  passwordResetFailed: (email, ipAddress, userAgent, reason) => {
    logger.warn("PASSWORD_RESET_FAILED", {
      email,
      ipAddress,
      userAgent,
      reason,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log token refresh
   */
  tokenRefresh: (userId, ipAddress, userAgent) => {
    logger.info("TOKEN_REFRESH", {
      userId,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log logout
   */
  logout: (userId, ipAddress, userAgent) => {
    logger.info("LOGOUT", {
      userId,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log suspicious activity
   */
  suspiciousActivity: (description, ipAddress, userAgent, metadata = {}) => {
    logger.error("SUSPICIOUS_ACTIVITY", {
      description,
      ipAddress,
      userAgent,
      metadata,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log unauthorized access attempt
   */
  unauthorizedAccess: (userId, email, resource, ipAddress, userAgent) => {
    logger.warn("UNAUTHORIZED_ACCESS", {
      userId,
      email,
      resource,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log account lockout
   */
  accountLockout: (userId, email, ipAddress, reason) => {
    logger.error("ACCOUNT_LOCKOUT", {
      userId,
      email,
      ipAddress,
      reason,
      timestamp: new Date().toISOString(),
    });
  },
};

export default logger;
