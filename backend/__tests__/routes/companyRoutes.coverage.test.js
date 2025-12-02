// test/routes/companyRoutes.coverage.test.js
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { createCompanyRoutes } from '../../src/routes/companyRoutes.js';
import { AUDIT_ACTIONS } from '../../src/constants/AuditActions.js';

describe('Company Routes (100% Coverage)', () => {
  let app;
  let mockController, mockAuthMw, mockCompanyMw, mockAuditMw, mockOrgModel;

  beforeEach(() => {
    mockController = {
      createCompany: jest.fn((req, res) => res.status(201).send()),
      getUserCompanies: jest.fn((req, res) => res.status(200).send()),
      getCompanyById: jest.fn((req, res) => res.status(200).send()),
      updateCompany: jest.fn((req, res) => res.status(200).send()),
      deleteCompany: jest.fn((req, res) => res.status(200).send())
    };

    mockAuthMw = { protect: jest.fn((req, res, next) => next()) };
    
    mockCompanyMw = {
      requireOrganization: jest.fn((req, res, next) => next()),
      requireOrgRole: jest.fn(() => (req, res, next) => next())
    };

    mockAuditMw = {
      auditLog: jest.fn(() => (req, res, next) => next()),
      auditChange: jest.fn(() => (req, res, next) => next())
    };

    mockOrgModel = { findById: jest.fn() };

    const router = createCompanyRoutes({
      controller: mockController,
      authMiddleware: mockAuthMw,
      companyMiddleware: mockCompanyMw,
      auditMiddleware: mockAuditMw,
      OrganizationModel: mockOrgModel
    });

    app = express();
    app.use(express.json());
    app.use('/company', router);
  });

  afterEach(() => jest.clearAllMocks());

  it('POST /company', async () => {
    await request(app).post('/company');
    expect(mockAuthMw.protect).toHaveBeenCalled();
    expect(mockAuditMw.auditLog).toHaveBeenCalledWith(AUDIT_ACTIONS.COMPANY.CREATE, "COMPANY", expect.any(Object));
    expect(mockController.createCompany).toHaveBeenCalled();
  });

  it('GET /company', async () => {
    await request(app).get('/company');
    expect(mockAuditMw.auditLog).toHaveBeenCalledWith(AUDIT_ACTIONS.COMPANY.VIEW_MY_COMPANIES, "COMPANY", expect.any(Object));
    expect(mockController.getUserCompanies).toHaveBeenCalled();
  });

  it('GET /company/:orgId', async () => {
    await request(app).get('/company/123');
    expect(mockCompanyMw.requireOrganization).toHaveBeenCalled();
    expect(mockAuditMw.auditLog).toHaveBeenCalledWith(AUDIT_ACTIONS.COMPANY.VIEW_DETAIL, "COMPANY", expect.any(Object));
    expect(mockController.getCompanyById).toHaveBeenCalled();
  });

  it('PUT /company/:orgId', async () => {
    await request(app).put('/company/123');
    expect(mockCompanyMw.requireOrgRole).toHaveBeenCalledWith([1]);
    expect(mockAuditMw.auditChange).toHaveBeenCalled();
    expect(mockAuditMw.auditLog).toHaveBeenCalledWith(AUDIT_ACTIONS.COMPANY.UPDATE, "COMPANY", expect.any(Object));
    expect(mockController.updateCompany).toHaveBeenCalled();
  });

  it('DELETE /company/:orgId', async () => {
    await request(app).delete('/company/123');
    expect(mockCompanyMw.requireOrgRole).toHaveBeenCalledWith([1]);
    expect(mockAuditMw.auditChange).toHaveBeenCalled();
    expect(mockAuditMw.auditLog).toHaveBeenCalledWith(AUDIT_ACTIONS.COMPANY.DELETE, "COMPANY", expect.any(Object));
    expect(mockController.deleteCompany).toHaveBeenCalled();
  });
});