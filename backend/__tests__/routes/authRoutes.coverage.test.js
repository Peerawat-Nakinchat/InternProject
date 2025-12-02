// test/routes/authRoutes.coverage.test.js
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { createAuthRoutes } from '../../src/routes/authRoutes.js';
import { AUDIT_ACTIONS } from '../../src/constants/AuditActions.js';

describe('Auth Routes (100% Coverage)', () => {
  let app;
  let mocks;

  beforeEach(() => {
    mocks = {
      controller: {
        registerUser: jest.fn((req, res) => res.send()),
        loginUser: jest.fn((req, res) => res.send()),
        logoutUser: jest.fn((req, res) => res.send()),
        forgotPassword: jest.fn((req, res) => res.send()),
        verifyResetToken: jest.fn((req, res) => res.send()),
        resetPassword: jest.fn((req, res) => res.send()),
        googleAuthCallback: jest.fn((req, res) => res.send()),
        refreshToken: jest.fn((req, res) => res.send()),
        getProfile: jest.fn((req, res) => res.send()),
        updateProfile: jest.fn((req, res) => res.send()),
        changeEmail: jest.fn((req, res) => res.send()),
        changePassword: jest.fn((req, res) => res.send()),
        logoutAllUser: jest.fn((req, res) => res.send())
      },
      authMiddleware: { protect: jest.fn((req, res, next) => next()) },
      refreshMiddleware: { refreshAccessToken: jest.fn((req, res) => res.send()) },
      validationMiddleware: {
        validateRegister: jest.fn((req, res, next) => next()),
        validateLogin: jest.fn((req, res, next) => next()),
        validateForgotPassword: jest.fn((req, res, next) => next()),
        validateResetPassword: jest.fn((req, res, next) => next()),
        validateUpdateProfile: jest.fn((req, res, next) => next()),
        validateChangeEmail: jest.fn((req, res, next) => next()),
        validateChangePassword: jest.fn((req, res, next) => next())
      },
      auditMiddleware: {
        auditLog: jest.fn(() => (req, res, next) => next()),
        auditChange: jest.fn(() => (req, res, next) => next())
      },
      passport: {
        authenticate: jest.fn(() => (req, res, next) => next())
      },
      UserModel: { findById: jest.fn() }
    };

    const router = createAuthRoutes(mocks);
    app = express();
    app.use(express.json());
    app.use('/auth', router);
  });

  afterEach(() => jest.clearAllMocks());

  it('POST /auth/register', async () => {
    await request(app).post('/auth/register');
    expect(mocks.validationMiddleware.validateRegister).toHaveBeenCalled();
    expect(mocks.auditMiddleware.auditLog).toHaveBeenCalledWith(AUDIT_ACTIONS.AUTH.REGISTER, "USER", expect.any(Object));
    expect(mocks.controller.registerUser).toHaveBeenCalled();
  });

  it('POST /auth/login', async () => {
    await request(app).post('/auth/login');
    expect(mocks.validationMiddleware.validateLogin).toHaveBeenCalled();
    expect(mocks.controller.loginUser).toHaveBeenCalled();
  });

  it('POST /auth/logout', async () => {
    await request(app).post('/auth/logout');
    expect(mocks.authMiddleware.protect).toHaveBeenCalled();
    expect(mocks.controller.logoutUser).toHaveBeenCalled();
  });

  it('POST /auth/forgot-password', async () => {
    await request(app).post('/auth/forgot-password');
    expect(mocks.controller.forgotPassword).toHaveBeenCalled();
  });

  it('GET /auth/verify-reset-token', async () => {
    await request(app).get('/auth/verify-reset-token');
    expect(mocks.controller.verifyResetToken).toHaveBeenCalled();
  });

  it('POST /auth/reset-password', async () => {
    await request(app).post('/auth/reset-password');
    expect(mocks.controller.resetPassword).toHaveBeenCalled();
  });

  it('GET /auth/google', async () => {
    await request(app).get('/auth/google');
    expect(mocks.passport.authenticate).toHaveBeenCalled();
  });

  it('GET /auth/google/callback', async () => {
    await request(app).get('/auth/google/callback');
    expect(mocks.controller.googleAuthCallback).toHaveBeenCalled();
  });

  it('POST /auth/refresh', async () => {
    await request(app).post('/auth/refresh');
    expect(mocks.controller.refreshToken).toHaveBeenCalled();
  });

  it('POST /auth/token', async () => {
    await request(app).post('/auth/token');
    expect(mocks.refreshMiddleware.refreshAccessToken).toHaveBeenCalled();
  });

  it('GET /auth/profile', async () => {
    await request(app).get('/auth/profile');
    expect(mocks.controller.getProfile).toHaveBeenCalled();
  });

  it('PUT /auth/update-profile', async () => {
    await request(app).put('/auth/update-profile');
    expect(mocks.auditMiddleware.auditChange).toHaveBeenCalled();
    expect(mocks.controller.updateProfile).toHaveBeenCalled();
  });

  it('PUT /auth/change-email', async () => {
    await request(app).put('/auth/change-email');
    expect(mocks.auditMiddleware.auditChange).toHaveBeenCalled();
    expect(mocks.controller.changeEmail).toHaveBeenCalled();
  });

  it('PUT /auth/change-password', async () => {
    await request(app).put('/auth/change-password');
    expect(mocks.controller.changePassword).toHaveBeenCalled();
  });

  it('POST /auth/logout-all', async () => {
    await request(app).post('/auth/logout-all');
    expect(mocks.controller.logoutAllUser).toHaveBeenCalled();
  });
});