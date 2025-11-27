import { validationResult } from 'express-validator';
import DOMPurify from 'isomorphic-dompurify';
import { sequelize } from '../models/dbModels.js';

export const sanitizeInput = (req, res, next) => {
  try {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize params
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    console.error('❌ Sanitization error:', error);
    return res.status(500).json({
      success: false,
      error: 'Input validation failed'
    });
  }
};

// Recursive object sanitization
const sanitizeObject = (obj) => {
  const sanitized = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        // Remove potential XSS
        sanitized[key] = DOMPurify.sanitize(value, { 
          ALLOWED_TAGS: [],
          ALLOWED_ATTR: []
        }).trim();
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = sanitizeObject(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'object' ? sanitizeObject(item) : item
        );
      } else {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized;
};

// Validation Error Handler
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
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

// Prevent Mass Assignment
export const preventMassAssignment = (allowedFields) => {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      const filteredBody = {};
      
      for (const field of allowedFields) {
        if (req.body.hasOwnProperty(field)) {
          filteredBody[field] = req.body[field];
        }
      }
      
      // Log if fields were removed
      const removedFields = Object.keys(req.body).filter(
        key => !allowedFields.includes(key)
      );
      
      if (removedFields.length > 0) {
        console.warn('⚠️ Removed fields from request:', removedFields);
      }
      
      req.body = filteredBody;
    }
    
    next();
  };
};

// Transaction Wrapper with Error Handling
export const withTransaction = (handler) => {
  return async (req, res, next) => {
    const t = await sequelize.transaction();
    
    try {
      req.transaction = t;
      await handler(req, res, next);
      await t.commit();
    } catch (error) {
      await t.rollback();
      console.error('❌ Transaction error:', error);
      
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          error: process.env.NODE_ENV === 'production'
            ? 'Transaction failed'
            : error.message
        });
      }
    }
  };
};

// Query logging for suspicious patterns
export const logSuspiciousQueries = () => {
  const suspiciousPatterns = [
    /union.*select/i,
    /drop.*table/i,
    /delete.*from/i,
    /update.*set/i,
    /insert.*into/i,
    /<script>/i,
    /javascript:/i,
    /onerror=/i,
    /onclick=/i
  ];

  return (req, res, next) => {
    const checkValue = (value) => {
      if (typeof value === 'string') {
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(value)) {
            console.error('🚨 SUSPICIOUS PATTERN DETECTED:', {
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

    // Check all input
    const allInput = { ...req.body, ...req.query, ...req.params };
    
    for (const key in allInput) {
      if (checkValue(allInput[key])) {
        return res.status(403).json({
          success: false,
          error: 'Suspicious input detected'
        });
      }
    }

    next();
  };
};

// Rate limit by user ID (in addition to IP)
export const userRateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100
  } = options;

  const requests = new Map();

  return (req, res, next) => {
    if (!req.user || !req.user.user_id) {
      return next();
    }

    const userId = req.user.user_id;
    const now = Date.now();
    
    if (!requests.has(userId)) {
      requests.set(userId, []);
    }

    const userRequests = requests.get(userId);
    
    // Remove old requests
    const recentRequests = userRequests.filter(
      time => now - time < windowMs
    );

    if (recentRequests.length >= max) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests from this account'
      });
    }

    recentRequests.push(now);
    requests.set(userId, recentRequests);

    next();
  };
};

// Audit log middleware
export const auditLog = (action) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log after response is sent
      const logData = {
        action,
        user_id: req.user?.user_id,
        ip: req.ip,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        timestamp: new Date().toISOString()
      };

      // Only log if response was successful
      if (res.statusCode < 400) {
        console.log('📝 Audit:', JSON.stringify(logData));
        // TODO: Save to audit log table
      }

      originalSend.call(this, data);
    };

    next();
  };
};

// Export all middleware
export default {
  sanitizeInput,
  handleValidationErrors,
  preventMassAssignment,
  withTransaction,
  logSuspiciousQueries,
  userRateLimit,
  auditLog
};