// test/services/CompanyService.coverage.test.js
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createCompanyService } from '../../src/services/CompanyService.js';

describe('CompanyService (100% Coverage)', () => {
  let service;
  let mockOrgModel, mockMemModel, mockDb;
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

    // 2. Mock Models
    mockOrgModel = {
      codeExists: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findByOwner: jest.fn(),
      findByMember: jest.fn(),
      getMemberCounts: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      searchOrganizations: jest.fn(),
      getOrganizationStats: jest.fn()
    };

    mockMemModel = {
      create: jest.fn(),
      bulkRemoveMembers: jest.fn(),
      checkMembership: jest.fn(),
      findMemberRole: jest.fn()
    };

    // 3. Create Service
    service = createCompanyService({
      OrganizationModel: mockOrgModel,
      MemberModel: mockMemModel,
      sequelize: mockDb
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- createCompany ---
  describe('createCompany', () => {
    const validData = { org_name: 'Test Co', org_code: 'TEST' };

    it('should throw if name or code missing', async () => {
      await expect(service.createCompany('u1', {})).rejects.toThrow('กรุณากรอกชื่อบริษัทและรหัสบริษัท');
    });

    it('should throw if code exists', async () => {
      mockOrgModel.codeExists.mockResolvedValue(true);
      await expect(service.createCompany('u1', validData)).rejects.toThrow('รหัสบริษัทซ้ำ');
    });

    it('should create company successfully', async () => {
      mockOrgModel.codeExists.mockResolvedValue(false);
      mockOrgModel.create.mockResolvedValue({ org_id: 'o1' });

      const result = await service.createCompany('u1', validData);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockOrgModel.create).toHaveBeenCalled();
      expect(mockMemModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ roleId: 1 }), // Owner Role
        mockTransaction
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result.org_id).toBe('o1');
    });

    it('should rollback on error', async () => {
      mockOrgModel.codeExists.mockResolvedValue(false);
      mockOrgModel.create.mockRejectedValue(new Error('DB Fail'));

      await expect(service.createCompany('u1', validData)).rejects.toThrow('DB Fail');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  // --- getCompanyById ---
  describe('getCompanyById', () => {
    it('should return company', async () => {
      mockOrgModel.findById.mockResolvedValue({ id: 1 });
      const res = await service.getCompanyById(1);
      expect(res.id).toBe(1);
    });

    it('should throw if not found', async () => {
      mockOrgModel.findById.mockResolvedValue(null);
      await expect(service.getCompanyById(1)).rejects.toThrow('ไม่พบบริษัทนี้');
    });
  });

  // --- getUserCompanies ---
  describe('getUserCompanies', () => {
    it('should return owned and member companies with counts', async () => {
      // Mock Owned
      mockOrgModel.findByOwner.mockResolvedValue([
        { org_id: 'o1', get: () => ({ org_id: 'o1', name: 'Own' }) }
      ]);

      // Mock Member
      mockOrgModel.findByMember.mockResolvedValue([
        { 
          org_id: 'o2', 
          get: () => ({ 
            org_id: 'o2', 
            name: 'Mem', 
            members: [{ sys_organization_members: { role_id: 3 } }] 
          }) 
        }
      ]);

      // Mock Counts
      mockOrgModel.getMemberCounts.mockResolvedValue({ 'o1': 5, 'o2': 10 });

      const res = await service.getUserCompanies('u1');

      expect(res).toHaveLength(2);
      expect(res[0].role_name).toBe('OWNER');
      expect(res[0].member_count).toBe(5);
      expect(res[1].role_name).toBe('MEMBER');
      expect(res[1].member_count).toBe(10);
    });

    it('should handle missing member role gracefully', async () => {
      mockOrgModel.findByOwner.mockResolvedValue([]);
      mockOrgModel.findByMember.mockResolvedValue([
        { get: () => ({ org_id: 'o3', members: [] }) } // No members array data
      ]);
      mockOrgModel.getMemberCounts.mockResolvedValue({});

      const res = await service.getUserCompanies('u1');
      expect(res[0].role_id).toBe(3); // Default to MEMBER
    });
  });

  // --- updateCompany ---
  describe('updateCompany', () => {
    it('should throw if not owner', async () => {
      await expect(service.updateCompany('o1', 'u1', 2, {})).rejects.toThrow('เฉพาะ OWNER เท่านั้น');
    });

    it('should throw if code duplicate', async () => {
      mockOrgModel.codeExists.mockResolvedValue(true);
      await expect(service.updateCompany('o1', 'u1', 1, { org_code: 'DUP' })).rejects.toThrow('Org Code ซ้ำ');
    });

    it('should throw if company not found after update', async () => {
      mockOrgModel.codeExists.mockResolvedValue(false);
      mockOrgModel.update.mockResolvedValue(null);
      await expect(service.updateCompany('o1', 'u1', 1, {})).rejects.toThrow('ไม่พบบริษัทนี้');
    });

    it('should update successfully', async () => {
      mockOrgModel.update.mockResolvedValue({ id: 1 });
      const res = await service.updateCompany('o1', 'u1', 1, { name: 'New' });
      expect(res.id).toBe(1);
    });
  });

  // --- deleteCompany ---
  describe('deleteCompany', () => {
    it('should throw if not owner', async () => {
      await expect(service.deleteCompany('o1', 'u1', 2)).rejects.toThrow('อนุญาตเฉพาะ OWNER เท่านั้น');
    });

    it('should delete successfully', async () => {
      mockOrgModel.delete.mockResolvedValue(true);
      
      const res = await service.deleteCompany('o1', 'u1', 1);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockOrgModel.delete).toHaveBeenCalled();
      expect(mockMemModel.bulkRemoveMembers).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(res.success).toBe(true);
    });

    it('should rollback if company not found', async () => {
      mockOrgModel.delete.mockResolvedValue(false);
      
      await expect(service.deleteCompany('o1', 'u1', 1)).rejects.toThrow('ไม่พบบริษัทนี้');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should rollback on DB error', async () => {
      mockOrgModel.delete.mockRejectedValue(new Error('Fail'));
      
      await expect(service.deleteCompany('o1', 'u1', 1)).rejects.toThrow('Fail');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  // --- Other Methods ---
  describe('Other Methods', () => {
    it('searchOrganizations', async () => {
      await service.searchOrganizations();
      expect(mockOrgModel.searchOrganizations).toHaveBeenCalled();
    });

    it('getOrganizationStats', async () => {
      mockOrgModel.getOrganizationStats.mockResolvedValue({});
      await service.getOrganizationStats('o1');
      expect(mockOrgModel.getOrganizationStats).toHaveBeenCalled();
    });

    it('getOrganizationStats throw if null', async () => {
      mockOrgModel.getOrganizationStats.mockResolvedValue(null);
      await expect(service.getOrganizationStats('o1')).rejects.toThrow('ไม่พบบริษัทนี้');
    });

    it('verifyMembership', async () => {
      await service.verifyMembership('o1', 'u1');
      expect(mockMemModel.checkMembership).toHaveBeenCalled();
    });

    it('getUserRoleInOrganization', async () => {
      await service.getUserRoleInOrganization('o1', 'u1');
      expect(mockMemModel.findMemberRole).toHaveBeenCalled();
    });
  });

  // --- Role Mapper Test ---
  describe('mapRoleIdToName', () => {
    it('should map roles correctly', () => {
      expect(service.mapRoleIdToName(1)).toBe('OWNER');
      expect(service.mapRoleIdToName(2)).toBe('ADMIN');
      expect(service.mapRoleIdToName(3)).toBe('MEMBER');
      expect(service.mapRoleIdToName(4)).toBe('VIEWER');
      expect(service.mapRoleIdToName(5)).toBe('AUDITOR');
      expect(service.mapRoleIdToName(99)).toBe('UNKNOWN');
    });
  });
});