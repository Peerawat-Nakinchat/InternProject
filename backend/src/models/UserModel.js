import { pool } from "../config/db.js";

const dbQuery = pool.query.bind(pool);

// ✅ BONUS FIX: เพิ่มฟิลด์ is_active เพื่อให้ครบถ้วน
const findById = async (userId) => {
    const res = await dbQuery(
        `SELECT user_id, email, full_name, role_id, is_active, profile_image_url 
         FROM sys_users
         WHERE user_id = $1`,
        [userId]
    );
    return res.rows[0] || null;
};

const findByEmail = async (email) => {
    const res = await dbQuery(
        `SELECT user_id, email, password_hash, full_name, role_id, is_active 
         FROM sys_users
         WHERE email = $1`,
        [email]
    );
    return res.rows[0] || null;
};

const createUser = async ({ email, passwordHash, name, surname }) => {
    const fullName = `${name} ${surname}`;

    const res = await dbQuery(
        `INSERT INTO sys_users 
        (email, password_hash, name, surname, full_name)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING user_id, email, full_name, role_id, is_active`,
        [email, passwordHash, name, surname, fullName]
    );
    return res.rows[0];
};

export const UserModel = {
    findByEmail,
    findById,
    createUser,
};