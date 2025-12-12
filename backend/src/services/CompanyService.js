// src/services/CompanyService.js
import { sequelize } from "../models/dbModels.js";
import { OrganizationModel } from "../models/CompanyModel.js";
import { MemberModel } from "../models/MemberModel.js";
import { createError } from "../middleware/errorHandler.js"; 

export const createCompanyService = (deps = {}) => {
  const OrgModel = deps.OrganizationModel || OrganizationModel;
  const MemModel = deps.MemberModel || MemberModel;
  const db = deps.sequelize || sequelize;

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

  const createCompany = async (ownerUserId, companyData) => {
    const {
      org_name, org_code, org_address_1, org_address_2, org_address_3,
      org_integrate, org_integrate_url, org_integrate_provider_id, org_integrate_passcode,
    } = companyData;

    if (!org_name || !org_code) {
      // ✅ 400 Bad Request
      throw createError.badRequest("กรุณากรอกชื่อบริษัทและรหัสบริษัท");
    }

    const exists = await OrgModel.codeExists(org_code);
    if (exists) {
      // ✅ 409 Conflict
      throw createError.conflict("รหัสบริษัทซ้ำ (Organization Code already exists)");
    }

    const t = await db.transaction();

    try {
      const company = await OrgModel.create(
        {
          org_name, org_code, owner_user_id: ownerUserId,
          org_address_1, org_address_2, org_address_3,
          org_integrate, org_integrate_url,
          org_integrate_provider_id, org_integrate_passcode,
        }, t
      );

      await MemModel.create({ orgId: company.org_id, userId: ownerUserId, roleId: 1 }, t);

      await t.commit();
      return company;
    } catch (error) {
      if (!t.finished) await t.rollback();
      throw error;
    }
  };

  const getCompanyById = async (orgId) => {
    const company = await OrgModel.findById(orgId);
    if (!company) throw createError.notFound("ไม่พบบริษัทนี้");
    return company;
  };

  const getUserCompanies = async (userId) => {
    const ownedCompanies = await OrgModel.findByOwner(userId);
    const formattedOwned = ownedCompanies.map(company => {
      const plain = company.get ? company.get({ plain: true }) : company;
      return { ...plain, role_id: 1, role_name: 'OWNER' };
    });

    const memberCompanies = await OrgModel.findByMember(userId);
    const formattedMember = memberCompanies.map(company => {
      const plain = company.get ? company.get({ plain: true }) : company;
      const membership = plain.members && plain.members[0] ? 
        (plain.members[0].sys_organization_members || plain.members[0]) : null;
      
      const roleId = membership ? membership.role_id : 3;
      const { members, ...rest } = plain;
      return { ...rest, role_id: roleId, role_name: mapRoleIdToName(roleId) };
    });

    const companies = [...formattedOwned, ...formattedMember];
    const orgIds = companies.map(c => c.org_id);
    const memberCountsMap = await OrgModel.getMemberCounts(orgIds);

    return companies.map(c => ({
      ...c,
      member_count: memberCountsMap[c.org_id] ?? 0,
    }));
  };

  const updateCompany = async (orgId, userId, userOrgRoleId, updates) => {
    const isOwner = await OrgModel.isOwner(orgId, userId);
    
    if (!isOwner) {
      throw createError.forbidden("Security Alert: คุณไม่ใช่เจ้าของบริษัทนี้ (Verification Failed)");
    }

    if (updates.org_code) {
      const exists = await OrgModel.codeExists(updates.org_code, orgId);
      if (exists) {
        throw createError.conflict("Org Code ซ้ำ"); // ✅ 409 Conflict
      }
    }

    const updatedCompany = await OrgModel.update(orgId, updates);
    if (!updatedCompany) throw createError.notFound("ไม่พบบริษัทนี้"); // ✅ 404 Not Found

    return updatedCompany;
  };

  const deleteCompany = async (orgId, userId, userOrgRoleId) => {
    const isOwner = await OrgModel.isOwner(orgId, userId);
    
    if (!isOwner) {
      throw createError.forbidden("Security Alert: คุณไม่ใช่เจ้าของบริษัทนี้");
    }

    const t = await db.transaction();

    try {
      const deleted = await OrgModel.deleteById(orgId, t);  (deleteById)
      if (!deleted) {
        throw createError.notFound("ไม่พบบริษัทนี้"); // ✅ 404 Not Found
      }

      await MemModel.removeAllByOrganization(orgId, t); 
      await t.commit();

      return { success: true };
    } catch (error) {
      if (!t.finished) await t.rollback();
      throw error;
    }
  };

  const searchOrganizations = async (filters = {}, options = {}) => {
    return await OrgModel.search(filters, options);  (search)
  };

  const getOrganizationStats = async (orgId) => {
    const stats = await OrgModel.findByIdWithStats(orgId); 
    if (!stats) throw createError.notFound("ไม่พบบริษัทนี้"); // ✅ 404 Not Found
    return stats;
  };

  const verifyMembership = async (orgId, userId) => {
    return await MemModel.exists(orgId, userId); 
  };

  const getUserRoleInOrganization = async (orgId, userId) => {
    return await MemModel.getRole(orgId, userId); 
  };

  return {
    createCompany, getCompanyById, getUserCompanies, updateCompany,
    deleteCompany, searchOrganizations, getOrganizationStats,
    verifyMembership, getUserRoleInOrganization, mapRoleIdToName
  };
};

const defaultInstance = createCompanyService();
export default defaultInstance;