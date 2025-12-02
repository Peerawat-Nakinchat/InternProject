// test/routes/auditLogRoutes.coverage.test.js
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { createAuditLogRoutes } from '../../src/routes/auditLogRoutes.js';

describe('AuditLog Routes (100% Coverage)', () => {
  let app;
  let mockController;
  let mockAuthMiddleware;
  let mockAuditMiddleware;

  beforeEach(() => {
    // 1. Mock Controller
    mockController = {
      getMyActivity: jest.fn((req, res) => res.status(200).send('ok')),
      getUserActivity: jest.fn((req, res) => res.status(200).send('ok')),
      queryAuditLogs: jest.fn((req, res) => res.status(200).send('ok')),
      getRecentActivity: jest.fn((req, res) => res.status(200).send('ok')),
      getSecurityEvents: jest.fn((req, res) => res.status(200).send('ok')),
      getFailedActions: jest.fn((req, res) => res.status(200).send('ok')),
      getSuspiciousActivity: jest.fn((req, res) => res.status(200).send('ok')),
      getStatistics: jest.fn((req, res) => res.status(200).send('ok')),
      exportLogs: jest.fn((req, res) => res.status(200).send('ok')),
      getCorrelatedActions: jest.fn((req, res) => res.status(200).send('ok')),
      cleanupLogs: jest.fn((req, res) => res.status(200).send('ok'))
    };

    // 2. Mock Middleware
    mockAuthMiddleware = {
      protect: jest.fn((req, res, next) => next()),
      authorize: jest.fn(() => (req, res, next) => next())
    };

    mockAuditMiddleware = {
      auditLog: jest.fn(() => (req, res, next) => next())
    };

    // 3. Create Router & App
    const router = createAuditLogRoutes({
      controller: mockController,
      authMiddleware: mockAuthMiddleware,
      auditMiddleware: mockAuditMiddleware
    });

    app = express();
    app.use(express.json());
    app.use('/audit-logs', router);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- Tests ---

  it('GET /audit-logs/me', async () => {
    await request(app).get('/audit-logs/me');
    expect(mockAuthMiddleware.protect).toHaveBeenCalled();
    expect(mockAuditMiddleware.auditLog).toHaveBeenCalledWith("VIEW_MY_ACTIVITY", "AUDIT_LOG", expect.any(Object));
    expect(mockController.getMyActivity).toHaveBeenCalled();
  });

  it('GET /audit-logs/user/:userId', async () => {
    await request(app).get('/audit-logs/user/123');
    expect(mockAuditMiddleware.auditLog).toHaveBeenCalledWith("VIEW_USER_LOGS", "AUDIT_LOG", expect.any(Object));
    expect(mockController.getUserActivity).toHaveBeenCalled();
  });

  it('GET /audit-logs/', async () => {
    await request(app).get('/audit-logs/');
    expect(mockAuthMiddleware.authorize).toHaveBeenCalledWith([1, 2]);
    expect(mockAuditMiddleware.auditLog).toHaveBeenCalledWith("VIEW_ALL_LOGS", "AUDIT_LOG", expect.any(Object));
    expect(mockController.queryAuditLogs).toHaveBeenCalled();
  });

  it('GET /audit-logs/recent', async () => {
    await request(app).get('/audit-logs/recent');
    expect(mockController.getRecentActivity).toHaveBeenCalled();
  });

  it('GET /audit-logs/security', async () => {
    await request(app).get('/audit-logs/security');
    expect(mockController.getSecurityEvents).toHaveBeenCalled();
  });

  it('GET /audit-logs/failed', async () => {
    await request(app).get('/audit-logs/failed');
    expect(mockController.getFailedActions).toHaveBeenCalled();
  });

  it('GET /audit-logs/suspicious', async () => {
    await request(app).get('/audit-logs/suspicious');
    expect(mockController.getSuspiciousActivity).toHaveBeenCalled();
  });

  it('GET /audit-logs/stats', async () => {
    await request(app).get('/audit-logs/stats');
    expect(mockController.getStatistics).toHaveBeenCalled();
  });

  it('GET /audit-logs/export', async () => {
    await request(app).get('/audit-logs/export');
    expect(mockController.exportLogs).toHaveBeenCalled();
  });

  it('GET /audit-logs/correlation/:id', async () => {
    await request(app).get('/audit-logs/correlation/abc');
    expect(mockController.getCorrelatedActions).toHaveBeenCalled();
  });

  it('POST /audit-logs/cleanup', async () => {
    await request(app).post('/audit-logs/cleanup');
    expect(mockAuthMiddleware.authorize).toHaveBeenCalledWith([1]);
    expect(mockController.cleanupLogs).toHaveBeenCalled();
  });
});