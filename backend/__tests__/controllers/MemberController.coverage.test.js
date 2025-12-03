import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMemberController } from '../../src/controllers/MemberController.js';

describe('MemberController (Full Coverage)', () => {
  let controller, mockService, mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockService = {
      inviteMember: jest.fn(),
      getMembers: jest.fn(),
      changeMemberRole: jest.fn(),
      removeMember: jest.fn(),
      transferOwner: jest.fn()
    };
    controller = createMemberController(mockService);
    
    // Default req structure
    mockReq = {
      user: { user_id: 'u1', current_org_id: 'org-context', org_role_id: 1 },
      body: {},
      params: {},
      query: {}
    };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    mockNext = jest.fn();
  });

  describe('listMembers', () => {
    it('should use orgId from params if provided (ignoring user context)', async () => {
      mockReq.params.orgId = 'org-param';
      mockService.getMembers.mockResolvedValue([]);

      await controller.listMembers(mockReq, mockRes, mockNext);

      // Verify service called with 'org-param'
      expect(mockService.getMembers).toHaveBeenCalledWith('org-param', 1);
    });

    it('should fallback to user.current_org_id if params.orgId is missing', async () => {
      mockReq.params.orgId = undefined; // Empty params
      mockService.getMembers.mockResolvedValue([]);

      await controller.listMembers(mockReq, mockRes, mockNext);

      // Verify service called with 'org-context'
      expect(mockService.getMembers).toHaveBeenCalledWith('org-context', 1);
    });

    it('should throw BadRequest if no orgId found anywhere', async () => {
      mockReq.params.orgId = undefined;
      mockReq.user.current_org_id = undefined;

      await controller.listMembers(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringMatching(/required/i)
      }));
    });
  });

  describe('inviteMemberToCompany', () => {
    it('should invite successfully', async () => {
      mockReq.body = { invitedUserId: 'u2', roleId: 3 };
      mockService.inviteMember.mockResolvedValue({ id: 'm1' });

      await controller.inviteMemberToCompany(mockReq, mockRes, mockNext);

      expect(mockService.inviteMember).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should handle service errors via next()', async () => {
      const error = new Error('Conflict');
      mockService.inviteMember.mockRejectedValue(error);
      
      await controller.inviteMemberToCompany(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  // Test branch coverage for other methods similarly
  describe('changeMemberRole', () => {
    it('should change role successfully', async () => {
      mockReq.params.memberId = 'm1';
      mockReq.body = { newRoleId: 2 };
      await controller.changeMemberRole(mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    it('should remove member successfully', async () => {
      mockReq.params.memberId = 'm1';
      await controller.removeMember(mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('transferOwner', () => {
    it('should transfer owner successfully', async () => {
      mockReq.body = { newOwnerUserId: 'u2' };
      await controller.transferOwner(mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });
});