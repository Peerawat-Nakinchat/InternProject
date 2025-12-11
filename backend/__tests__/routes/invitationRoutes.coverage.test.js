import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';

// ✅ Mock Rate Limiters เพื่อเลี่ยงการต่อ Redis จริง
jest.unstable_mockModule('../../src/middleware/security/rateLimiters.js', () => ({
  default: {
    invitationLimiter: (req, res, next) => next(),
    apiLimiter: (req, res, next) => next(),
  },
  invitationLimiter: (req, res, next) => next(),
  apiLimiter: (req, res, next) => next(),
}));

// Import after mocking
const { createInvitationRoutes } = await import('../../src/routes/invitationRoutes.js');
const { AUDIT_ACTIONS } = await import('../../src/constants/AuditActions.js');

describe('Invitation Routes (100% Coverage)', () => {
  let app;
  let mocks;

  beforeEach(() => {
    mocks = {
      controller: {
        sendInvitation: jest.fn((req, res) => res.send()),
        resendInvitation: jest.fn((req, res) => res.send()),
        getInvitationInfo: jest.fn((req, res) => res.send()),
        acceptInvitation: jest.fn((req, res) => res.send()),
        cancelInvitation: jest.fn((req, res) => res.send())
      },
      authMiddleware: { protect: jest.fn((req, res, next) => next()) },
      validationMiddleware: { validateEmail: jest.fn((req, res, next) => next()) },
      auditMiddleware: { auditLog: jest.fn(() => (req, res, next) => next()) }
    };

    const router = createInvitationRoutes(mocks);
    app = express();
    app.use(express.json());
    app.use('/invitations', router);
  });

  afterEach(() => jest.clearAllMocks());

  it('POST /invitations/send', async () => {
    await request(app).post('/invitations/send');
    expect(mocks.authMiddleware.protect).toHaveBeenCalled();
    expect(mocks.validationMiddleware.validateEmail).toHaveBeenCalled();
    expect(mocks.auditMiddleware.auditLog).toHaveBeenCalledWith(AUDIT_ACTIONS.INVITATION.SEND, "INVITATION", expect.any(Object));
    expect(mocks.controller.sendInvitation).toHaveBeenCalled();
  });

  it('POST /invitations/resend', async () => {
    await request(app).post('/invitations/resend');
    expect(mocks.auditMiddleware.auditLog).toHaveBeenCalledWith(AUDIT_ACTIONS.INVITATION.RESEND, "INVITATION", expect.any(Object));
    expect(mocks.controller.resendInvitation).toHaveBeenCalled();
  });

  it('GET /invitations/:token', async () => {
    await request(app).get('/invitations/abc');
    expect(mocks.controller.getInvitationInfo).toHaveBeenCalled();
  });

  it('POST /invitations/accept', async () => {
    await request(app).post('/invitations/accept');
    expect(mocks.auditMiddleware.auditLog).toHaveBeenCalledWith(AUDIT_ACTIONS.INVITATION.ACCEPT, "INVITATION", expect.any(Object));
    expect(mocks.controller.acceptInvitation).toHaveBeenCalled();
  });

  it('POST /invitations/cancel', async () => {
    await request(app).post('/invitations/cancel');
    expect(mocks.auditMiddleware.auditLog).toHaveBeenCalledWith(AUDIT_ACTIONS.INVITATION.CANCEL, "INVITATION", expect.any(Object));
    expect(mocks.controller.cancelInvitation).toHaveBeenCalled();
  });
});