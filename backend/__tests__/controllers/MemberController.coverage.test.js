/**
 * MemberController Coverage Tests
 * Tests the REAL MemberController using dependency injection
 * This ensures actual code execution for coverage metrics (90%+ branch coverage)
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMemberController } from '../../src/controllers/MemberController.js';

describe('MemberController (Real Coverage Tests)', () => {
  let controller;
  let mockMemberService;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock service
    mockMemberService = {
      getMembers: jest.fn(),
      inviteMember: jest.fn(),
      changeMemberRole: jest.fn(),
      removeMember: jest.fn(),
      transferOwner: jest.fn()
    };

    // Create controller with mock service using dependency injection
    controller = createMemberController(mockMemberService);

    mockReq = {
      user: { 
        user_id: 'user-123',
        current_org_id: 'org-123',
        org_role_id: 1
      },
      body: {},
      params: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('listMembers', () => {
    it('should list members successfully with orgId from params', async () => {
      const members = [{ id: 'member-1', name: 'John' }];
      mockReq.params = { orgId: 'org-456' };
      mockMemberService.getMembers.mockResolvedValue(members);

      await controller.listMembers(mockReq, mockRes);

      expect(mockMemberService.getMembers).toHaveBeenCalledWith('org-456', 1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: members
      });
    });

    it('should list members using current_org_id when orgId not in params', async () => {
      const members = [{ id: 'member-1', name: 'John' }];
      mockReq.params = {};
      mockMemberService.getMembers.mockResolvedValue(members);

      await controller.listMembers(mockReq, mockRes);

      expect(mockMemberService.getMembers).toHaveBeenCalledWith('org-123', 1);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: members
      });
    });

    it('should return 400 when orgId is not provided', async () => {
      mockReq.params = {};
      mockReq.user = { user_id: 'user-123', org_role_id: 1 }; // No current_org_id

      await controller.listMembers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'orgId required'
      });
    });

    it('should return 400 when req.user is undefined and no orgId', async () => {
      mockReq.params = {};
      mockReq.user = undefined;

      await controller.listMembers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'orgId required'
      });
    });

    it('should return 403 for permission errors (สิทธิ์)', async () => {
      mockReq.params = { orgId: 'org-456' };
      mockMemberService.getMembers.mockRejectedValue(new Error('ไม่มีสิทธิ์ดูสมาชิก'));

      await controller.listMembers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'ไม่มีสิทธิ์ดูสมาชิก'
      });
    });

    it('should return 500 for server errors', async () => {
      mockReq.params = { orgId: 'org-456' };
      mockMemberService.getMembers.mockRejectedValue(new Error('Database error'));

      await controller.listMembers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error'
      });
    });
  });

  describe('inviteMemberToCompany', () => {
    it('should invite member successfully', async () => {
      const newMember = { id: 'member-new', name: 'Jane' };
      mockReq.params = { orgId: 'org-456' };
      mockReq.body = { invitedUserId: 'user-456', roleId: 2 };
      mockMemberService.inviteMember.mockResolvedValue(newMember);

      await controller.inviteMemberToCompany(mockReq, mockRes);

      expect(mockMemberService.inviteMember).toHaveBeenCalledWith(
        'org-456', 'user-123', 1, 'user-456', 2
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'เชิญสมาชิกสำเร็จ',
        member: newMember
      });
    });

    it('should use current_org_id when orgId not in params', async () => {
      const newMember = { id: 'member-new', name: 'Jane' };
      mockReq.params = {};
      mockReq.body = { invitedUserId: 'user-456', roleId: 2 };
      mockMemberService.inviteMember.mockResolvedValue(newMember);

      await controller.inviteMemberToCompany(mockReq, mockRes);

      expect(mockMemberService.inviteMember).toHaveBeenCalledWith(
        'org-123', 'user-123', 1, 'user-456', 2
      );
    });

    it('should return 403 for permission errors (สิทธิ์)', async () => {
      mockReq.params = { orgId: 'org-456' };
      mockReq.body = { invitedUserId: 'user-456', roleId: 2 };
      mockMemberService.inviteMember.mockRejectedValue(new Error('ไม่มีสิทธิ์เชิญสมาชิก'));

      await controller.inviteMemberToCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'ไม่มีสิทธิ์เชิญสมาชิก'
      });
    });

    it('should return 409 for duplicate member errors (อยู่แล้ว)', async () => {
      mockReq.params = { orgId: 'org-456' };
      mockReq.body = { invitedUserId: 'user-456', roleId: 2 };
      mockMemberService.inviteMember.mockRejectedValue(new Error('เป็นสมาชิกอยู่แล้ว'));

      await controller.inviteMemberToCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'เป็นสมาชิกอยู่แล้ว'
      });
    });

    it('should return 400 for validation errors (required)', async () => {
      mockReq.params = { orgId: 'org-456' };
      mockReq.body = { invitedUserId: '', roleId: 2 };
      mockMemberService.inviteMember.mockRejectedValue(new Error('invitedUserId required'));

      await controller.inviteMemberToCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'invitedUserId required'
      });
    });

    it('should return 500 for server errors', async () => {
      mockReq.params = { orgId: 'org-456' };
      mockReq.body = { invitedUserId: 'user-456', roleId: 2 };
      mockMemberService.inviteMember.mockRejectedValue(new Error('Database error'));

      await controller.inviteMemberToCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error'
      });
    });
  });

  describe('changeMemberRole', () => {
    it('should change member role successfully', async () => {
      const updatedMember = { id: 'member-1', roleId: 3 };
      mockReq.params = { orgId: 'org-456', memberId: 'member-1' };
      mockReq.body = { newRoleId: 3 };
      mockMemberService.changeMemberRole.mockResolvedValue(updatedMember);

      await controller.changeMemberRole(mockReq, mockRes);

      expect(mockMemberService.changeMemberRole).toHaveBeenCalledWith(
        'org-456', 'user-123', 1, 'member-1', 3
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'เปลี่ยนสิทธิ์สำเร็จ',
        member: updatedMember
      });
    });

    it('should use current_org_id when orgId not in params', async () => {
      const updatedMember = { id: 'member-1', roleId: 3 };
      mockReq.params = { memberId: 'member-1' };
      mockReq.body = { newRoleId: 3 };
      mockMemberService.changeMemberRole.mockResolvedValue(updatedMember);

      await controller.changeMemberRole(mockReq, mockRes);

      expect(mockMemberService.changeMemberRole).toHaveBeenCalledWith(
        'org-123', 'user-123', 1, 'member-1', 3
      );
    });

    it('should return 403 for permission errors (สิทธิ์)', async () => {
      mockReq.params = { orgId: 'org-456', memberId: 'member-1' };
      mockReq.body = { newRoleId: 3 };
      mockMemberService.changeMemberRole.mockRejectedValue(new Error('ไม่มีสิทธิ์เปลี่ยน'));

      await controller.changeMemberRole(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'ไม่มีสิทธิ์เปลี่ยน'
      });
    });

    it('should return 404 for not found errors (ไม่พบ)', async () => {
      mockReq.params = { orgId: 'org-456', memberId: 'member-1' };
      mockReq.body = { newRoleId: 3 };
      mockMemberService.changeMemberRole.mockRejectedValue(new Error('ไม่พบสมาชิก'));

      await controller.changeMemberRole(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'ไม่พบสมาชิก'
      });
    });

    it('should return 500 for server errors', async () => {
      mockReq.params = { orgId: 'org-456', memberId: 'member-1' };
      mockReq.body = { newRoleId: 3 };
      mockMemberService.changeMemberRole.mockRejectedValue(new Error('Database error'));

      await controller.changeMemberRole(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error'
      });
    });
  });

  describe('removeMember', () => {
    it('should remove member successfully', async () => {
      mockReq.params = { orgId: 'org-456', memberId: 'member-1' };
      mockMemberService.removeMember.mockResolvedValue();

      await controller.removeMember(mockReq, mockRes);

      expect(mockMemberService.removeMember).toHaveBeenCalledWith(
        'org-456', 'user-123', 1, 'member-1'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'ลบสมาชิกสำเร็จ'
      });
    });

    it('should use current_org_id when orgId not in params', async () => {
      mockReq.params = { memberId: 'member-1' };
      mockMemberService.removeMember.mockResolvedValue();

      await controller.removeMember(mockReq, mockRes);

      expect(mockMemberService.removeMember).toHaveBeenCalledWith(
        'org-123', 'user-123', 1, 'member-1'
      );
    });

    it('should return 403 for permission errors (สิทธิ์)', async () => {
      mockReq.params = { orgId: 'org-456', memberId: 'member-1' };
      mockMemberService.removeMember.mockRejectedValue(new Error('ไม่มีสิทธิ์ลบ'));

      await controller.removeMember(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'ไม่มีสิทธิ์ลบ'
      });
    });

    it('should return 404 for not found errors (ไม่พบ)', async () => {
      mockReq.params = { orgId: 'org-456', memberId: 'member-1' };
      mockMemberService.removeMember.mockRejectedValue(new Error('ไม่พบสมาชิก'));

      await controller.removeMember(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'ไม่พบสมาชิก'
      });
    });

    it('should return 500 for server errors', async () => {
      mockReq.params = { orgId: 'org-456', memberId: 'member-1' };
      mockMemberService.removeMember.mockRejectedValue(new Error('Database error'));

      await controller.removeMember(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error'
      });
    });
  });

  describe('transferOwner', () => {
    it('should transfer owner successfully', async () => {
      mockReq.params = { orgId: 'org-456' };
      mockReq.body = { newOwnerUserId: 'user-789' };
      mockMemberService.transferOwner.mockResolvedValue();

      await controller.transferOwner(mockReq, mockRes);

      expect(mockMemberService.transferOwner).toHaveBeenCalledWith(
        'org-456', 'user-123', 1, 'user-789'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'โอนสิทธิ์เจ้าของสำเร็จ'
      });
    });

    it('should use current_org_id when orgId not in params', async () => {
      mockReq.params = {};
      mockReq.body = { newOwnerUserId: 'user-789' };
      mockMemberService.transferOwner.mockResolvedValue();

      await controller.transferOwner(mockReq, mockRes);

      expect(mockMemberService.transferOwner).toHaveBeenCalledWith(
        'org-123', 'user-123', 1, 'user-789'
      );
    });

    it('should return 403 for permission errors (สิทธิ์)', async () => {
      mockReq.params = { orgId: 'org-456' };
      mockReq.body = { newOwnerUserId: 'user-789' };
      mockMemberService.transferOwner.mockRejectedValue(new Error('ไม่มีสิทธิ์โอน'));

      await controller.transferOwner(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'ไม่มีสิทธิ์โอน'
      });
    });

    it('should return 403 for OWNER errors', async () => {
      mockReq.params = { orgId: 'org-456' };
      mockReq.body = { newOwnerUserId: 'user-789' };
      mockMemberService.transferOwner.mockRejectedValue(new Error('Only OWNER can transfer'));

      await controller.transferOwner(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Only OWNER can transfer'
      });
    });

    it('should return 500 for server errors', async () => {
      mockReq.params = { orgId: 'org-456' };
      mockReq.body = { newOwnerUserId: 'user-789' };
      mockMemberService.transferOwner.mockRejectedValue(new Error('Database error'));

      await controller.transferOwner(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error'
      });
    });
  });
});
