import { pool } from "../config/db.js";

const dbQuery = pool.query.bind(pool);

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
    try {
        console.log('🔍 Finding user by email:', email);
        
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

        if (res.rows[0]) {
            console.log('✅ User found:', res.rows[0].user_id);
        } else {
            console.log('⚠️ User not found');
        }

        return res.rows[0] || null;
    } catch (error) {
        console.error('❌ Error finding user by email:', error);
        throw error;
    }
};

const createUser = async ({ email, passwordHash, name, surname, sex, user_address_1, user_address_2, user_address_3 }) => {
    const fullName = `${name} ${surname}`;

    const res = await dbQuery(
        `INSERT INTO sys_users 
        (email, password_hash, name, surname, full_name, sex , user_address_1, user_address_2, user_address_3)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING user_id, email, full_name, sex, user_address_1, user_address_2, user_address_3, role_id, is_active`,
        [email, passwordHash, name, surname, fullName, sex, user_address_1, user_address_2, user_address_3]
    );
    return res.rows[0];
};

const setResetToken = async (userId, token, expire) => {
    try {
        console.log('💾 Setting reset token:', { 
            userId, 
            token, 
            expire: expire.toISOString(),
            expireType: typeof expire 
        });
        
        // ตรวจสอบว่า user มีอยู่จริง
        const checkUser = await dbQuery(
            `SELECT user_id, email FROM sys_users WHERE user_id = $1`,
            [userId]
        );

        if (checkUser.rows.length === 0) {
            throw new Error(`User not found: ${userId}`);
        }

        console.log('✅ User exists:', checkUser.rows[0].email);
        
        const result = await dbQuery(
            `UPDATE sys_users 
             SET reset_token = $1, reset_token_expire = $2 
             WHERE user_id = $3
             RETURNING user_id, reset_token, reset_token_expire`,
            [token, expire, userId]
        );

        if (result.rows.length === 0) {
            throw new Error('Update failed - no rows affected');
        }

        console.log('✅ Reset token saved successfully:', {
            user_id: result.rows[0].user_id,
            token: result.rows[0].reset_token,
            expire: result.rows[0].reset_token_expire
        });
        
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error setting reset token:', error);
        throw error;
    }
};

const findByResetToken = async (token) => {
    try {
        console.log('🔍 Finding user by reset token:', token);
        
        const res = await dbQuery(
            `SELECT user_id, email, reset_token, reset_token_expire
             FROM sys_users
             WHERE reset_token = $1
             AND reset_token_expire >= NOW()
             LIMIT 1`,
            [token]
        );

        if (res.rows[0]) {
            console.log('✅ Valid token found for user:', res.rows[0].user_id);
        } else {
            console.log('⚠️ Token not found or expired');
            
            // ตรวจสอบว่า token มีอยู่แต่หมดอายุหรือไม่
            const expiredCheck = await dbQuery(
                `SELECT user_id, email, reset_token_expire
                 FROM sys_users
                 WHERE reset_token = $1
                 LIMIT 1`,
                [token]
            );
            
            if (expiredCheck.rows[0]) {
                console.log('⏰ Token exists but expired:', expiredCheck.rows[0].reset_token_expire);
            } else {
                console.log('❌ Token does not exist in database');
            }
        }

        return res.rows[0] || null;
    } catch (error) {
        console.error('❌ Error finding user by reset token:', error);
        throw error;
    }
};

const updatePassword = async (userId, hash) => {
    try {
        console.log('🔒 Updating password for user:', userId);
        
        const result = await dbQuery(
            `UPDATE sys_users
             SET password_hash = $1, reset_token = NULL, reset_token_expire = NULL
             WHERE user_id = $2
             RETURNING user_id`,
            [hash, userId]
        );

        if (result.rows.length === 0) {
            throw new Error('User not found for password update');
        }

        console.log('✅ Password updated successfully');
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error updating password:', error);
        throw error;
    }
};

// เพิ่มฟังก์ชันสำหรับอัปเดตอีเมล
const updateEmail = async (userId, newEmail) => {
    try {
        console.log('📧 Updating email for user:', userId, 'to:', newEmail);
        
        const result = await dbQuery(
            `UPDATE sys_users
             SET email = $1, updated_at = NOW()
             WHERE user_id = $2
             RETURNING user_id, email`,
            [newEmail, userId]
        );

        if (result.rows.length === 0) {
            throw new Error('User not found for email update');
        }

        console.log('✅ Email updated successfully');
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error updating email:', error);
        throw error;
    }
};

export const UserModel = {
    findByEmail,
    findById,
    createUser,
    setResetToken,
    findByResetToken,
    updatePassword,
    updateEmail
};