// src/middleware/sequelizeSecurity.js
import DOMPurify from 'isomorphic-dompurify';

export const createSequelizeSecurityMiddleware = (deps = {}) => {
  const purifier = deps.DOMPurify || DOMPurify;
  const validationResult = deps.validationResult; 
  const sequelize = deps.sequelize;
  const logger = deps.logger || console;

  const doSanitize = (value) => {
    if (typeof value === 'string') {
      return purifier.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
    }
    return value;
  };

  const sanitizeObject = (obj) => {
    if (!obj) return obj;
    const sanitized = {};
    
    const ignoreFields = ['password', 'confirm_password', 'oldPassword', 'newPassword', 'password_confirmation'];

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        
        if (ignoreFields.includes(key)) {
            sanitized[key] = value;
            continue; 
        }

        if (Array.isArray(value)) {
          sanitized[key] = value.map(item => 
            (typeof item === 'object' && item !== null) ? sanitizeObject(item) : doSanitize(item)
          );
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
      if (req.body) req.body = sanitizeObject(req.body);
      if (req.query) req.query = sanitizeObject(req.query);
      if (req.params) req.params = sanitizeObject(req.params);
      next();
    } catch (error) {
      logger.error('Sanitization Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  const handleValidationErrors = (req, res, next) => {
    if (!validationResult) return next();
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  };

  const preventMassAssignment = (allowedFields = []) => (req, res, next) => {
    if (!req.body || typeof req.body !== 'object') return next();

    const removedFields = [];
    Object.keys(req.body).forEach(key => {
      if (!allowedFields.includes(key)) {
        delete req.body[key];
        removedFields.push(key);
      }
    });

    if (removedFields.length > 0) {
      logger.warn(`Potential mass assignment attempt. Removed fields: ${removedFields.join(', ')}`, removedFields);
    }
    next();
  };

  const withTransaction = (handler) => async (req, res, next) => {
    if (!sequelize) {
        return res.status(500).json({ error: 'Database configuration error' });
    }

    const t = await sequelize.transaction();
    try {
      await handler(req, res, next, t);
      await t.commit();
    } catch (error) {
      await t.rollback();
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  };

  const logSuspiciousQueries = () => (req, res, next) => {
    const sqlPattern = /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|--|;)/i;
    
    const check = (obj) => JSON.stringify(obj).match(sqlPattern);

    if ((req.body && check(req.body)) || (req.query && check(req.query))) {
      logger.error('Suspicious SQL pattern detected', { ip: req.ip, path: req.path });
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };

  const rateLimitStore = new Map();
  const userRateLimit = (options = { max: 100 }) => (req, res, next) => {
    if (!req.user || !req.user.user_id) return next();

    const key = req.user.user_id;
    const current = rateLimitStore.get(key) || 0;

    if (current >= options.max) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    rateLimitStore.set(key, current + 1);
    next();
  };

  const auditLog = (action) => (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logger.log('📝 Audit:', `Action: ${action} by User: ${req.user?.user_id || 'Guest'}`);
      }
    });
    next();
  };

  return {
    sanitizeInput,
    handleValidationErrors,
    preventMassAssignment,
    withTransaction,
    logSuspiciousQueries,
    userRateLimit,
    auditLog
  };
};

const defaultInstance = createSequelizeSecurityMiddleware();

export const { 
    sanitizeInput, 
    handleValidationErrors, 
    preventMassAssignment, 
    withTransaction, 
    logSuspiciousQueries, 
    userRateLimit, 
    auditLog 
} = defaultInstance;

export default defaultInstance;