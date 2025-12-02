// src/middleware/sequelizeSecurity.js
import { validationResult } from 'express-validator';
import DOMPurify from 'isomorphic-dompurify';
import { sequelize } from '../models/dbModels.js';

export const createSequelizeSecurityMiddleware = (deps = {}) => {
  const validator = deps.validationResult || validationResult;
  const purifier = deps.DOMPurify || DOMPurify;
  const db = deps.sequelize || sequelize;
  const logger = deps.logger || console;

  const rateLimitStore = new Map();

  // Helper Function: Sanitize single value
  const doSanitize = (value) => {
    if (typeof value === 'string') {
      return purifier.sanitize(value, { 
        ALLOWED_TAGS: [], 
        ALLOWED_ATTR: [] 
      }).trim();
    }
    return value;
  };

  // Recursive object sanitization
  const sanitizeObject = (obj) => {
    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        
        if (Array.isArray(value)) {
          // ✅ FIX: Handle strings inside arrays correctly
          sanitized[key] = value.map(item => {
            if (typeof item === 'object' && item !== null) return sanitizeObject(item);
            return doSanitize(item);
          });
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = sanitizeObject(value);
        } else {
          sanitized[key] = doSanitize(value);
        }
      }
    }
    return sanitized;
  };

  const sanitizeInput = (req, res, next) => {
    try {
      if (req.body && typeof req.body === 'object') req.body = sanitizeObject(req.body);
      if (req.query && typeof req.query === 'object') req.query = sanitizeObject(req.query);
      if (req.params && typeof req.params === 'object') req.params = sanitizeObject(req.params);
      next();
    } catch (error) {
      logger.error('❌ Sanitization error:', error);
      return res.status(500).json({ success: false, error: 'Input validation failed' });
    }
  };

  // ... (ส่วนอื่นๆ เหมือนเดิม ไม่ต้องแก้) ...
  const handleValidationErrors = (req, res, next) => {
    const errors = validator(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array().map(err => ({
          field: err.param,
          message: err.msg,
          value: err.value
        }))
      });
    }
    next();
  };

  const preventMassAssignment = (allowedFields) => {
    return (req, res, next) => {
      if (req.body && typeof req.body === 'object') {
        const filteredBody = {};
        for (const field of allowedFields) {
          if (Object.prototype.hasOwnProperty.call(req.body, field)) {
            filteredBody[field] = req.body[field];
          }
        }
        const removedFields = Object.keys(req.body).filter(key => !allowedFields.includes(key));
        if (removedFields.length > 0) {
          logger.warn('⚠️ Removed fields from request:', removedFields);
        }
        req.body = filteredBody;
      }
      next();
    };
  };

  const withTransaction = (handler) => {
    return async (req, res, next) => {
      const t = await db.transaction();
      try {
        req.transaction = t;
        await handler(req, res, next);
        await t.commit();
      } catch (error) {
        await t.rollback();
        logger.error('❌ Transaction error:', error);
        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            error: process.env.NODE_ENV === 'production' ? 'Transaction failed' : error.message
          });
        }
      }
    };
  };

  const logSuspiciousQueries = () => {
    const suspiciousPatterns = [
      /union.*select/i, /drop.*table/i, /delete.*from/i, 
      /update.*set/i, /insert.*into/i, /<script>/i, 
      /javascript:/i, /onerror=/i, /onclick=/i
    ];

    return (req, res, next) => {
      const checkValue = (value) => {
        if (typeof value === 'string') {
          for (const pattern of suspiciousPatterns) {
            if (pattern.test(value)) {
              logger.error('🚨 SUSPICIOUS PATTERN DETECTED:', {
                pattern: pattern.toString(),
                value,
                ip: req.ip,
                path: req.path,
                method: req.method
              });
              return true;
            }
          }
        }
        return false;
      };

      const allInput = { ...req.body, ...req.query, ...req.params };
      for (const key in allInput) {
        if (checkValue(allInput[key])) {
          return res.status(403).json({ success: false, error: 'Suspicious input detected' });
        }
      }
      next();
    };
  };

  const userRateLimit = (options = {}) => {
    const { windowMs = 15 * 60 * 1000, max = 100 } = options;
    return (req, res, next) => {
      if (!req.user || !req.user.user_id) return next();
      const userId = req.user.user_id;
      const now = Date.now();
      
      if (!rateLimitStore.has(userId)) rateLimitStore.set(userId, []);
      const userRequests = rateLimitStore.get(userId);
      const recentRequests = userRequests.filter(time => now - time < windowMs);

      if (recentRequests.length >= max) {
        return res.status(429).json({ success: false, error: 'Too many requests from this account' });
      }
      recentRequests.push(now);
      rateLimitStore.set(userId, recentRequests);
      next();
    };
  };

  const auditLog = (action) => {
    return async (req, res, next) => {
      const originalSend = res.send;
      res.send = function(data) {
        const logData = {
          action,
          user_id: req.user?.user_id,
          ip: req.ip,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          timestamp: new Date().toISOString()
        };
        if (res.statusCode < 400) {
          logger.log('📝 Audit:', JSON.stringify(logData));
        }
        return originalSend.call(this, data);
      };
      next();
    };
  };

  return {
    sanitizeInput,
    handleValidationErrors,
    preventMassAssignment,
    withTransaction,
    logSuspiciousQueries,
    userRateLimit,
    auditLog,
    _rateLimitStore: rateLimitStore
  };
};

const defaultInstance = createSequelizeSecurityMiddleware();
export const sanitizeInput = defaultInstance.sanitizeInput;
export const handleValidationErrors = defaultInstance.handleValidationErrors;
export const preventMassAssignment = defaultInstance.preventMassAssignment;
export const withTransaction = defaultInstance.withTransaction;
export const logSuspiciousQueries = defaultInstance.logSuspiciousQueries;
export const userRateLimit = defaultInstance.userRateLimit;
export const auditLog = defaultInstance.auditLog;

export default defaultInstance;