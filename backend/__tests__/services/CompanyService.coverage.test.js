// tests/services/CompanyService.coverage.test.js
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createCompanyService } from '../../src/services/CompanyService.js';
import { AppError } from '../../src/middleware/errorHandler.js';

describe('CompanyService (100% Coverage)', () => {
  let service;
  let mockOrgModel, mockMemModel, mockDb;
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

    mockOrgModel = {
      codeExists: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findByOwner: jest.fn(),
      findByMember: jest.fn(),
      getMemberCounts: jest.fn(),
      update: jest.fn(),
      deleteById: jest.fn(),
      search: jest.fn(),
      findByIdWithStats: jest.fn(),
    };

    mockMemModel = {
      create: jest.fn(),
      removeAllByOrganization: jest.fn(),
      exists: jest.fn(),
      getRole: jest.fn()
    };

    service = createCompanyService({
      OrganizationModel: mockOrgModel,
      MemberModel: mockMemModel,
      sequelize: mockDb
    });
  });

  afterEach(() => { jest.clearAllMocks(); });

  describe('createCompany', () => {
    const validData = { org_name: 'Test Co', org_code: 'TEST' };

    it('should throw BadRequest (400) if name or code missing', async () => {
      await expect(service.createCompany('u1', {})).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should throw Conflict (409) if code exists', async () => {
      mockOrgModel.codeExists.mockResolvedValue(true);
      await expect(service.createCompany('u1', validData)).rejects.toMatchObject({ statusCode: 409 });
    });

    it('should create company successfully with transaction', async () => {
      mockOrgModel.codeExists.mockResolvedValue(false);
      mockOrgModel.create.mockResolvedValue({ org_id: 'new_org' });

      const res = await service.createCompany('u1', validData);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockOrgModel.create).toHaveBeenCalled();
      expect(mockMemModel.create).toHaveBeenCalledWith({ orgId: 'new_org', userId: 'u1', roleId: 1 }, mockTransaction);
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(res).toEqual({ org_id: 'new_org' });
    });

    it('should rollback transaction on error', async () => {
      mockOrgModel.codeExists.mockResolvedValue(false);
      mockOrgModel.create.mockRejectedValue(new Error('DB Error'));

      await expect(service.createCompany('u1', validData)).rejects.toThrow('DB Error');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('getCompanyById', () => {
    it('should throw NotFound (404) if not found', async () => {
      mockOrgModel.findById.mockResolvedValue(null);
      await expect(service.getCompanyById(1)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should return company', async () => {
      const mockComp = { org_id: 1, name: 'Test' };
      mockOrgModel.findById.mockResolvedValue(mockComp);
      const res = await service.getCompanyById(1);
      expect(res).toEqual(mockComp);
    });
  });

  describe('getUserCompanies', () => {
    it('should aggregate owned and member companies correctly', async () => {
      // Mock Owned Companies
      mockOrgModel.findByOwner.mockResolvedValue([
        { org_id: 'o1', org_name: 'Owned 1', get: function() { return this; } }
      ]);

      // Mock Member Companies (complex structure)
      const memberComp = {
        org_id: 'o2', 
        org_name: 'Member 1',
        members: [{ sys_organization_members: { role_id: 2 } }], // ADMIN
        get: function() { return this; }
      };
      mockOrgModel.findByMember.mockResolvedValue([memberComp]);

      // Mock Counts
      mockOrgModel.getMemberCounts.mockResolvedValue({ 'o1': 10, 'o2': 5 });

      const result = await service.getUserCompanies('u1');

      expect(result).toHaveLength(2);
      
      // Check Owned
      expect(result[0].org_id).toBe('o1');
      expect(result[0].role_id).toBe(1);
      expect(result[0].role_name).toBe('OWNER');
      expect(result[0].member_count).toBe(10);

      // Check Member
      expect(result[1].org_id).toBe('o2');
      expect(result[1].role_id).toBe(2);
      expect(result[1].role_name).toBe('ADMIN');
      expect(result[1].member_count).toBe(5);
    });

    it('should handle member companies with missing member info (default role 3)', async () => {
        mockOrgModel.findByOwner.mockResolvedValue([]);
        const memberComp = {
            org_id: 'o3',
            members: [], // No member info
            get: function() { return this; }
        };
        mockOrgModel.findByMember.mockResolvedValue([memberComp]);
        mockOrgModel.getMemberCounts.mockResolvedValue({});

        const result = await service.getUserCompanies('u1');
        expect(result[0].role_id).toBe(3);
        expect(result[0].role_name).toBe('MEMBER');
        expect(result[0].member_count).toBe(0);
    });
  });

  describe('updateCompany', () => {
    it('should throw Forbidden (403) if not owner', async () => {
      await expect(service.updateCompany('o1', 'u1', 2, {})).rejects.toMatchObject({ statusCode: 403 });
    });

    it('should throw Conflict if org code exists', async () => {
      mockOrgModel.codeExists.mockResolvedValue(true);
      await expect(service.updateCompany('o1', 'u1', 1, { org_code: 'DUP' })).rejects.toMatchObject({ statusCode: 409 });
    });

    it('should throw NotFound if update fails', async () => {
      mockOrgModel.codeExists.mockResolvedValue(false);
      mockOrgModel.update.mockResolvedValue(null);
      await expect(service.updateCompany('o1', 'u1', 1, { name: 'New' })).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should update successfully', async () => {
      mockOrgModel.update.mockResolvedValue({ org_id: 'o1' });
      const res = await service.updateCompany('o1', 'u1', 1, { name: 'New' });
      expect(res).toBeDefined();
    });
  });

  describe('deleteCompany', () => {
      it('should throw Forbidden if not owner', async () => {
          await expect(service.deleteCompany('o1', 'u1', 2)).rejects.toMatchObject({ statusCode: 403 });
      });

      it('should throw NotFound if delete returns false', async () => {
          mockOrgModel.deleteById.mockResolvedValue(false);
          await expect(service.deleteCompany('o1', 'u1', 1)).rejects.toMatchObject({ statusCode: 404 });
      });

      it('should delete successfully with transaction', async () => {
          mockOrgModel.deleteById.mockResolvedValue(true);
          
          const res = await service.deleteCompany('o1', 'u1', 1);

          expect(mockMemModel.removeAllByOrganization).toHaveBeenCalledWith('o1', mockTransaction);
          expect(mockTransaction.commit).toHaveBeenCalled();
          expect(res.success).toBe(true);
      });

      it('should rollback on error', async () => {
          mockOrgModel.deleteById.mockRejectedValue(new Error('Fail'));
          await expect(service.deleteCompany('o1', 'u1', 1)).rejects.toThrow('Fail');
          expect(mockTransaction.rollback).toHaveBeenCalled();
      });
  });

  describe('Helpers and other methods', () => {
      it('should search organizations', async () => {
          await service.searchOrganizations();
          expect(mockOrgModel.search).toHaveBeenCalled();
      });

      it('should get organization stats', async () => {
          mockOrgModel.findByIdWithStats.mockResolvedValue({});
          await service.getOrganizationStats('o1');
          expect(mockOrgModel.findByIdWithStats).toHaveBeenCalled();
      });

      it('should throw NotFound for stats if missing', async () => {
          mockOrgModel.findByIdWithStats.mockResolvedValue(null);
          await expect(service.getOrganizationStats('o1')).rejects.toMatchObject({ statusCode: 404 });
      });

      it('should verify membership', async () => {
          await service.verifyMembership('o1', 'u1');
          expect(mockMemModel.exists).toHaveBeenCalled();
      });

      it('should get user role', async () => {
          await service.getUserRoleInOrganization('o1', 'u1');
          expect(mockMemModel.getRole).toHaveBeenCalled();
      });

      it('should map role IDs to names correctly', () => {
          expect(service.mapRoleIdToName(1)).toBe('OWNER');
          expect(service.mapRoleIdToName(2)).toBe('ADMIN');
          expect(service.mapRoleIdToName(3)).toBe('MEMBER');
          expect(service.mapRoleIdToName(4)).toBe('VIEWER');
          expect(service.mapRoleIdToName(5)).toBe('AUDITOR');
          expect(service.mapRoleIdToName(99)).toBe('UNKNOWN');
      });
  });
});