/**
 * CompanyMiddleware Coverage Tests (Refactored for createError/asyncHandler)
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createCompanyMiddleware } from '../../src/middleware/companyMiddleware.js';

describe('CompanyMiddleware (Refactored Coverage)', () => {
  let middleware;
  let mockMember, mockOrg, mockLogger;
  let req, res, next;

  const validUUID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    mockMember = { findOne: jest.fn() };
    mockOrg = { findById: jest.fn(), isOwner: jest.fn() };
    mockLogger = { suspiciousActivity: jest.fn() };

    middleware = createCompanyMiddleware({
      MemberModel: mockMember,
      OrganizationModel: mockOrg,
      securityLogger: mockLogger
    });

    req = {
      headers: { 'user-agent': 'TestAgent/1.0' },
      body: {},
      params: {},
      query: {},
      ip: '127.0.0.1',
      user: { user_id: 'user-1' }
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    next = jest.fn();
  });

  afterEach(() => { jest.clearAllMocks(); });

  describe('requireOrganization', () => {
    it('should call next(BadRequest) if orgId is missing', async () => {
      await middleware.requireOrganization(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('should call next(BadRequest) if orgId is invalid UUID', async () => {
      req.body.orgId = 'invalid-uuid';
      await middleware.requireOrganization(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('should call next(NotFound) if organization not found', async () => {
      req.body.orgId = validUUID;
      mockOrg.findById.mockResolvedValue(null);

      await middleware.requireOrganization(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });

    it('should call next(Forbidden) if user is not a member', async () => {
      req.body.orgId = validUUID;
      mockOrg.findById.mockResolvedValue({ org_id: validUUID });
      mockMember.findOne.mockResolvedValue(null);

      await middleware.requireOrganization(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });

    it('should pass and set context if valid', async () => {
      req.body.orgId = validUUID;
      const mockOrgData = { org_id: validUUID };
      const mockMemberData = { role_id: 'ADMIN' };

      mockOrg.findById.mockResolvedValue(mockOrgData);
      mockMember.findOne.mockResolvedValue(mockMemberData);

      await middleware.requireOrganization(req, res, next);

      expect(req.user.current_org_id).toBe(validUUID);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('requireOwnership', () => {
    beforeEach(() => { req.user.current_org_id = validUUID; });

    it('should call next(Forbidden) if user is not owner', async () => {
      mockOrg.isOwner.mockResolvedValue(false);
      await middleware.requireOwnership(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });

    it('should pass if user is owner', async () => {
      mockOrg.isOwner.mockResolvedValue(true);
      await middleware.requireOwnership(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('requireOrgRole', () => {
    beforeEach(() => { req.user.current_org_id = validUUID; });

    it('should call next(Forbidden) if role not found', () => {
      const mw = middleware.requireOrgRole(['ADMIN']);
      mw(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });

    it('should call next(Forbidden) if role insufficient', () => {
      req.user.org_role_id = 'MEMBER';
      const mw = middleware.requireOrgRole(['ADMIN']);
      mw(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });

    it('should pass if role matches', () => {
      req.user.org_role_id = 'ADMIN';
      const mw = middleware.requireOrgRole(['ADMIN']);
      mw(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });
  });
});