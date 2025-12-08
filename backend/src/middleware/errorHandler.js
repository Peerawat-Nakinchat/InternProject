// src/middleware/errorHandler.js
import { securityLogger } from '../utils/logger.js';
import { 
  ValidationError, 
  UniqueConstraintError, 
  ForeignKeyConstraintError, 
  DatabaseError 
} from 'sequelize';


/**
 * Async error wrapper
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom App Error
 */
export class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Helper to create specific errors
 */
export const createError = {
  notFound: (message = 'Resource not found') => new AppError(message, 404, 'RESOURCE_NOT_FOUND'),
  unauthorized: (message = 'Unauthorized') => new AppError(message, 401, 'UNAUTHORIZED'),
  forbidden: (message = 'Forbidden') => new AppError(message, 403, 'FORBIDDEN'),
  badRequest: (message = 'Bad request') => new AppError(message, 400, 'BAD_REQUEST'),
  conflict: (message = 'Conflict') => new AppError(message, 409, 'CONFLICT'),
  internal: (message = 'Internal server error') => new AppError(message, 500, 'INTERNAL_ERROR'),
  validation: (message = 'Validation error', details = null) => {
    const error = new AppError(message, 400, 'VALIDATION_ERROR');
    error.details = details;
    return error;
  }
};

// --- Factory Function ---

export const createErrorHandlerMiddleware = (deps = {}) => {
  // Inject Dependencies
  const logger = deps.securityLogger || securityLogger;
  const SeqErrors = deps.SequelizeErrors || {
    ValidationError,
    UniqueConstraintError,
    ForeignKeyConstraintError,
    DatabaseError
  };

  /**
   * 404 Handler
   */
  const notFoundHandler = (req, res, next) => {
    const error = new Error(`Route not found: ${req.method} ${req.path}`);
    error.status = 404;

    // Log suspicious 404s
    if (req.path.includes('..') || req.path.includes('admin') || req.path.includes('phpmyadmin')) {
      logger.suspiciousActivity(
        'Suspicious path access attempt',
        req.clientInfo?.ipAddress || req.ip,
        req.clientInfo?.userAgent || 'unknown',
        { path: req.path }
      );
    }

    next(error);
  };

  /**
   * Main Error Handler
   */
  const errorHandler = (err, req, res, next) => {
    let status = err.status || err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let details = err.details || null; // Use existing details if present (e.g. from createError.validation)

    console.error('❌ Error occurred:', {
      message: err.message,
      name: err.name,
      status,
      path: req.path,
      method: req.method,
      user: req.user?.user_id,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    // --- Sequelize Errors ---
    if (err instanceof SeqErrors.ValidationError) {
      status = 400;
      message = 'Validation error';
      details = err.errors.map(e => ({
        field: e.path,
        message: e.message,
        type: e.type,
        value: e.value
      }));

      logger.suspiciousActivity(
        'Validation error',
        req.clientInfo?.ipAddress || req.ip,
        req.clientInfo?.userAgent || 'unknown',
        { path: req.path, details }
      );
    }
    else if (err instanceof SeqErrors.UniqueConstraintError) {
      status = 409;
      message = 'Duplicate entry';
      const field = err.errors[0]?.path || 'unknown';
      details = { field, message: `${field} already exists` };

      console.warn('⚠️ Duplicate entry attempt:', {
        field,
        value: err.errors[0]?.value,
        user: req.user?.user_id
      });
    }
    else if (err instanceof SeqErrors.ForeignKeyConstraintError) {
      status = 400;
      message = 'Invalid reference';
      details = {
        field: err.fields?.[0] || 'unknown',
        message: 'Referenced record does not exist'
      };

      console.warn('⚠️ Foreign key constraint violation:', {
        field: err.fields,
        user: req.user?.user_id
      });
    }
    else if (err instanceof SeqErrors.DatabaseError) {
      status = 500;
      message = process.env.NODE_ENV === 'production' ? 'Database error' : err.message;

      console.error('💥 Database error:', err.message);
      logger.suspiciousActivity(
        'Database error',
        req.clientInfo?.ipAddress || req.ip,
        req.clientInfo?.userAgent || 'unknown',
        { error: err.message, path: req.path }
      );
    }

    // --- JWT Errors ---
    else if (err.name === 'JsonWebTokenError') {
      status = 401;
      message = 'Invalid token';
      logger.suspiciousActivity(
        'Invalid JWT token attempt',
        req.clientInfo?.ipAddress || req.ip,
        req.clientInfo?.userAgent || 'unknown',
        { path: req.path }
      );
    }
    else if (err.name === 'TokenExpiredError') {
      status = 401;
      message = 'Token expired';
    }

    // --- Multer Errors ---
    else if (err.name === 'MulterError') {
      status = 400;
      if (err.code === 'LIMIT_FILE_SIZE') {
        message = 'File too large';
        details = { maxSize: '10MB' };
      } else if (err.code === 'LIMIT_FILE_COUNT') {
        message = 'Too many files';
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        message = 'Unexpected file field';
      } else {
        message = err.message;
      }
    }

    // --- Custom Errors Code Handling ---
    else if (err.code === 'USER_EXISTS') {
      status = 409;
      message = 'User already exists';
    }
    else if (err.code === 'INSUFFICIENT_PERMISSIONS') {
      status = 403;
      message = 'Insufficient permissions';
    }
    else if (err.code === 'RESOURCE_NOT_FOUND') {
      status = 404;
      message = err.message || 'Resource not found';
    }
    else if (err.code === 'SUSPICIOUS_ACTIVITY') {
      status = 403;
      message = 'Suspicious activity detected';
      logger.suspiciousActivity(
        'Blocked suspicious activity',
        req.clientInfo?.ipAddress || req.ip,
        req.clientInfo?.userAgent || 'unknown',
        { error: err.message, path: req.path }
      );
    }

    // --- Rate Limit & Generic ---
    else if (err.name === 'RateLimitError' || status === 429) {
      status = 429;
      message = 'Too many requests, please try again later';
      logger.suspiciousActivity(
        'Rate limit exceeded',
        req.clientInfo?.ipAddress || req.ip,
        req.clientInfo?.userAgent || 'unknown',
        { path: req.path }
      );
    }
    else if (status === 500 && !message.includes('Database error')) {
      // Catch-all for other 500s
      console.error('💥 Unexpected error:', {
        error: err,
        stack: err.stack,
        path: req.path,
        method: req.method,
        user: req.user?.user_id
      });
      logger.suspiciousActivity(
        'Unexpected server error',
        req.clientInfo?.ipAddress || req.ip,
        req.clientInfo?.userAgent || 'unknown',
        { error: err.message, path: req.path }
      );
    }

    // --- Response Construction ---
    const response = {
      success: false,
      error: message
    };

    if (details) response.details = details;
    if (process.env.NODE_ENV === 'development' && err.stack) response.stack = err.stack;
    if (req.id) response.requestId = req.id;

    res.status(status).json(response);
  };

  return { errorHandler, notFoundHandler };
};

// Default Instance
const defaultInstance = createErrorHandlerMiddleware();
export const errorHandler = defaultInstance.errorHandler;
export const notFoundHandler = defaultInstance.notFoundHandler;
export default {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  createError
};