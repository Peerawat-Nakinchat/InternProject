// test/middleware/errorHandler.coverage.test.js
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  createErrorHandlerMiddleware, 
  AppError, 
  createError, 
  asyncHandler 
} from '../../src/middleware/errorHandler.js';

// Mock Error Classes for Sequelize
class MockValidationError extends Error {
  constructor(errors) { super('Validation Error'); this.errors = errors; }
}
class MockUniqueConstraintError extends Error {
  constructor(errors) { super('Unique Error'); this.errors = errors; }
}
class MockForeignKeyConstraintError extends Error {
  constructor(fields) { super('FK Error'); this.fields = fields; }
}
class MockDatabaseError extends Error {
  constructor(msg) { super(msg); }
}

describe('ErrorHandler Middleware (100% Coverage)', () => {
  let middleware;
  let mockLogger;
  let req, res, next;
  let consoleErrorSpy, consoleWarnSpy;
  let originalEnv;

  beforeEach(() => {
    // 1. Mock Dependencies
    mockLogger = { suspiciousActivity: jest.fn() };
    
    // 2. Inject Mocks via Factory
    middleware = createErrorHandlerMiddleware({
      securityLogger: mockLogger,
      SequelizeErrors: {
        ValidationError: MockValidationError,
        UniqueConstraintError: MockUniqueConstraintError,
        ForeignKeyConstraintError: MockForeignKeyConstraintError,
        DatabaseError: MockDatabaseError
      }
    });

    // 3. Mock Express
    req = {
      path: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      clientInfo: { ipAddress: '127.0.0.1', userAgent: 'Jest' },
      user: { user_id: 'u1' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();

    // 4. Spy on Console
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Save env
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = originalEnv;
  });

  // ==========================================
  // 1. Utilities Tests
  // ==========================================
  describe('Utilities', () => {
    it('AppError should construct correctly', () => {
      const err = new AppError('Msg', 400, 'CODE');
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('CODE');
      expect(err.isOperational).toBe(true);
    });

    it('createError helpers should return AppError', () => {
      expect(createError.notFound().status).toBe(404);
      expect(createError.unauthorized().status).toBe(401);
      expect(createError.forbidden().status).toBe(403);
      expect(createError.badRequest().status).toBe(400);
      expect(createError.conflict().status).toBe(409);
      expect(createError.internal().status).toBe(500);
      
      const valErr = createError.validation('Val', { f: 1 });
      expect(valErr.status).toBe(400);
      expect(valErr.details).toEqual({ f: 1 });
    });

    it('asyncHandler should catch errors', async () => {
      const err = new Error('Async Fail');
      const fn = async () => { throw err; };
      const wrapper = asyncHandler(fn);
      
      await wrapper(req, res, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  // ==========================================
  // 2. Not Found Handler
  // ==========================================
  describe('notFoundHandler', () => {
    it('should create 404 error', () => {
      middleware.notFoundHandler(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Route not found'),
        status: 404
      }));
    });

    it('should log suspicious paths', () => {
      req.path = '/admin/login';
      middleware.notFoundHandler(req, res, next);
      expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith(
        'Suspicious path access attempt',
        expect.anything(), expect.anything(), expect.anything()
      );
    });
  });

  // ==========================================
  // 3. Error Handler
  // ==========================================
  describe('errorHandler', () => {
    // --- Sequelize ---
    it('should handle Sequelize ValidationError', () => {
      const err = new MockValidationError([{ path: 'email', message: 'Invalid', type: 'val', value: 'x' }]);
      middleware.errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Validation error' }));
      expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith('Validation error', expect.anything(), expect.anything(), expect.anything());
    });

    it('should handle Sequelize UniqueConstraintError', () => {
      const err = new MockUniqueConstraintError([{ path: 'email', value: 'dup@mail.com' }]);
      middleware.errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Duplicate entry' }));
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should handle Sequelize ForeignKeyConstraintError', () => {
      const err = new MockForeignKeyConstraintError(['user_id']);
      middleware.errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid reference' }));
    });

    it('should handle Sequelize DatabaseError (Production)', () => {
      process.env.NODE_ENV = 'production';
      const err = new MockDatabaseError('Connection died');
      middleware.errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Database error' }));
      expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith('Database error', expect.anything(), expect.anything(), expect.anything());
    });

    it('should handle Sequelize DatabaseError (Development)', () => {
      process.env.NODE_ENV = 'development';
      const err = new MockDatabaseError('Connection died');
      middleware.errorHandler(err, req, res, next);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Connection died' }));
    });

    // --- JWT ---
    it('should handle JsonWebTokenError', () => {
      const err = new Error('Invalid');
      err.name = 'JsonWebTokenError';
      middleware.errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith('Invalid JWT token attempt', expect.anything(), expect.anything(), expect.anything());
    });

    it('should handle TokenExpiredError', () => {
      const err = new Error('Expired');
      err.name = 'TokenExpiredError';
      middleware.errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Token expired' }));
    });

    // --- Multer ---
    it('should handle Multer limit error', () => {
      const err = new Error('Limit');
      err.name = 'MulterError';
      err.code = 'LIMIT_FILE_SIZE';
      middleware.errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'File too large' }));
    });

    it('should handle Multer file count error', () => {
        const err = new Error('Count');
        err.name = 'MulterError';
        err.code = 'LIMIT_FILE_COUNT';
        middleware.errorHandler(err, req, res, next);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Too many files' }));
    });

    it('should handle Multer unexpected file', () => {
        const err = new Error('Unexpected');
        err.name = 'MulterError';
        err.code = 'LIMIT_UNEXPECTED_FILE';
        middleware.errorHandler(err, req, res, next);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Unexpected file field' }));
    });

    it('should handle generic Multer error', () => {
        const err = new Error('Generic Multer');
        err.name = 'MulterError';
        middleware.errorHandler(err, req, res, next);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Generic Multer' }));
    });

    // --- Custom Codes ---
    it('should handle USER_EXISTS', () => {
      const err = new Error('Dup');
      err.code = 'USER_EXISTS';
      middleware.errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('should handle INSUFFICIENT_PERMISSIONS', () => {
      const err = new Error('Perm');
      err.code = 'INSUFFICIENT_PERMISSIONS';
      middleware.errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle RESOURCE_NOT_FOUND', () => {
      const err = new Error('Missing');
      err.code = 'RESOURCE_NOT_FOUND';
      middleware.errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should handle SUSPICIOUS_ACTIVITY', () => {
      const err = new Error('Bot');
      err.code = 'SUSPICIOUS_ACTIVITY';
      middleware.errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith('Blocked suspicious activity', expect.anything(), expect.anything(), expect.anything());
    });

    // --- Rate Limit ---
    it('should handle RateLimitError', () => {
      const err = new Error('Rate');
      err.name = 'RateLimitError';
      middleware.errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith('Rate limit exceeded', expect.anything(), expect.anything(), expect.anything());
    });

    it('should handle status 429', () => {
        const err = new Error('Rate');
        err.statusCode = 429;
        middleware.errorHandler(err, req, res, next);
        expect(res.status).toHaveBeenCalledWith(429);
    });

    // --- Generic / Fallback ---
    it('should handle generic 500 error', () => {
      const err = new Error('Boom');
      middleware.errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(consoleErrorSpy).toHaveBeenCalledWith('💥 Unexpected error:', expect.anything());
      expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith('Unexpected server error', expect.anything(), expect.anything(), expect.anything());
    });

    it('should include stack trace in development', () => {
      process.env.NODE_ENV = 'development';
      const err = new Error('Stack');
      middleware.errorHandler(err, req, res, next);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ stack: expect.any(String) }));
    });

    it('should include requestId if present', () => {
      req.id = 'req-123';
      const err = new Error('Err');
      middleware.errorHandler(err, req, res, next);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'req-123' }));
    });
  });
});