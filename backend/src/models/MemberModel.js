// src/models/MemberModel.js
import { pool } from '../config/db.js';

const dbQuery = pool.query.bind(pool);

/**
 * Add member to organization พร้อมดึงข้อมูลจาก sys_users
 */
const addMemberToOrganization = async (clientOrPool, orgId, userId, roleId) => {
  const executor = clientOrPool || pool;

  // ✅ ดึงข้อมูล user จาก sys_users ก่อน
  const userResult = await executor.query(
    `SELECT email, name, surname, full_name, user_address_1, user_address_2, user_address_3
     FROM sys_users
     WHERE user_id = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new Error('User not found');
  }

  const user = userResult.rows[0];

  // ✅ Insert พร้อมข้อมูลจาก sys_users
  const sql = `
    INSERT INTO sys_organization_members (
      org_id, 
      user_id, 
      role_id,
      email,
      name,
      surname,
      full_name,
      user_address_1,
      user_address_2,
      user_address_3
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (org_id, user_id)
    DO UPDATE SET 
      role_id = EXCLUDED.role_id,
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      surname = EXCLUDED.surname,
      full_name = EXCLUDED.full_name,
      user_address_1 = EXCLUDED.user_address_1,
      user_address_2 = EXCLUDED.user_address_2,
      user_address_3 = EXCLUDED.user_address_3,
      joined_date = CURRENT_TIMESTAMP
    RETURNING membership_id, org_id, user_id, role_id, joined_date
  `;

  const res = await executor.query(sql, [
    orgId, 
    userId, 
    roleId,
    user.email,
    user.name,
    user.surname,
    user.full_name,
    user.user_address_1 || '',
    user.user_address_2 || '',
    user.user_address_3 || ''
  ]);

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
    SELECT 
      m.membership_id, 
      m.user_id, 
      m.role_id, 
      m.joined_date,
      u.email, 
      u.full_name,
      u.name,
      u.surname
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

const updateOrganizationOwner = async (clientOrPool, orgId, newOwnerUserId) => {
  const executor = clientOrPool || pool;

  const sql = `
    UPDATE sys_organizations
    SET owner_user_id = $1, updated_date = CURRENT_TIMESTAMP
    WHERE org_id = $2
    RETURNING org_id, org_name, org_code, owner_user_id
  `;

  const res = await executor.query(sql, [newOwnerUserId, orgId]);
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