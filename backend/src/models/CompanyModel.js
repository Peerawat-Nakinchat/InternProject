import { pool } from '../config/db.js';

export const CompanyModel = {
  async create(name, owner_id) {
    const q = 'INSERT INTO companies (name, owner_id) VALUES ($1,$2) RETURNING id,name,owner_id,created_at';
    const { rows } = await pool.query(q, [name, owner_id]);
    return rows[0];
  },

  async findById(id) {
    const q = 'SELECT id,name,owner_id,created_at FROM companies WHERE id=$1';
    const { rows } = await pool.query(q, [id]);
    return rows[0] || null;
  },

  async updateOwner(company_id, new_owner_id) {
    const q = 'UPDATE companies SET owner_id=$1 WHERE id=$2 RETURNING id,name,owner_id';
    const { rows } = await pool.query(q, [new_owner_id, company_id]);
    return rows[0];
  }
};
