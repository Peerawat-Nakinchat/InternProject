// src/middleware/sequelizeSecurity.js
import DOMPurify from 'isomorphic-dompurify';
import { createError } from './errorHandler.js';

export const createSequelizeSecurityMiddleware = (deps = {}) => {
  const purifier = deps.DOMPurify || DOMPurify;
  const doSanitize = (value) => {
    if (typeof value === 'string') {
      return purifier.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
    }
    return value;
  };

  const sanitizeObject = (obj) => {
    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (Array.isArray(value)) {
          sanitized[key] = value.map(item => (typeof item === 'object' && item !== null) ? sanitizeObject(item) : doSanitize(item));
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
      next(createError.badRequest('Input sanitization failed'));
    }
  };


  return { sanitizeInput };
};

const defaultInstance = createSequelizeSecurityMiddleware();
export const sanitizeInput = defaultInstance.sanitizeInput;
export default defaultInstance;