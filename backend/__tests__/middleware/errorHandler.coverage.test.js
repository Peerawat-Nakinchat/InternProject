import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  createErrorHandlerMiddleware, 
  createError, 
  AppError, 
  asyncHandler // เพิ่ม import นี้
} from '../../src/middleware/errorHandler.js';

describe('ErrorHandlerMiddleware (100% Coverage)', () => {
  let middleware;
  let mockLogger;
  let req, mockRes, mockNext;
  let mockSeqErrors;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'development'; // Default to development
    
    // ✅ แก้ไขจุดที่ทำให้เกิด Error: เพิ่ม error และ warn ลงใน mock
    mockLogger = { 
      suspiciousActivity: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };
    
    // Mock Sequelize Error Classes
    mockSeqErrors = {
      ValidationError: class extends Error { 
        constructor(errors) { 
          super('Validation Error'); 
          this.name = 'SequelizeValidationError'; 
          this.errors = errors; 
        } 
      },
      UniqueConstraintError: class extends Error { 
        constructor(errors) { 
          super('Unique Constraint Error'); 
          this.name = 'SequelizeUniqueConstraintError'; 
          this.errors = errors; 
        } 
      },
      ForeignKeyConstraintError: class extends Error { 
        constructor(fields) { 
          super('Foreign Key Error'); 
          this.name = 'SequelizeForeignKeyConstraintError'; 
          this.fields = fields; 
        } 
      },
      DatabaseError: class extends Error { 
        constructor(msg) { 
          super(msg); 
          this.name = 'SequelizeDatabaseError'; 
        } 
      }
    };

    middleware = createErrorHandlerMiddleware({ 
      securityLogger: mockLogger,
      SequelizeErrors: mockSeqErrors
    });
    
    req = { 
      path: '/test', 
      method: 'GET', 
      ip: '127.0.0.1',
      clientInfo: { ipAddress: '1.1.1.1', userAgent: 'test-agent' }, 
      user: { user_id: 'u1' } 
    };
    
    mockRes = { 
      status: jest.fn().mockReturnThis(), 
      json: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
    
    // Silence console for clean test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv; // Restore original
    jest.restoreAllMocks();
  });

  // ========================================
  // asyncHandler Tests (Added for 100%)
  // ========================================
  describe('asyncHandler', () => {
    it('should execute the function and catch errors', async () => {
      const error = new Error('Async Error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      
      const wrapped = asyncHandler(asyncFn);
      await wrapped(req, mockRes, mockNext);

      expect(asyncFn).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should pass successful execution', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      
      const wrapped = asyncHandler(asyncFn);
      await wrapped(req, mockRes, mockNext);

      expect(asyncFn).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // notFoundHandler Tests
  // ========================================
  describe('notFoundHandler', () => {
    it('should handle standard 404 and pass error to next()', () => {
      req.method = 'POST';
      req.path = '/api/unknown';
      
      middleware.notFoundHandler(req, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ 
          status: 404,
          message: expect.stringContaining('POST /api/unknown')
        })
      );
    });

    it('should log suspicious 404s with path traversal', () => {
      req.path = '/../../../etc/passwd';
      
      middleware.notFoundHandler(req, mockRes, mockNext);
      
      expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith(
        'Suspicious path access attempt',
        '1.1.1.1',
        'test-agent',
        expect.objectContaining({ path: req.path })
      );
    });

    it('should log suspicious admin path access', () => {
      req.path = '/admin/dashboard';
      
      middleware.notFoundHandler(req, mockRes, mockNext);
      
      expect(mockLogger.suspiciousActivity).toHaveBeenCalled();
    });

    it('should log phpmyadmin access attempts', () => {
      req.path = '/phpmyadmin/index.php';
      
      middleware.notFoundHandler(req, mockRes, mockNext);
      
      expect(mockLogger.suspiciousActivity).toHaveBeenCalled();
    });

    it('should fallback to req.ip when clientInfo is missing', () => {
      req.clientInfo = undefined;
      req.path = '/../admin';
      
      middleware.notFoundHandler(req, mockRes, mockNext);
      
      expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith(
        expect.any(String),
        '127.0.0.1', // ← ใช้ req.ip
        'unknown',
        expect.any(Object)
      );
    });
  });

  // ========================================
  // errorHandler Tests
  // ========================================
  describe('errorHandler', () => {
    
    // --- Development vs Production Mode ---
    describe('Environment-specific behavior', () => {
      it('should include stack trace in development mode', () => {
        process.env.NODE_ENV = 'development';
        const err = new Error('Dev Error');
        err.statusCode = 500;

        middleware.errorHandler(err, req, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.stack).toBeDefined();
        expect(response.stack).toContain('Dev Error');
        expect(mockLogger.error).toHaveBeenCalled();
      });

      it('should NOT include stack trace in production mode', () => {
        process.env.NODE_ENV = 'production';
        const err = new Error('Prod Error');
        err.statusCode = 500;

        middleware.errorHandler(err, req, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.stack).toBeUndefined();
      });
    });

    // --- AppError and Custom Errors ---
    describe('AppError handling', () => {
      it('should handle AppError with all properties', () => {
        const err = new AppError('Not Found', 404, 'RESOURCE_NOT_FOUND');

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ 
            success: false,
            error: 'Not Found'
          })
        );
      });

      it('should preserve details from validation errors', () => {
        const err = createError.validation('Invalid input', [
          { field: 'email', message: 'Invalid email' }
        ]);

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ 
            details: expect.arrayContaining([
              expect.objectContaining({ field: 'email' })
            ])
          })
        );
      });

      it('should include email field if present in error (Added for Coverage)', () => {
        const err = new Error('Verification needed');
        err.code = 'EMAIL_NOT_VERIFIED';
        err.email = 'test@example.com';

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ 
            code: 'EMAIL_NOT_VERIFIED',
            email: 'test@example.com' 
          })
        );
      });
    });

    // --- Sequelize Errors ---
    describe('Sequelize Error handling', () => {
      it('should handle ValidationError with field details', () => {
        const err = new mockSeqErrors.ValidationError([
          { path: 'email', message: 'Invalid email', type: 'isEmail', value: 'bad-email' },
          { path: 'password', message: 'Too short', type: 'len', value: '123' }
        ]);

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation error',
            details: expect.arrayContaining([
              expect.objectContaining({ field: 'email', message: 'Invalid email' }),
              expect.objectContaining({ field: 'password', message: 'Too short' })
            ])
          })
        );
        expect(mockLogger.suspiciousActivity).toHaveBeenCalled();
      });

      it('should handle UniqueConstraintError with field info', () => {
        const err = new mockSeqErrors.UniqueConstraintError([
          { path: 'email', value: 'duplicate@test.com' }
        ]);

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(409);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Duplicate entry',
            details: expect.objectContaining({ 
              field: 'email',
              message: 'email already exists'
            })
          })
        );
        expect(mockLogger.warn).toHaveBeenCalled(); // Check warn log
      });

      it('should handle UniqueConstraintError with missing path', () => {
        const err = new mockSeqErrors.UniqueConstraintError([{}]);

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.objectContaining({ field: 'unknown' })
          })
        );
      });

      it('should handle ForeignKeyConstraintError', () => {
        const err = new mockSeqErrors.ForeignKeyConstraintError(['org_id']);

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Invalid reference',
            details: expect.objectContaining({
              field: 'org_id',
              message: 'Referenced record does not exist'
            })
          })
        );
        expect(mockLogger.warn).toHaveBeenCalled();
      });

      it('should handle ForeignKeyConstraintError with missing fields', () => {
        const err = new mockSeqErrors.ForeignKeyConstraintError(undefined);

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.objectContaining({ field: 'unknown' })
          })
        );
      });

      it('should handle DatabaseError in development mode', () => {
        process.env.NODE_ENV = 'development';
        const err = new mockSeqErrors.DatabaseError('Connection timeout');

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ 
            error: 'Connection timeout' // ← แสดง message ใน dev
          })
        );
        expect(mockLogger.error).toHaveBeenCalled();
        expect(mockLogger.suspiciousActivity).toHaveBeenCalled();
      });

      it('should handle DatabaseError in production mode', () => {
        process.env.NODE_ENV = 'production';
        const err = new mockSeqErrors.DatabaseError('SQL Syntax Error');

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ 
            error: 'Database error' // ← ซ่อน message ใน prod
          })
        );
      });
    });

    // --- JWT Errors ---
    describe('JWT Error handling', () => {
      it('should handle JsonWebTokenError', () => {
        const err = new Error('jwt malformed');
        err.name = 'JsonWebTokenError';

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: 'Invalid token' })
        );
        expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith(
          'Invalid JWT token attempt',
          '1.1.1.1',
          'test-agent',
          expect.objectContaining({ path: '/test' })
        );
        // JWT error triggers warn level log in errorHandler logic
        expect(mockLogger.error).toHaveBeenCalled();
      });

      it('should handle TokenExpiredError', () => {
        const err = new Error('jwt expired');
        err.name = 'TokenExpiredError';

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: 'Token expired' })
        );
      });
    });

    // --- Multer Errors ---
    describe('Multer Error handling', () => {
      it('should handle LIMIT_FILE_SIZE', () => {
        const err = new Error('File too large');
        err.name = 'MulterError';
        err.code = 'LIMIT_FILE_SIZE';

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ 
            error: 'File too large',
            details: expect.objectContaining({ maxSize: '10MB' })
          })
        );
      });

      it('should handle LIMIT_FILE_COUNT', () => {
        const err = new Error('Too many');
        err.name = 'MulterError';
        err.code = 'LIMIT_FILE_COUNT';

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: 'Too many files' })
        );
      });

      it('should handle LIMIT_UNEXPECTED_FILE', () => {
        const err = new Error('Unexpected');
        err.name = 'MulterError';
        err.code = 'LIMIT_UNEXPECTED_FILE';

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: 'Unexpected file field' })
        );
      });

      it('should handle generic MulterError', () => {
        const err = new Error('Upload failed');
        err.name = 'MulterError';
        err.code = 'UNKNOWN_ERROR';

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: 'Upload failed' })
        );
      });
    });

    // --- Custom Error Codes ---
    describe('Custom Error Code handling', () => {
      it('should handle USER_EXISTS', () => {
        const err = new Error('User exists');
        err.code = 'USER_EXISTS';

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(409);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: 'User already exists' })
        );
      });

      it('should handle INSUFFICIENT_PERMISSIONS', () => {
        const err = new Error('No access');
        err.code = 'INSUFFICIENT_PERMISSIONS';

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: 'Insufficient permissions' })
        );
      });

      it('should handle RESOURCE_NOT_FOUND', () => {
        const err = new Error('User not found');
        err.code = 'RESOURCE_NOT_FOUND';

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: 'User not found' })
        );
      });

      it('should handle RESOURCE_NOT_FOUND with default message', () => {
        const err = new Error();
        err.code = 'RESOURCE_NOT_FOUND';

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: 'Resource not found' })
        );
      });

      it('should handle SUSPICIOUS_ACTIVITY', () => {
        const err = new Error('Bot detected');
        err.code = 'SUSPICIOUS_ACTIVITY';

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: 'Suspicious activity detected' })
        );
        expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith(
          'Blocked suspicious activity',
          '1.1.1.1',
          'test-agent',
          expect.objectContaining({ error: 'Bot detected' })
        );
      });
    });

    // --- Rate Limit Errors ---
    describe('Rate Limit handling', () => {
      it('should handle RateLimitError by name', () => {
        const err = new Error('Rate limit');
        err.name = 'RateLimitError';

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(429);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ 
            error: 'Too many requests, please try again later' 
          })
        );
        expect(mockLogger.suspiciousActivity).toHaveBeenCalled();
      });

      it('should handle error with status 429', () => {
        const err = new Error('Too many');
        err.status = 429;

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(429);
        expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith(
          'Rate limit exceeded',
          expect.any(String),
          expect.any(String),
          expect.objectContaining({ path: '/test' })
        );
      });
    });

    // --- Generic 500 Errors ---
    describe('Generic 500 Error handling', () => {
      it('should handle unexpected 500 error in development', () => {
        process.env.NODE_ENV = 'development';
        const err = new Error('Unexpected crash');

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ 
            success: false,
            error: 'Unexpected crash', // ← แสดง message ใน dev
            stack: expect.any(String)
          })
        );
        expect(mockLogger.error).toHaveBeenCalled(); // 500 logs as error
        expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith(
          'Unexpected server error',
          expect.any(String),
          expect.any(String),
          expect.objectContaining({ error: 'Unexpected crash' })
        );
      });

      it('should handle error with missing message', () => {
        const err = new Error();
        
        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: 'Internal Server Error' })
        );
      });

      it('should handle error with missing statusCode', () => {
        const err = new Error('Something broke');
        
        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(500);
      });
    });

    // --- Request ID and Additional Fields ---
    describe('Additional response fields', () => {
      it('should include requestId if present', () => {
        req.id = 'req-12345';
        const err = new AppError('Error', 400);

        middleware.errorHandler(err, req, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.requestId).toBe('req-12345');
      });

      it('should work without user in request', () => {
        req.user = undefined;
        const err = new Error('Public error');

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        // ไม่ crash
      });

      it('should work without clientInfo in request', () => {
        req.clientInfo = undefined;
        const err = new Error('Error');
        err.name = 'JsonWebTokenError';

        middleware.errorHandler(err, req, mockRes, mockNext);

        expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith(
          expect.any(String),
          '127.0.0.1', // ← Fallback to req.ip
          'unknown',   // ← Fallback for userAgent
          expect.any(Object)
        );
      });
    });
  });

  // ========================================
  // createError Helper Tests
  // ========================================
  describe('createError helpers', () => {
    it('should create notFound error', () => {
      const err = createError.notFound('User not found');
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe('User not found');
      expect(err.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('should create unauthorized error', () => {
      const err = createError.unauthorized();
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('UNAUTHORIZED');
    });

    it('should create forbidden error', () => {
      const err = createError.forbidden('Access denied');
      expect(err.statusCode).toBe(403);
      expect(err.message).toBe('Access denied');
    });

    it('should create badRequest error', () => {
      const err = createError.badRequest('Invalid data');
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('BAD_REQUEST');
    });

    it('should create conflict error', () => {
      const err = createError.conflict('Already exists');
      expect(err.statusCode).toBe(409);
      expect(err.code).toBe('CONFLICT');
    });

    it('should create internal error', () => {
      const err = createError.internal();
      expect(err.statusCode).toBe(500);
      expect(err.code).toBe('INTERNAL_ERROR');
    });
    
    // Added for coverage
    it('should create tooManyRequests error', () => {
      const err = createError.tooManyRequests();
      expect(err.statusCode).toBe(429);
      expect(err.code).toBe('TOO_MANY_REQUESTS');
    });

    it('should create validation error with details', () => {
      const details = [{ field: 'email', message: 'Invalid' }];
      const err = createError.validation('Validation failed', details);
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.details).toEqual(details);
    });
  });

  // ========================================
  // AppError Class Tests
  // ========================================
  describe('AppError class', () => {
    it('should create operational error', () => {
      const err = new AppError('Test error', 400, 'TEST_CODE');
      expect(err.message).toBe('Test error');
      expect(err.statusCode).toBe(400);
      expect(err.status).toBe(400);
      expect(err.code).toBe('TEST_CODE');
      expect(err.isOperational).toBe(true);
      expect(err.stack).toBeDefined();
    });

    it('should work without error code', () => {
      const err = new AppError('Simple error', 500);
      expect(err.code).toBeNull();
    });
  });
});