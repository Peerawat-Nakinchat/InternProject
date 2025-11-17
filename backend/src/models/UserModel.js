import { pool } from '../config/db.js';

export const UserModel = {
  async create(email, password, name=null) {
    const q = 'INSERT INTO users (email, password, name) VALUES ($1,$2,$3) RETURNING id,email,name,created_at';
    const { rows } = await pool.query(q, [email, password, name]);
    return rows[0];
  },

  async findByEmail(email) {
    const q = 'SELECT id,email,password,name,created_at FROM users WHERE email=$1';
    const { rows } = await pool.query(q, [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const q = 'SELECT id,email,name,created_at FROM users WHERE id=$1';
    const { rows } = await pool.query(q, [id]);
    return rows[0] || null;
  }
};
