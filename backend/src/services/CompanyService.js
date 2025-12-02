// src/services/CompanyService.js
import { sequelize } from "../models/dbModels.js";
import { OrganizationModel } from "../models/CompanyModel.js";
import { MemberModel } from "../models/MemberModel.js";

/**
 * Factory for CompanyService
 * @param {Object} deps - Dependencies injection
 */
export const createCompanyService = (deps = {}) => {
  // Inject Dependencies
  const OrgModel = deps.OrganizationModel || OrganizationModel;
  const MemModel = deps.MemberModel || MemberModel;
  const db = deps.sequelize || sequelize;

  // --- Helper: Map Role ID to Name ---
  const mapRoleIdToName = (roleId) => {
    switch (Number(roleId)) {
      case 1: return 'OWNER';
      case 2: return 'ADMIN';
      case 3: return 'MEMBER';
      case 4: return 'VIEWER';
      case 5: return 'AUDITOR';
      default: return 'UNKNOWN';
    }
  };

  /**
   * Create Company
   */
  const createCompany = async (ownerUserId, companyData) => {
    const {
      org_name, org_code,
      org_address_1, org_address_2, org_address_3,
      org_integrate, org_integrate_url,
      org_integrate_provider_id, org_integrate_passcode,
    } = companyData;

    // Validation
    if (!org_name || !org_code) {
      throw new Error("กรุณากรอกชื่อบริษัทและรหัสบริษัท");
    }

    // Check Duplicate Code
    const exists = await OrgModel.codeExists(org_code);
    if (exists) {
      const error = new Error("รหัสบริษัทซ้ำ");
      error.code = "23505";
      throw error;
    }

    const t = await db.transaction();

    try {
      // Create Org
      const company = await OrgModel.create(
        {
          org_name, org_code, owner_user_id: ownerUserId,
          org_address_1, org_address_2, org_address_3,
          org_integrate, org_integrate_url,
          org_integrate_provider_id, org_integrate_passcode,
        },
        t
      );

      // Add Owner Member
      await MemModel.create(
        {
          orgId: company.org_id,
          userId: ownerUserId,
          roleId: 1, // OWNER
        },
        t
      );

      await t.commit();
      return company;
    } catch (error) {
      if (!t.finished) await t.rollback();
      throw error;
    }
  };

  /**
   * Get Company By ID
   */
  const getCompanyById = async (orgId) => {
    const company = await OrgModel.findById(orgId);
    if (!company) throw new Error("ไม่พบบริษัทนี้");
    return company;
  };

  /**
   * Get User Companies
   */
  const getUserCompanies = async (userId) => {
    // 1. Owned Companies
    const ownedCompanies = await OrgModel.findByOwner(userId);
    const formattedOwned = ownedCompanies.map(company => {
      const plain = company.get ? company.get({ plain: true }) : company;
      return { ...plain, role_id: 1, role_name: 'OWNER' };
    });

    // 2. Member Companies
    const memberCompanies = await OrgModel.findByMember(userId);
    const formattedMember = memberCompanies.map(company => {
      const plain = company.get ? company.get({ plain: true }) : company;
      // Handle nested join structure safely
      const membership = plain.members && plain.members[0] ? 
        (plain.members[0].sys_organization_members || plain.members[0]) : null;
      
      const roleId = membership ? membership.role_id : 3;

      const { members, ...rest } = plain; // Remove raw members array
      return {
        ...rest,
        role_id: roleId,
        role_name: mapRoleIdToName(roleId),
      };
    });

    const companies = [...formattedOwned, ...formattedMember];

    // 3. Get Member Counts
    const orgIds = companies.map(c => c.org_id);
    const memberCountsMap = await OrgModel.getMemberCounts(orgIds);

    // 4. Merge Counts
    return companies.map(c => ({
      ...c,
      member_count: memberCountsMap[c.org_id] ?? 0,
    }));
  };

  /**
   * Update Company
   */
  const updateCompany = async (orgId, userId, userOrgRoleId, updates) => {
    if (userOrgRoleId !== 1) {
      throw new Error("เฉพาะ OWNER เท่านั้นที่แก้ไขข้อมูลได้");
    }

    if (updates.org_code) {
      const exists = await OrgModel.codeExists(updates.org_code, orgId);
      if (exists) {
        const error = new Error("Org Code ซ้ำ");
        error.code = "23505";
        throw error;
      }
    }

    const updatedCompany = await OrgModel.update(orgId, updates);
    if (!updatedCompany) throw new Error("ไม่พบบริษัทนี้");

    return updatedCompany;
  };

  /**
   * Delete Company
   */
  const deleteCompany = async (orgId, userId, userOrgRoleId) => {
    if (userOrgRoleId !== 1) {
      throw new Error("อนุญาตเฉพาะ OWNER เท่านั้น");
    }

    const t = await db.transaction();

    try {
      const deleted = await OrgModel.delete(orgId, t);
      if (!deleted) {
        throw new Error("ไม่พบบริษัทนี้");
      }

      await MemModel.bulkRemoveMembers(orgId, [], t);
      await t.commit();

      return { success: true };
    } catch (error) {
      if (!t.finished) await t.rollback();
      throw error;
    }
  };

  /**
   * Search Organizations
   */
  const searchOrganizations = async (filters = {}, options = {}) => {
    return await OrgModel.searchOrganizations(filters, options);
  };

  /**
   * Get Stats
   */
  const getOrganizationStats = async (orgId) => {
    const stats = await OrgModel.getOrganizationStats(orgId);
    if (!stats) throw new Error("ไม่พบบริษัทนี้");
    return stats;
  };

  /**
   * Verify Membership
   */
  const verifyMembership = async (orgId, userId) => {
    return await MemModel.checkMembership(orgId, userId);
  };

  /**
   * Get User Role
   */
  const getUserRoleInOrganization = async (orgId, userId) => {
    return await MemModel.findMemberRole(orgId, userId);
  };

  return {
    createCompany,
    getCompanyById,
    getUserCompanies,
    updateCompany,
    deleteCompany,
    searchOrganizations,
    getOrganizationStats,
    verifyMembership,
    getUserRoleInOrganization,
    mapRoleIdToName // Exposed for testing if needed
  };
};

// Default Instance
const defaultInstance = createCompanyService();
export default defaultInstance;