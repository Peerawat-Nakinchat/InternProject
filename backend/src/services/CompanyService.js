// src/services/CompanyService.js
import { sequelize, Organization, OrganizationMember } from '../models/dbModels.js';
import { OrganizationModel } from '../models/CompanyModel.js';

const createCompanyAndAssignOwner = async (data) => {
  const { org_code, owner_user_id } = data;
  const exists = await OrganizationModel.isOrgCodeExists(org_code);
  if (exists) {
    const error = new Error('รหัสบริษัทซ้ำ');
    error.code = '23505';
    throw error;
  }

  const transaction = await sequelize.transaction();

  try {
    const organization = await OrganizationModel.createOrganization(data, transaction);
    await OrganizationMember.create(
      {
        org_id: organization.org_id,
        user_id: owner_user_id,
        role_id: 1, // Owner Role
        joined_date: new Date()
      },
      { transaction }
    );

    await transaction.commit();
    return organization;

  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

const getCompaniesForUser = async (userId) => {
  return OrganizationModel.findOrganizationsByUser(userId);
};

const getCompanyById = async (orgId) => {
  return OrganizationModel.findOrganizationById(orgId);
};

const updateCompany = async (orgId, updates) => {
  return OrganizationModel.updateOrganization(orgId, updates);
};

const deleteCompany = async (orgId) => {
  return OrganizationModel.deleteOrganization(orgId);
};

export const CompanyService = {
  createCompanyAndAssignOwner,
  getCompaniesForUser,
  getCompanyById,
  updateCompany,
  deleteCompany,
};