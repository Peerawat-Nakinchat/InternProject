// src/services/CompanyService.js
import { sequelize } from "../models/dbModels.js";
import { OrganizationModel } from "../models/CompanyModel.js";
import { MemberModel } from "../models/MemberModel.js";

/**
 * CompanyService - Business Logic สำหรับการจัดการบริษัท/องค์กร
 */
class CompanyService {
  /**
   * สร้างบริษัทและกำหนด owner
   */
  async createCompany(ownerUserId, companyData) {
    const {
      org_name,
      org_code,
      org_address_1,
      org_address_2,
      org_address_3,
      org_integrate,
      org_integrate_url,
      org_integrate_provider_id,
      org_integrate_passcode,
    } = companyData;

    // Validation
    if (!org_name || !org_code) {
      throw new Error("กรุณากรอกชื่อบริษัทและรหัสบริษัท");
    }

    // Check if org_code already exists
    const exists = await OrganizationModel.codeExists(org_code);
    if (exists) {
      const error = new Error("รหัสบริษัทซ้ำ");
      error.code = "23505";
      throw error;
    }

    // Use transaction for atomic operation
    const t = await sequelize.transaction();

    try {
      // Create organization
      const company = await OrganizationModel.create(
        {
          org_name,
          org_code,
          owner_user_id: ownerUserId,
          org_address_1,
          org_address_2,
          org_address_3,
          org_integrate,
          org_integrate_url,
          org_integrate_provider_id,
          org_integrate_passcode,
        },
        t
      );

      // Add owner as member with role_id = 1 (OWNER)
      await MemberModel.create(
        {
          orgId: company.org_id,
          userId: ownerUserId,
          roleId: 1,
        },
        { transaction: t }
      );

      await t.commit();

      return company;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * ดึงข้อมูลบริษัทตาม ID
   */
  async getCompanyById(orgId) {
    const company = await OrganizationModel.findById(orgId);

    if (!company) {
      throw new Error("ไม่พบบริษัทนี้");
    }

    return company;
  }

  /**
   * ดึงรายการบริษัททั้งหมดของ user
   */
  mapRoleIdToName(roleId) {
    switch (Number(roleId)) {
      case 1: return 'OWNER';
      case 2: return 'ADMIN';
      case 3: return 'MEMBER';
      case 4: return 'VIEWER';
      case 5: return 'AUDITOR';
      default: return 'UNKNOWN';
    }
  }

  async getUserCompanies(userId) {
    // ดึงบริษัทที่เป็นเจ้าของ (OWNER)
    const ownedCompanies = await OrganizationModel.findByOwner(userId);
    const formattedOwned = ownedCompanies.map(company => {
      const plain = company.get({ plain: true }); 
      return {
        ...plain,
        role_id: 1,
        role_name: 'OWNER',
      };
    });

    // ดึงบริษัทที่เป็นสมาชิก (MEMBER)
    const memberCompanies = await OrganizationModel.findByMember(userId);
    const formattedMember = memberCompanies.map(company => {
      const plain = company.get({ plain: true });
      const membership = plain.members && plain.members[0] ? plain.members[0].sys_organization_members : null;
      const roleId = membership ? membership.role_id : 3; 

      return {
        ...plain,
        role_id: roleId,
        role_name: this.mapRoleIdToName(roleId), 
        members: undefined, 
      };
    });

    // รวมทั้งหมดก่อน
    const companies = [...formattedOwned, ...formattedMember];

    // 3) ดึงจำนวนสมาชิกทั้งหมดของ org เหล่านี้
    const orgIds = companies.map(c => c.org_id);
    const memberCountsMap = await OrganizationModel.getMemberCounts(orgIds);

    // 4) ใส่ member_count ให้แต่ละบริษัท
    const companiesWithCounts = companies.map(c => ({
      ...c,
      member_count: memberCountsMap[c.org_id] ?? 0,
    }));

    return companiesWithCounts;
  }

  /**
   * อัพเดทข้อมูลบริษัท
   */
  async updateCompany(orgId, userId, userOrgRoleId, updates) {
    if (userOrgRoleId !== 1) {
      throw new Error("เฉพาะ OWNER เท่านั้นที่แก้ไขข้อมูลได้");
    }

    if (updates.org_code) {
      const exists = await OrganizationModel.codeExists(
        updates.org_code,
        orgId
      );
      if (exists) {
        const error = new Error("Org Code ซ้ำ");
        error.code = "23505";
        throw error;
      }
    }

    const updatedCompany = await OrganizationModel.update(
      orgId,
      updates
    );

    if (!updatedCompany) {
      throw new Error("ไม่พบบริษัทนี้");
    }

    return updatedCompany;
  }

  /**
   * ลบบริษัท
   */
  async deleteCompany(orgId, userId, userOrgRoleId) {
    
    if (userOrgRoleId !== 1) {
      throw new Error("อนุญาตเฉพาะ OWNER เท่านั้น");
    }

    const t = await sequelize.transaction();

    try {
      // Delete organization
      const deleted = await OrganizationModel.delete(orgId, t);

      if (!deleted) {
        await t.rollback();
        throw new Error("ไม่พบบริษัทนี้");
      }

      // Remove all members
      await MemberModel.bulkRemoveMembers(orgId, [], t);

      await t.commit();

      return { success: true };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Search organizations
   */
  async searchOrganizations(filters = {}, options = {}) {
    return await OrganizationModel.searchOrganizations(filters, options);
  }

  /**
   * Get organization statistics
   */
  async getOrganizationStats(orgId) {
    const stats = await OrganizationModel.getOrganizationStats(orgId);

    if (!stats) {
      throw new Error("ไม่พบบริษัทนี้");
    }

    return stats;
  }

  /**
   * Verify user membership in organization
   */
  async verifyMembership(orgId, userId) {
    const isMember = await MemberModel.checkMembership(orgId, userId);
    return isMember;
  }

  /**
   * Get user's role in organization
   */
  async getUserRoleInOrganization(orgId, userId) {
    const roleId = await MemberModel.findMemberRole(orgId, userId);
    return roleId;
  }
}

export default new CompanyService();