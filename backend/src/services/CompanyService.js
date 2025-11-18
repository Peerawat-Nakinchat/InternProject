// src/services/CompanyService.js
import { pool } from '../config/db.js';
import { CompanyModel } from '../models/CompanyModel.js';
import { MemberModel } from '../models/MemberModel.js';

/**
 * Creates an organization and assigns the owner as a member with OWNER role (role_id = 1).
 * Uses a DB transaction to ensure atomicity.
 */
const createCompanyAndAssignOwner = async (orgNameRaw, orgCodeRaw, ownerUserId) => {
    const orgName = String(orgNameRaw).trim();
    const orgCode = String(orgCodeRaw).trim();

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. create organization
        const organization = await CompanyModel.createOrganization(client, orgName, orgCode, ownerUserId);

        // 2. add owner as member with role_id = 1 (OWNER)
        // If addMemberToOrganization uses ON CONFLICT it will upsert the role
        await MemberModel.addMemberToOrganization(client, organization.org_id, ownerUserId, 1);

        await client.query('COMMIT');

        return organization;
    } catch (err) {
        await client.query('ROLLBACK');
        // rethrow so controller can decide HTTP code
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Returns organizations associated with a user (owner or member).
 */
const getCompaniesForUser = async (userId) => {
    return CompanyModel.findOrganizationsByUser(userId);
};

const deleteCompany = async (orgId) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Attempt delete
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
    deleteCompany,
};
