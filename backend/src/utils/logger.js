// src/utils/logger.js
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

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
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Define format for console (shows metadata)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = '\n' + JSON.stringify(meta, null, 2);
    }
    return `${timestamp} ${level}: ${message}${metaStr}`;
  }),
);

// Define format for file (JSON)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: consoleFormat,
  }),
  
  // Error log file
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
    format: fileFormat,
  }),
  
  // Combined log file
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/combined.log'),
    format: fileFormat,
  }),
  
  // Security events log file (includes info level for successful operations)
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/security.log'),
    level: 'info',
    format: fileFormat,
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels,
  transports,
});

// Security-specific logging functions
export const securityLogger = {
  /**
   * Log successful login
   */
  loginSuccess: (userId, email, ipAddress, userAgent) => {
    logger.info('LOGIN_SUCCESS', {
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
    logger.warn('LOGIN_FAILED', {
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
    logger.info('REGISTRATION_SUCCESS', {
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
    logger.warn('REGISTRATION_FAILED', {
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
    logger.info('PASSWORD_RESET_REQUEST', {
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
    logger.info('PASSWORD_RESET_SUCCESS', {
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
    logger.warn('PASSWORD_RESET_FAILED', {
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
    logger.info('TOKEN_REFRESH', {
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
    logger.info('LOGOUT', {
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
    logger.error('SUSPICIOUS_ACTIVITY', {
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
    logger.warn('UNAUTHORIZED_ACCESS', {
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
    logger.error('ACCOUNT_LOCKOUT', {
      userId,
      email,
      ipAddress,
      reason,
      timestamp: new Date().toISOString(),
    });
  },
};

export default logger;
