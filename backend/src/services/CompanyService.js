// src/services/CompanyService.js
import { pool } from '../config/db.js';
import { CompanyModel } from '../models/CompanyModel.js';
import { MemberModel } from '../models/MemberModel.js';

/**
 * Create company + Assign owner as role=1
 */
const createCompanyAndAssignOwner = async (data) => {
    const {
        org_name,
        org_code,
        owner_user_id,
        org_address_1,
        org_address_2,
        org_address_3,
        org_integrate,
        org_integrate_url,
        org_integrate_provider_id,
        org_integrate_passcode
    } = data;

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Create organization
        const organization = await CompanyModel.createOrganization(client, {
            org_name,
            org_code,
            owner_user_id,
            org_address_1,
            org_address_2,
            org_address_3,
            org_integrate,
            org_integrate_url,
            org_integrate_provider_id,
            org_integrate_passcode
        });

        // Assign owner as role_id=1
        await MemberModel.addMemberToOrganization(
            client,
            organization.org_id,
            owner_user_id,
            1 // owner role
        );

        await client.query("COMMIT");
        return organization;

    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Get all companies of a user
 */
const getCompaniesForUser = async (userId) => {
    return CompanyModel.findOrganizationsByUser(userId);
};

/**
 * Get single company by ID
 */
const getCompanyById = async (orgId) => {
    return CompanyModel.findOrganizationById(orgId);
};

/**
 * Update company
 */
const updateCompany = async (orgId, updates) => {
    return CompanyModel.updateOrganization(orgId, updates);
};

/**
 * Delete company
 */
const deleteCompany = async (orgId) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // อาจต้องลบ member ด้วย (ถ้าไม่มี cascade)
        const deleted = await CompanyModel.deleteOrganization(client, orgId);

        await client.query("COMMIT");
        return deleted;

    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

export const CompanyService = {
    createCompanyAndAssignOwner,
    getCompaniesForUser,
    getCompanyById,
    updateCompany,
    deleteCompany,
};
