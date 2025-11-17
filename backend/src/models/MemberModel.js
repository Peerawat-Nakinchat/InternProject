import { pool } from '../config/db.js';

export const MemberModel = {
  async addMember(company_id, user_id, role='user', invited_by=null) {
    const q = `INSERT INTO company_members (company_id, user_id, role, invited_by)
               VALUES ($1,$2,$3,$4) ON CONFLICT (company_id,user_id) DO UPDATE SET role=EXCLUDED.role RETURNING id,company_id,user_id,role,created_at`;
    const { rows } = await pool.query(q, [company_id, user_id, role, invited_by]);
    return rows[0];
  },

  async getUserCompanies(user_id) {
    const q = `SELECT c.id as company_id, c.name as company_name, m.role
               FROM company_members m
               JOIN companies c ON c.id = m.company_id
               WHERE m.user_id = $1`;
    const { rows } = await pool.query(q, [user_id]);
    return rows;
  },

  async getRole(company_id, user_id) {
    const q = 'SELECT role FROM company_members WHERE company_id=$1 AND user_id=$2';
    const { rows } = await pool.query(q, [company_id, user_id]);
    return rows[0]?.role || null;
  },

  async listMembers(company_id) {
    const q = `SELECT m.user_id, u.email, u.name, m.role, m.created_at
               FROM company_members m
               JOIN users u ON u.id = m.user_id
               WHERE m.company_id = $1 ORDER BY m.created_at`;
    const { rows } = await pool.query(q, [company_id]);
    return rows;
  },

  async updateRole(company_id, user_id, role) {
    const q = `UPDATE company_members SET role=$1 WHERE company_id=$2 AND user_id=$3 RETURNING *`;
    const { rows } = await pool.query(q, [role, company_id, user_id]);
    return rows[0];
  },

  async removeMember(company_id, user_id) {
    const q = `DELETE FROM company_members WHERE company_id=$1 AND user_id=$2`;
    await pool.query(q, [company_id, user_id]);
    return true;
  },

  async saveRefreshToken(user_id, token, expires_at) {
    const q = `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,$3) RETURNING id`;
    const { rows } = await pool.query(q, [user_id, token, expires_at]);
    return rows[0];
  },

  async findRefreshToken(token) {
    const q = `SELECT * FROM refresh_tokens WHERE token=$1`;
    const { rows } = await pool.query(q, [token]);
    return rows[0] || null;
  },

  async revokeRefreshToken(token) {
    const q = `DELETE FROM refresh_tokens WHERE token=$1`;
    await pool.query(q, [token]);
    return true;
  }
};
