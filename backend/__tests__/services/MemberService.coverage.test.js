// test/services/MemberService.coverage.test.js
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMemberService } from '../../src/services/MemberService.js';

describe('MemberService (100% Coverage)', () => {
  let service;
  let mockMemberModel, mockDb;
  let mockTransaction;

  beforeEach(() => {
    // 1. Mock DB Transaction
    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
      finished: false
    };
    mockDb = {
      transaction: jest.fn().mockResolvedValue(mockTransaction)
    };

    // 2. Mock Member Model
    mockMemberModel = {
      findByOrganization: jest.fn(),
      exists: jest.fn(),
      create: jest.fn(),
      getRole: jest.fn(),
      updateRole: jest.fn(),
      remove: jest.fn(),
      updateOwner: jest.fn(),
      findByOrganizationPaginated: jest.fn(),
      countByOrganization: jest.fn(),
      bulkRemove: jest.fn(),
      findByUser: jest.fn()
    };

    // 3. Create Service
    service = createMemberService({
      MemberModel: mockMemberModel,
      sequelize: mockDb
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- getMembers ---
  describe('getMembers', () => {
    it('should throw if role > 3', async () => {
      await expect(service.getMembers('o1', 4)).rejects.toThrow('สิทธิ์ไม่เพียงพอในการดูสมาชิก');
    });

    it('should return members if allowed', async () => {
      mockMemberModel.findByOrganization.mockResolvedValue([]);
      const res = await service.getMembers('o1', 3);
      expect(res).toEqual([]);
    });
  });

  // --- inviteMember ---
  describe('inviteMember', () => {
    it('should throw if missing data', async () => {
      await expect(service.inviteMember('o1', 'u1', 1, null, 3)).rejects.toThrow('invitedUserId and roleId required');
    });

    it('should throw if inviter not owner/admin', async () => {
      await expect(service.inviteMember('o1', 'u1', 3, 'u2', 3)).rejects.toThrow('สิทธิ์ไม่เพียงพอ');
    });

    it('should throw if already member', async () => {
      mockMemberModel.exists.mockResolvedValue(true);
      await expect(service.inviteMember('o1', 'u1', 2, 'u2', 3)).rejects.toThrow('ผู้ใช้นี้เป็นสมาชิกอยู่แล้ว');
    });

    it('should invite successfully', async () => {
      mockMemberModel.exists.mockResolvedValue(false);
      mockMemberModel.create.mockResolvedValue({ id: 1 });
      const res = await service.inviteMember('o1', 'u1', 2, 'u2', 3);
      expect(res.id).toBe(1);
    });
  });

  // --- changeMemberRole ---
  describe('changeMemberRole', () => {
    it('should throw if actor not owner/admin', async () => {
      await expect(service.changeMemberRole('o1', 'u1', 3, 'u2', 2)).rejects.toThrow('สิทธิ์ไม่เพียงพอ');
    });

    it('should throw if member not found', async () => {
      mockMemberModel.getRole.mockResolvedValue(null);
      await expect(service.changeMemberRole('o1', 'u1', 1, 'u2', 2)).rejects.toThrow('ไม่พบสมาชิก');
    });

    it('should throw if target is owner', async () => {
      mockMemberModel.getRole.mockResolvedValue(1); // Owner role
      await expect(service.changeMemberRole('o1', 'u1', 1, 'u2', 2)).rejects.toThrow('ไม่สามารถเปลี่ยน role ของ OWNER ได้');
    });

    it('should change role successfully', async () => {
      mockMemberModel.getRole.mockResolvedValue(3);
      mockMemberModel.updateRole.mockResolvedValue(true);
      const res = await service.changeMemberRole('o1', 'u1', 1, 'u2', 2);
      expect(res).toBe(true);
    });
  });

  // --- removeMember ---
  describe('removeMember', () => {
    it('should throw if actor not authorized', async () => {
      await expect(service.removeMember('o1', 'u1', 3, 'u2')).rejects.toThrow('สิทธิ์ไม่เพียงพอ');
    });

    it('should throw if target is owner', async () => {
      mockMemberModel.getRole.mockResolvedValue(1);
      await expect(service.removeMember('o1', 'u1', 1, 'u2')).rejects.toThrow('ไม่สามารถลบ OWNER ได้');
    });

    it('should throw if member not found/deleted', async () => {
      mockMemberModel.getRole.mockResolvedValue(3);
      mockMemberModel.remove.mockResolvedValue(false);
      await expect(service.removeMember('o1', 'u1', 1, 'u2')).rejects.toThrow('ไม่พบสมาชิก');
    });

    it('should remove successfully', async () => {
      mockMemberModel.getRole.mockResolvedValue(3);
      mockMemberModel.remove.mockResolvedValue(true);
      const res = await service.removeMember('o1', 'u1', 1, 'u2');
      expect(res.success).toBe(true);
    });
  });

  // --- transferOwner ---
  describe('transferOwner', () => {
    it('should throw if not current owner', async () => {
      await expect(service.transferOwner('o1', 'u1', 2, 'u2')).rejects.toThrow('ต้องเป็น OWNER เท่านั้น');
    });

    it('should throw if new owner not member', async () => {
      mockMemberModel.exists.mockResolvedValue(false);
      await expect(service.transferOwner('o1', 'u1', 1, 'u2')).rejects.toThrow('ผู้รับโอนต้องเป็นสมาชิก');
    });

    it('should transfer ownership successfully', async () => {
      mockMemberModel.exists.mockResolvedValue(true);
      
      const res = await service.transferOwner('o1', 'u1', 1, 'u2');

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockMemberModel.updateOwner).toHaveBeenCalledWith('o1', 'u2', mockTransaction);
      expect(mockMemberModel.updateRole).toHaveBeenCalledWith('o1', 'u2', 1, mockTransaction); // New owner
      expect(mockMemberModel.updateRole).toHaveBeenCalledWith('o1', 'u1', 2, mockTransaction); // Old owner -> Admin
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(res.success).toBe(true);
    });

    it('should rollback on error', async () => {
      mockMemberModel.exists.mockResolvedValue(true);
      mockMemberModel.updateOwner.mockRejectedValue(new Error('DB Fail'));

      await expect(service.transferOwner('o1', 'u1', 1, 'u2')).rejects.toThrow('DB Fail');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  // --- Other Methods ---
  describe('Other Methods', () => {
    it('getMembersWithPagination throws if unauthorized', async () => {
      await expect(service.getMembersWithPagination('o1', 4)).rejects.toThrow('สิทธิ์ไม่เพียงพอ');
    });

    it('getMembersWithPagination success', async () => {
      mockMemberModel.findByOrganizationPaginated.mockResolvedValue({});
      await service.getMembersWithPagination('o1', 1);
      expect(mockMemberModel.findByOrganizationPaginated).toHaveBeenCalled();
    });

    it('getMemberCount', async () => {
      await service.getMemberCount('o1');
      expect(mockMemberModel.countByOrganization).toHaveBeenCalled();
    });

    it('checkMembership', async () => {
      await service.checkMembership('o1', 'u1');
      expect(mockMemberModel.exists).toHaveBeenCalled();
    });

    it('getUserMemberships', async () => {
      await service.getUserMemberships('u1');
      expect(mockMemberModel.findByUser).toHaveBeenCalled();
    });
  });

  // --- bulkRemoveMembers ---
  describe('bulkRemoveMembers', () => {
    it('should throw if not owner', async () => {
      await expect(service.bulkRemoveMembers('o1', 2, [])).rejects.toThrow('เฉพาะ OWNER เท่านั้น');
    });

    it('should throw if trying to remove owner', async () => {
      mockMemberModel.getRole.mockResolvedValue(1); // One user is owner
      await expect(service.bulkRemoveMembers('o1', 1, ['u2'])).rejects.toThrow('ไม่สามารถลบ OWNER ได้');
    });

    it('should bulk remove successfully', async () => {
      mockMemberModel.getRole.mockResolvedValue(3); // Normal member
      mockMemberModel.bulkRemove.mockResolvedValue(5);
      
      const res = await service.bulkRemoveMembers('o1', 1, ['u2', 'u3']);
      expect(res.deleted).toBe(5);
      expect(res.success).toBe(true);
    });
  });
});