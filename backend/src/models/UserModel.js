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
        `SELECT 
            user_id, email, password_hash, name, surname, full_name, 
            sex, user_address_1, user_address_2, user_address_3,
            role_id, is_active
         FROM sys_users 
         WHERE email = $1
         LIMIT 1`,
        [email]
    );

    return res.rows[0] || null;
};


const createUser = async ({ email, passwordHash, name, surname, sex, user_address_1, user_address_2, user_address_3 }) => {
    const fullName = `${name} ${surname}`;

    const res = await dbQuery(
        `INSERT INTO sys_users 
        (email, password_hash, name, surname, full_name, sex , user_address_1, user_address_2, user_address_3)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING user_id, email, full_name, sex, role_id, is_active`,
        [email, passwordHash, name, surname, fullName, sex, user_address_1, user_address_2, user_address_3]
    );
    return res.rows[0];
};

export const UserModel = {
    findByEmail,
    findById,
    createUser,
};