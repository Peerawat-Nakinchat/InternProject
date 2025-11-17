import pool from '../config/db.js';

// ดึงผู้ใช้ทั้งหมด
export async function getAllUsers() {
  const result = await pool.query('SELECT id, name, email FROM users');
  return result.rows;
}

// ดึงผู้ใช้ตาม id
export async function getUserById(id) {
  const result = await pool.query(
    'SELECT id, name, email FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

// เพิ่มผู้ใช้ใหม่
export async function createUser({ name, email, password }) {
  const result = await pool.query(
    `INSERT INTO users (name, email, password)
     VALUES ($1, $2, $3)
     RETURNING id, name, email`,
    [name, email, password]
  );
  return result.rows[0];
}
