// tests/services/MemberService.coverage.test.js
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMemberService } from '../../src/services/MemberService.js';
import { AppError } from '../../src/middleware/errorHandler.js';

describe('MemberService (100% Coverage)', () => {
  let service;
  let mockMemberModel, mockDb;
  let mockTransaction;

  beforeEach(() => {
    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
      finished: false
    };
    mockDb = {
      transaction: jest.fn().mockResolvedValue(mockTransaction)
    };

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

    service = createMemberService({
      MemberModel: mockMemberModel,
      sequelize: mockDb
    });
  });

  afterEach(() => { jest.clearAllMocks(); });

  describe('getMembers', () => {
    it('should throw Forbidden (403) if role > 3', async () => {
      await expect(service.getMembers('o1', 4)).rejects.toMatchObject({ statusCode: 403 });
    });

    it('should return members if allowed', async () => {
      mockMemberModel.findByOrganization.mockResolvedValue(['m1', 'm2']);
      const res = await service.getMembers('o1', 1);
      expect(res).toEqual(['m1', 'm2']);
    });
  });

  describe('inviteMember', () => {
    it('should throw BadRequest (400) if missing data', async () => {
      await expect(service.inviteMember('o1', 'u1', 1, null, 3)).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should throw Forbidden (403) if inviter not owner/admin', async () => {
      await expect(service.inviteMember('o1', 'u1', 3, 'u2', 3)).rejects.toMatchObject({ statusCode: 403 });
    });

    it('should throw Conflict (409) if already member', async () => {
      mockMemberModel.exists.mockResolvedValue(true);
      await expect(service.inviteMember('o1', 'u1', 2, 'u2', 3)).rejects.toMatchObject({ statusCode: 409 });
    });

    it('should invite successfully', async () => {
      mockMemberModel.exists.mockResolvedValue(false);
      mockMemberModel.create.mockResolvedValue({ id: 1 });
      const res = await service.inviteMember('o1', 'u1', 1, 'u2', 3);
      expect(mockMemberModel.create).toHaveBeenCalledWith({ orgId: 'o1', userId: 'u2', roleId: 3 });
      expect(res).toEqual({ id: 1 });
    });
  });

  describe('changeMemberRole', () => {
    it('should throw Forbidden (403) if actor is not admin/owner', async () => {
      await expect(service.changeMemberRole('o1', 'u1', 3, 'target', 2)).rejects.toMatchObject({ statusCode: 403 });
    });

    it('should throw NotFound (404) if target member not found', async () => {
      mockMemberModel.getRole.mockResolvedValue(null);
      await expect(service.changeMemberRole('o1', 'u1', 1, 'target', 2)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw Forbidden (403) if trying to change OWNER role', async () => {
      mockMemberModel.getRole.mockResolvedValue(1); // Target is OWNER
      await expect(service.changeMemberRole('o1', 'u1', 1, 'target', 2)).rejects.toMatchObject({ statusCode: 403 });
    });

    it('should update role successfully', async () => {
      mockMemberModel.getRole.mockResolvedValue(3);
      mockMemberModel.updateRole.mockResolvedValue(true);
      const res = await service.changeMemberRole('o1', 'u1', 1, 'target', 2);
      expect(mockMemberModel.updateRole).toHaveBeenCalledWith('o1', 'target', 2);
      expect(res).toBe(true);
    });
  });

  describe('removeMember', () => {
    it('should throw Forbidden (403) if actor is not admin', async () => {
      await expect(service.removeMember('o1', 'u1', 3, 'target')).rejects.toMatchObject({ statusCode: 403 });
    });

    it('should throw Forbidden if target is OWNER', async () => {
      mockMemberModel.getRole.mockResolvedValue(1);
      await expect(service.removeMember('o1', 'u1', 1, 'target')).rejects.toMatchObject({ statusCode: 403 });
    });

    it('should throw NotFound if delete returns false', async () => {
      mockMemberModel.getRole.mockResolvedValue(3);
      mockMemberModel.remove.mockResolvedValue(0);
      await expect(service.removeMember('o1', 'u1', 1, 'target')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should remove successfully', async () => {
      mockMemberModel.getRole.mockResolvedValue(3);
      mockMemberModel.remove.mockResolvedValue(1);
      const res = await service.removeMember('o1', 'u1', 1, 'target');
      expect(res.success).toBe(true);
    });
  });

  describe('transferOwner', () => {
    it('should throw Forbidden (403) if not current owner', async () => {
      await expect(service.transferOwner('o1', 'u1', 2, 'u2')).rejects.toMatchObject({ statusCode: 403 });
    });

    it('should throw BadRequest (400) if new owner is not a member', async () => {
      mockMemberModel.exists.mockResolvedValue(false);
      await expect(service.transferOwner('o1', 'u1', 1, 'u2')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should transfer ownership successfully', async () => {
      mockMemberModel.exists.mockResolvedValue(true);
      
      const res = await service.transferOwner('o1', 'old', 1, 'new');
      
      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockMemberModel.updateOwner).toHaveBeenCalledWith('o1', 'new', mockTransaction);
      expect(mockMemberModel.updateRole).toHaveBeenCalledWith('o1', 'new', 1, mockTransaction); // New Owner
      expect(mockMemberModel.updateRole).toHaveBeenCalledWith('o1', 'old', 2, mockTransaction); // Old Owner becomes Admin
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(res.success).toBe(true);
    });

    it('should rollback on error', async () => {
      mockMemberModel.exists.mockResolvedValue(true);
      mockMemberModel.updateOwner.mockRejectedValue(new Error('DB Fail'));
      
      await expect(service.transferOwner('o1', 'old', 1, 'new')).rejects.toThrow('DB Fail');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('getMembersWithPagination', () => {
    it('should throw Forbidden if role > 3', async () => {
        await expect(service.getMembersWithPagination('o1', 4)).rejects.toMatchObject({ statusCode: 403 });
    });

    it('should return paginated result', async () => {
        mockMemberModel.findByOrganizationPaginated.mockResolvedValue({ rows: [], count: 0 });
        const res = await service.getMembersWithPagination('o1', 1, { page: 1 });
        expect(res).toEqual({ rows: [], count: 0 });
    });
  });

  describe('bulkRemoveMembers', () => {
      it('should throw Forbidden if not OWNER', async () => {
          await expect(service.bulkRemoveMembers('o1', 2, ['u2'])).rejects.toMatchObject({ statusCode: 403 });
      });

      it('should throw Forbidden if trying to remove OWNER', async () => {
          mockMemberModel.getRole.mockResolvedValue(1);
          await expect(service.bulkRemoveMembers('o1', 1, ['owner_id'])).rejects.toMatchObject({ statusCode: 403 });
      });

      it('should bulk remove successfully', async () => {
          mockMemberModel.getRole.mockResolvedValue(3); // Normal member
          mockMemberModel.bulkRemove.mockResolvedValue(5);
          const res = await service.bulkRemoveMembers('o1', 1, ['u1', 'u2']);
          expect(res.success).toBe(true);
          expect(res.deleted).toBe(5);
      });
  });

  // Test exposed helpers to ensure object structure matches
  describe('Exposed Helpers', () => {
      it('should expose helper functions', () => {
          expect(service.getMemberCount).toBeDefined();
          expect(service.checkMembership).toBeDefined();
          expect(service.getUserMemberships).toBeDefined();
      });
  });
});