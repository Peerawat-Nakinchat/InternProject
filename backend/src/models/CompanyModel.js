// src/models/CompanyModel.js
import { pool } from '../config/db.js';

const dbQuery = pool.query.bind(pool);

/**
 * Creates a new organization/company.
 */
const createOrganization = async (client, orgName, orgCode, ownerUserId) => {
    // Accept either a client (transaction) or fallback to pool
    const executor = client || pool;
    const sql = `
        INSERT INTO sys_organizations (org_name, org_code, owner_user_id)
        VALUES ($1, $2, $3)
        RETURNING org_id, org_name, org_code, created_date
    `;
    const res = await executor.query(sql, [orgName, orgCode, ownerUserId]);
    return res.rows[0];
};

/**
 * Finds all organizations owned by or member of a specific user.
 */
const findOrganizationsByUser = async (userId) => {
    const sql = `
        SELECT DISTINCT o.org_id, o.org_name, o.org_code, o.created_date
        FROM sys_organizations o
        LEFT JOIN sys_organization_members m ON o.org_id = m.org_id
        WHERE o.owner_user_id = $1 OR m.user_id = $1
        ORDER BY o.created_date DESC
    `;
    const res = await dbQuery(sql, [userId]);
    return res.rows;
};

const deleteOrganization = async (client, orgId) => {
    const executor = client || pool;

    const sql = `
        DELETE FROM sys_organizations
        WHERE org_id = $1
        RETURNING org_id
    `;
    const res = await executor.query(sql, [orgId]);
    return res.rows[0]; // return null if not found
};

export const CompanyModel = {
    createOrganization,
    findOrganizationsByUser,
    deleteOrganization,
};
