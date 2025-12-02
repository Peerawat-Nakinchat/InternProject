// test/routes/memberRoutes.coverage.test.js
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { createMemberRoutes } from '../../src/routes/memberRoutes.js';
import { AUDIT_ACTIONS } from '../../src/constants/AuditActions.js';

describe('Member Routes (100% Coverage)', () => {
  let app;
  let mocks;

  beforeEach(() => {
    mocks = {
      controller: {
        listMembers: jest.fn((req, res) => res.send()),
        inviteMemberToCompany: jest.fn((req, res) => res.send()),
        changeMemberRole: jest.fn((req, res) => res.send()),
        removeMember: jest.fn((req, res) => res.send()),
        transferOwner: jest.fn((req, res) => res.send())
      },
      authMiddleware: { protect: jest.fn((req, res, next) => next()) },
      companyMiddleware: { requireOrganization: jest.fn((req, res, next) => next()) },
      auditMiddleware: {
        auditLog: jest.fn(() => (req, res, next) => next()),
        auditChange: jest.fn(() => (req, res, next) => next())
      },
      MemberModel: { findById: jest.fn() },
      OrganizationModel: { findById: jest.fn() }
    };

    const router = createMemberRoutes(mocks);
    app = express();
    app.use(express.json());
    app.use('/members', router);
  });

  afterEach(() => jest.clearAllMocks());

  it('GET /members/:orgId', async () => {
    await request(app).get('/members/1');
    expect(mocks.authMiddleware.protect).toHaveBeenCalled();
    expect(mocks.companyMiddleware.requireOrganization).toHaveBeenCalled();
    expect(mocks.auditMiddleware.auditLog).toHaveBeenCalledWith(AUDIT_ACTIONS.MEMBER.VIEW_ALL, "MEMBER", expect.any(Object));
    expect(mocks.controller.listMembers).toHaveBeenCalled();
  });

  it('POST /members/:orgId/invite', async () => {
    await request(app).post('/members/1/invite');
    expect(mocks.auditMiddleware.auditLog).toHaveBeenCalledWith(AUDIT_ACTIONS.MEMBER.INVITE, "MEMBER", expect.any(Object));
    expect(mocks.controller.inviteMemberToCompany).toHaveBeenCalled();
  });

  it('PATCH /members/:orgId/:memberId/role', async () => {
    await request(app).patch('/members/1/2/role');
    expect(mocks.auditMiddleware.auditChange).toHaveBeenCalled();
    expect(mocks.auditMiddleware.auditLog).toHaveBeenCalledWith(AUDIT_ACTIONS.MEMBER.CHANGE_ROLE, "MEMBER", expect.any(Object));
    expect(mocks.controller.changeMemberRole).toHaveBeenCalled();
  });

  it('DELETE /members/:orgId/:memberId', async () => {
    await request(app).delete('/members/1/2');
    expect(mocks.auditMiddleware.auditLog).toHaveBeenCalledWith(AUDIT_ACTIONS.MEMBER.REMOVE, "MEMBER", expect.any(Object));
    expect(mocks.controller.removeMember).toHaveBeenCalled();
  });

  it('POST /members/:orgId/transfer-owner', async () => {
    await request(app).post('/members/1/transfer-owner');
    expect(mocks.auditMiddleware.auditChange).toHaveBeenCalled();
    expect(mocks.auditMiddleware.auditLog).toHaveBeenCalledWith(AUDIT_ACTIONS.MEMBER.TRANSFER_OWNERSHIP, "COMPANY", expect.any(Object));
    expect(mocks.controller.transferOwner).toHaveBeenCalled();
  });
});