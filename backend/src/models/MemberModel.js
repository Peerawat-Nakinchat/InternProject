// src/models/MemberModel.js
import { pool } from "../config/db.js";

const dbQuery = pool.query.bind(pool);

const addMemberToOrganization = async (clientOrPool, orgId, userId, roleId) => {
  const executor = clientOrPool || pool;

  // ดึงข้อมูล user จาก sys_users
  const userResult = await executor.query(
    `SELECT email, name, surname, full_name, user_address_1, user_address_2, user_address_3
     FROM sys_users
     WHERE user_id = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) throw new Error("User not found");
  const user = userResult.rows[0];

  // 🔹 ตรวจสอบ member ซ้ำสำหรับ role != owner
  if (roleId !== 1) {
    const check = await executor.query(
      `SELECT 1 FROM sys_organization_members WHERE user_id = $1 AND role_id != 1 LIMIT 1`,
      [userId]
    );
    if (check.rows.length > 0) {
      const error = new Error("ผู้ใช้นี้เป็นสมาชิกอยู่แล้วในบริษัทอื่น");
      error.code = "23505"; // ใช้จับ 409 ใน controller
      throw error;
    }
  }

  const sql = `
    INSERT INTO sys_organization_members (
      org_id, user_id, role_id, email, name, surname, full_name,
      user_address_1, user_address_2, user_address_3
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (org_id, user_id) DO UPDATE
    SET role_id = EXCLUDED.role_id,
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
    user.user_address_1 || "",
    user.user_address_2 || "",
    user.user_address_3 || "",
  ]);

  return res.rows[0];
};

const findMemberRole = async (orgId, userId) => {
  const res = await pool.query(
    `SELECT role_id FROM sys_organization_members WHERE org_id = $1 AND user_id = $2`,
    [orgId, userId]
  );
  return res.rows.length ? res.rows[0].role_id : null;
};

const getMembers = async (orgId) => {
  const res = await pool.query(
    `SELECT m.*, r.role_name
     FROM sys_organization_members m
     JOIN sys_roles r ON m.role_id = r.role_id
     WHERE m.org_id = $1`,
    [orgId]
  );
  return res.rows;
};

const updateMemberRole = async (client, orgId, userId, roleId) => {
  const executor = client || pool;
  const res = await executor.query(
    `UPDATE sys_organization_members SET role_id = $1 WHERE org_id = $2 AND user_id = $3 RETURNING *`,
    [roleId, orgId, userId]
  );
  return res.rows[0];
};

const removeMember = async (client, orgId, userId) => {
  const executor = client || pool;
  const res = await executor.query(
    `DELETE FROM sys_organization_members WHERE org_id = $1 AND user_id = $2 RETURNING *`,
    [orgId, userId]
  );
  return res.rows[0];
};

const updateOrganizationOwner = async (client, orgId, newOwnerId) => {
  const executor = client || pool;
  const res = await executor.query(
    `UPDATE sys_organizations SET owner_user_id = $1 WHERE org_id = $2 RETURNING *`,
    [newOwnerId, orgId]
  );
  return res.rows[0];
};

export const MemberModel = {
  addMemberToOrganization,
  findMemberRole,
  getMembers,
  updateMemberRole,
  removeMember,
  updateOrganizationOwner,
};
