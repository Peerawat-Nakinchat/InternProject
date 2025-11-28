import { securityLogger } from '../utils/logger.js';
import { ValidationError, UniqueConstraintError, ForeignKeyConstraintError, DatabaseError } from 'sequelize';

/**
 * Enhanced error handler with Sequelize support and security logging
 */
export const errorHandler = (err, req, res, next) => {
  // Default values
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = null;

  console.error('❌ Error occurred:', {
    message: err.message,
    name: err.name,
    status,
    path: req.path,
    method: req.method,
    user: req.user?.user_id,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  if (err instanceof ValidationError) {
    status = 400;
    message = 'Validation error';
    details = err.errors.map(e => ({
      field: e.path,
      message: e.message,
      type: e.type,
      value: e.value
    }));

    securityLogger.suspiciousActivity(
      'Validation error',
      req.clientInfo?.ipAddress || req.ip,
      req.clientInfo?.userAgent || 'unknown',
      { 
        path: req.path,
        details 
      }
    );
  }

  // Sequelize Unique Constraint Error
  else if (err instanceof UniqueConstraintError) {
    status = 409;
    message = 'Duplicate entry';
    const field = err.errors[0]?.path || 'unknown';
    details = {
      field,
      message: `${field} already exists`
    };

    console.warn('⚠️ Duplicate entry attempt:', {
      field,
      value: err.errors[0]?.value,
      user: req.user?.user_id
    });
  }

  // Sequelize Foreign Key Constraint Error
  else if (err instanceof ForeignKeyConstraintError) {
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

  // Sequelize Database Error
  else if (err instanceof DatabaseError) {
    status = 500;
    message = process.env.NODE_ENV === 'production' 
      ? 'Database error' 
      : err.message;

    console.error('💥 Database error:', err.message);
    
    securityLogger.suspiciousActivity(
      'Database error',
      req.clientInfo?.ipAddress || req.ip,
      req.clientInfo?.userAgent || 'unknown',
      { 
        error: err.message,
        path: req.path 
      }
    );
  }

  // JWT Errors
  else if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid token';

    securityLogger.suspiciousActivity(
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

  // Multer Errors (file upload)
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

  // Custom Application Errors
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

  // Security-related errors
  else if (err.code === 'SUSPICIOUS_ACTIVITY') {
    status = 403;
    message = 'Suspicious activity detected';

    securityLogger.suspiciousActivity(
      'Blocked suspicious activity',
      req.clientInfo?.ipAddress || req.ip,
      req.clientInfo?.userAgent || 'unknown',
      { 
        error: err.message,
        path: req.path 
      }
    );
  }

  // Rate Limit Error
  else if (err.name === 'RateLimitError' || status === 429) {
    status = 429;
    message = 'Too many requests, please try again later';

    securityLogger.suspiciousActivity(
      'Rate limit exceeded',
      req.clientInfo?.ipAddress || req.ip,
      req.clientInfo?.userAgent || 'unknown',
      { path: req.path }
    );
  }

  // Generic Error
  else {
    // Log unexpected errors
    if (status === 500) {
      console.error('💥 Unexpected error:', {
        error: err,
        stack: err.stack,
        path: req.path,
        method: req.method,
        user: req.user?.user_id
      });

      // Log to security logger for analysis
      securityLogger.suspiciousActivity(
        'Unexpected server error',
        req.clientInfo?.ipAddress || req.ip,
        req.clientInfo?.userAgent || 'unknown',
        { 
          error: err.message,
          path: req.path 
        }
      );
    }
  }

  // Prepare response
  const response = {
    success: false,
    error: message
  };

  // Add details in development or if available
  if (details) {
    response.details = details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  // Add request ID if available (for tracking)
  if (req.id) {
    response.requestId = req.id;
  }

  // Send response
  res.status(status).json(response);
};

/**
 * 404 Not Found Handler
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.path}`);
  error.status = 404;

  // Log suspicious 404s (possible scanning)
  if (req.path.includes('..') || req.path.includes('admin') || req.path.includes('phpmyadmin')) {
    securityLogger.suspiciousActivity(
      'Suspicious path access attempt',
      req.clientInfo?.ipAddress || req.ip,
      req.clientInfo?.userAgent || 'unknown',
      { path: req.path }
    );
  }

  next(error);
};

/**
 * Async error wrapper for route handlers
 * Catches errors in async functions and passes to error handler
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create custom error
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
 * Helper functions to create specific errors
 */
export const createError = {
  notFound: (message = 'Resource not found') => 
    new AppError(message, 404, 'RESOURCE_NOT_FOUND'),

  unauthorized: (message = 'Unauthorized') => 
    new AppError(message, 401, 'UNAUTHORIZED'),

  forbidden: (message = 'Forbidden') => 
    new AppError(message, 403, 'FORBIDDEN'),

  badRequest: (message = 'Bad request') => 
    new AppError(message, 400, 'BAD_REQUEST'),

  conflict: (message = 'Conflict') => 
    new AppError(message, 409, 'CONFLICT'),

  internal: (message = 'Internal server error') => 
    new AppError(message, 500, 'INTERNAL_ERROR'),

  validation: (message = 'Validation error', details = null) => {
    const error = new AppError(message, 400, 'VALIDATION_ERROR');
    error.details = details;
    return error;
  }
};

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  createError
};