// test/middleware/companyMiddleware.coverage.test.js
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createCompanyMiddleware, isUUID } from '../../src/middleware/companyMiddleware.js';

describe('CompanyMiddleware (100% Coverage)', () => {
  let middleware;
  let mockMember, mockOrg, mockLogger;
  let req, res, next;
  let consoleSpy;

  const validUUID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    // 1. Mock Dependencies
    mockMember = { findOne: jest.fn() };
    mockOrg = { findOrganizationById: jest.fn() };
    mockLogger = { suspiciousActivity: jest.fn() };

    // 2. Inject Mocks
    middleware = createCompanyMiddleware({
      MemberModel: mockMember,
      OrganizationModel: mockOrg,
      securityLogger: mockLogger
    });

    // 3. Mock Express
    req = {
      // ✅ แก้ไข: เพิ่ม user-agent เพื่อให้ค่าไม่เป็น undefined
      headers: {
        'user-agent': 'TestAgent/1.0'
      },
      body: {},
      params: {},
      query: {},
      ip: '127.0.0.1',
      path: '/test',
      method: 'POST',
      user: { user_id: 'user-1' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();

    // 4. Silence Console
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // 1. Helper Test
  // ==========================================
  describe('isUUID', () => {
    it('should validate UUID v4', () => {
      expect(isUUID(validUUID)).toBe(true);
      expect(isUUID('invalid')).toBe(false);
      expect(isUUID(null)).toBe(false);
      expect(isUUID(123)).toBe(false);
    });
  });

  // ==========================================
  // 2. requireOrganization Tests
  // ==========================================
  describe('requireOrganization', () => {
    it('should return 400 if orgId is missing', async () => {
      await middleware.requireOrganization(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Organization ID required.' }));
      expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith('Missing org ID', expect.anything(), expect.anything(), expect.anything());
    });

    it('should return 400 if orgId is invalid UUID', async () => {
      req.body.orgId = 'invalid-uuid';
      await middleware.requireOrganization(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid organization ID format' }));
    });

    it('should return 401 if user is not authenticated', async () => {
      req.body.orgId = validUUID;
      req.user = undefined;

      await middleware.requireOrganization(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Authentication required' }));
    });

    it('should return 404 if organization not found', async () => {
      req.body.orgId = validUUID;
      mockOrg.findOrganizationById.mockResolvedValue(null);

      await middleware.requireOrganization(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith('Access to non-existent org', expect.anything(), expect.anything(), expect.anything());
    });

    it('should return 403 if user is not a member', async () => {
      req.body.orgId = validUUID;
      mockOrg.findOrganizationById.mockResolvedValue({ org_id: validUUID });
      mockMember.findOne.mockResolvedValue(null);

      await middleware.requireOrganization(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'You are not a member of this organization' }));
    });

    it('should pass and set context if valid', async () => {
      req.body.orgId = validUUID;
      const mockOrgData = { org_id: validUUID, name: 'Test Org' };
      const mockMemberData = { role_id: 'ADMIN' };

      mockOrg.findOrganizationById.mockResolvedValue(mockOrgData);
      mockMember.findOne.mockResolvedValue(mockMemberData);

      await middleware.requireOrganization(req, res, next);

      expect(req.user.current_org_id).toBe(validUUID);
      expect(req.user.org_role_id).toBe('ADMIN');
      expect(req.organization).toEqual(mockOrgData);
      expect(next).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      req.body.orgId = validUUID;
      mockOrg.findOrganizationById.mockRejectedValue(new Error('DB Error'));

      await middleware.requireOrganization(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(consoleSpy).toHaveBeenCalledWith('❌ Organization middleware error:', expect.any(Error));
    });
  });

  // ==========================================
  // 3. requireOwnership Tests
  // ==========================================
  describe('requireOwnership', () => {
    beforeEach(() => {
      req.user.current_org_id = validUUID;
    });

    it('should return 400 if context missing', async () => {
      req.user.current_org_id = undefined;
      await middleware.requireOwnership(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 403 if user is not owner', async () => {
      mockOrg.findOrganizationById.mockResolvedValue({ owner_user_id: 'other-user' });
      
      await middleware.requireOwnership(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith('Non-owner attempting owner-only action', expect.anything(), expect.anything(), expect.anything());
    });

    it('should pass if user is owner', async () => {
      mockOrg.findOrganizationById.mockResolvedValue({ owner_user_id: 'user-1' });
      
      await middleware.requireOwnership(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should return 500 on error', async () => {
      mockOrg.findOrganizationById.mockRejectedValue(new Error('DB Fail'));
      await middleware.requireOwnership(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==========================================
  // 4. requireOrgRole Tests
  // ==========================================
  describe('requireOrgRole', () => {
    beforeEach(() => {
      req.user.current_org_id = validUUID;
    });

    it('should return 403 if role not found', () => {
      const mw = middleware.requireOrgRole(['ADMIN']);
      mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Organization role not found' }));
    });

    it('should return 403 if role insufficient', () => {
      req.user.org_role_id = 'MEMBER';
      const mw = middleware.requireOrgRole(['ADMIN']);
      mw(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockLogger.suspiciousActivity).toHaveBeenCalledWith('Insufficient org permissions', expect.anything(), expect.anything(), expect.anything());
    });

    it('should pass if role matches', () => {
      req.user.org_role_id = 'ADMIN';
      const mw = middleware.requireOrgRole(['ADMIN', 'OWNER']);
      mw(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
  });

  // ==========================================
  // 5. preventOwnerModification Tests
  // ==========================================
  describe('preventOwnerModification', () => {
    beforeEach(() => {
      req.user.current_org_id = validUUID;
      req.params.memberId = 'target-user';
    });

    it('should skip if no target user or org', async () => {
      req.params.memberId = undefined;
      await middleware.preventOwnerModification(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 if targeting owner', async () => {
      mockOrg.findOrganizationById.mockResolvedValue({ owner_user_id: 'target-user' });
      
      await middleware.preventOwnerModification(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Cannot modify organization owner. Use transfer ownership.' }));
    });

    it('should pass if not targeting owner', async () => {
      mockOrg.findOrganizationById.mockResolvedValue({ owner_user_id: 'other-user' });
      
      await middleware.preventOwnerModification(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should return 500 on error', async () => {
      mockOrg.findOrganizationById.mockRejectedValue(new Error('DB Fail'));
      await middleware.preventOwnerModification(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});