// src/models/MemberModel.js
import { pool } from '../config/db.js';

const dbQuery = pool.query.bind(pool);

const addMemberToOrganization = async (clientOrPool, orgId, userId, roleId) => {
  const executor = clientOrPool || pool;
  const sql = `
    INSERT INTO sys_organization_members (org_id, user_id, role_id)
    VALUES ($1, $2, $3)
    RETURNING membership_id, org_id, user_id, role_id, joined_date
  `;
  const res = await executor.query(sql, [orgId, userId, roleId]);
  return res.rows[0];
};

const findMemberRole = async (orgId, userId) => {
  const sql = `
    SELECT role_id
    FROM sys_organization_members
    WHERE org_id = $1 AND user_id = $2
    LIMIT 1
  `;
  const res = await dbQuery(sql, [orgId, userId]);
  return res.rows[0]?.role_id ?? null;
};

const getMembers = async (orgId) => {
  const sql = `
    SELECT m.membership_id, m.user_id, m.role_id, m.joined_date,
           u.email, u.full_name
    FROM sys_organization_members m
    JOIN sys_users u ON u.user_id = m.user_id
    WHERE m.org_id = $1
    ORDER BY m.joined_date ASC
  `;
  const res = await dbQuery(sql, [orgId]);
  return res.rows;
};

const updateMemberRole = async (clientOrPool, orgId, memberUserId, newRoleId) => {
  const executor = clientOrPool || pool;
  const sql = `
    UPDATE sys_organization_members
    SET role_id = $1
    WHERE org_id = $2 AND user_id = $3
    RETURNING membership_id, org_id, user_id, role_id, joined_date
  `;
  const res = await executor.query(sql, [newRoleId, orgId, memberUserId]);
  return res.rows[0] || null;
};

const removeMember = async (clientOrPool, orgId, memberUserId) => {
  const executor = clientOrPool || pool;
  const sql = `
    DELETE FROM sys_organization_members
    WHERE org_id = $1 AND user_id = $2
    RETURNING membership_id
  `;
  const res = await executor.query(sql, [orgId, memberUserId]);
  return res.rows[0] || null;
};

/**
 * Transfer owner: update org.owner_user_id
 * Note: This should be called in a transaction where you also update member roles.
 */
const updateOrganizationOwner = async (client, orgId, newOwnerUserId) => {
  const sql = `
    UPDATE sys_organizations
    SET owner_user_id = $1, updated_date = CURRENT_TIMESTAMP
    WHERE org_id = $2
    RETURNING org_id, org_name, org_code, owner_user_id
  `;
  const res = await client.query(sql, [newOwnerUserId, orgId]);
  return res.rows[0] || null;
};

export const MemberModel = {
  addMemberToOrganization,
  findMemberRole,
  getMembers,
  updateMemberRole,
  removeMember,
  updateOrganizationOwner
};
