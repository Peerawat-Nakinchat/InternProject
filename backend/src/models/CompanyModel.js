// src/models/CompanyModel.js
import { pool } from '../config/db.js';

const dbQuery = pool.query.bind(pool);

/**
 * Create organization/company
 */
const createOrganization = async (client, data) => {
    const executor = client || pool;

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

    const sql = `
        INSERT INTO sys_organizations
        (
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
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *
    `;

    const res = await executor.query(sql, [
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
    ]);

    return res.rows[0];
};

/**
 * Get organization by ID
 */
const findOrganizationById = async (orgId) => {
    const sql = `
        SELECT *
        FROM sys_organizations
        WHERE org_id = $1
    `;
    const res = await dbQuery(sql, [orgId]);
    return res.rows[0] || null;
};

/**
 * Get all organizations belonging to user
 */
/**
 * Get all organizations belonging to user
 */
const findOrganizationsByUser = async (userId) => {
    const sql = `
        SELECT DISTINCT 
            o.*,
            m.role_id,
            r.role_name,
            m.joined_date
        FROM sys_organizations o
        LEFT JOIN sys_organization_members m ON o.org_id = m.org_id
        LEFT JOIN sys_role r ON m.role_id = r.role_id
        WHERE o.owner_user_id = $1 OR m.user_id = $1
        ORDER BY o.created_date DESC
    `;
    const res = await dbQuery(sql, [userId]);
    return res.rows;
};

/**
 * Update organization
 */
const updateOrganization = async (orgId, updates) => {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const key in updates) {
        fields.push(`${key} = $${idx}`);
        values.push(updates[key]);
        idx++;
    }

    values.push(orgId);

    const sql = `
        UPDATE sys_organizations
        SET ${fields.join(", ")}
        WHERE org_id = $${idx}
        RETURNING *
    `;

    const res = await dbQuery(sql, values);
    return res.rows[0];
};

/**
 * Delete organization
 */
const deleteOrganization = async (client, orgId) => {
    const executor = client || pool;

    const sql = `
        DELETE FROM sys_organizations
        WHERE org_id = $1
        RETURNING *
    `;
    const res = await executor.query(sql, [orgId]);
    return res.rows[0]; // null if not found
};

const isOrgCodeExists = async (org_code) => {
    const sql = `
        SELECT 1
        FROM sys_organizations
        WHERE org_code = $1
        LIMIT 1
    `;
    const res = await dbQuery(sql, [org_code]);
    return res.rows.length > 0;
};

export const CompanyModel = {
    createOrganization,
    findOrganizationById,
    findOrganizationsByUser,
    updateOrganization,
    deleteOrganization,
    isOrgCodeExists,
};
