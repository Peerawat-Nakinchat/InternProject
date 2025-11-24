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

  // Database will handle duplicate prevention via ON CONFLICT (org_id, user_id)

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

export const MemberModel = {
  addMemberToOrganization,
  checkMembership: async (orgId, email) => {
    const result = await pool.query(
      `SELECT 1 FROM sys_organization_members WHERE org_id = $1 AND email = $2`,
      [orgId, email]
    );
    return result.rows.length > 0;
  },
};
