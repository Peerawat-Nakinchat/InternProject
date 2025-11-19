import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

// ฟังก์ชันสร้าง Access Token
export const generateAccessToken = (userId) => {
    return jwt.sign(
        { user_id: userId },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_EXPIRES }
    );
};

// ฟังก์ชันสร้าง Refresh Token
export const generateRefreshToken = (userId) => {
    return jwt.sign(
        { user_id: userId },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_EXPIRES }
    );
};

// ลงทะเบียนผู้ใช้ใหม่
export const registerUser = async (req, res) => {
    const client = await pool.connect();

    try {
        const { email, password, name, surname, sex, user_address_1, user_address_2, user_address_3 } = req.body;

        if (!email || !password || !name || !surname || !sex || !user_address_1 || !user_address_2 || !user_address_3) {
            return res.status(400).json({
                success: false,
                error: 'กรุณากรอกข้อมูลให้ครบถ้วน'
            });
        }

        // ตรวจสอบอีเมลซ้ำ
        const checkEmail = await client.query(
            'SELECT user_id FROM sys_users WHERE email = $1',
            [email]
        );

        if (checkEmail.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'อีเมลนี้ถูกใช้งานแล้ว'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // เพิ่มข้อมูลผู้ใช้
        const result = await client.query(
            `INSERT INTO sys_users (
                email, password_hash, name, surname, full_name, sex,
                user_address_1, user_address_2, user_address_3, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            RETURNING user_id, email, name, surname, sex , user_address_1, user_address_2, user_address_3`,
            [
                email,
                hashedPassword,
                name,
                surname,
                `${name} ${surname}`,
                sex,
                user_address_1,
                user_address_2,
                user_address_3
            ]
        );

        const user = result.rows[0];

        // สร้าง token
        const accessToken = generateAccessToken(user.user_id);
        const refreshToken = generateRefreshToken(user.user_id);

        // บันทึก refresh token
        await client.query(
            `INSERT INTO sys_refresh_tokens (user_id, refresh_token, created_at)
             VALUES ($1, $2, NOW())`,
            [user.user_id, refreshToken]
        );

        res.status(201).json({
            success: true,
            message: 'ลงทะเบียนสำเร็จ',
            accessToken,
            refreshToken,
            user
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการลงทะเบียน'
        });
    } finally {
        client.release();
    }
};


// เข้าสู่ระบบ
export const loginUser = async (req, res) => {
    const client = await pool.connect();

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'กรุณากรอกอีเมลและรหัสผ่าน'
            });
        }

        // ดึงข้อมูลผู้ใช้
        const result = await client.query(
            `SELECT user_id, email, password_hash, name, surname
             FROM sys_users WHERE email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
            });
        }

        const user = result.rows[0];

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
            });
        }

        const accessToken = generateAccessToken(user.user_id);
        const refreshToken = generateRefreshToken(user.user_id);

        // บันทึก refresh token ใหม่
        await client.query(
            `INSERT INTO sys_refresh_tokens (user_id, refresh_token, created_at)
             VALUES ($1, $2, NOW())`,
            [user.user_id, refreshToken]
        );

        res.json({
            success: true,
            message: 'เข้าสู่ระบบสำเร็จ',
            accessToken,
            refreshToken,
            user: {
                user_id: user.user_id,
                email: user.email,
                name: user.name,
                surname: user.surname
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
        });
    } finally {
        client.release();
    }
};

// ดึง Profile
export const getProfile = async (req, res) => {
    const client = await pool.connect();

    try {
        const userId = req.user.user_id;

        const result = await client.query(
            `SELECT user_id, email, name, surname, full_name, created_at
             FROM sys_users WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'ไม่พบข้อมูลผู้ใช้'
            });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    } finally {
        client.release();
    }
};

// Logout
export const logoutUser = async (req, res) => {
    const client = await pool.connect();

    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'ไม่พบ refresh token'
            });
        }

        await client.query(
            'DELETE FROM sys_refresh_tokens WHERE refresh_token = $1',
            [refreshToken]
        );

        res.json({
            success: true,
            message: 'ออกจากระบบสำเร็จ'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการออกจากระบบ'
        });
    } finally {
        client.release();
    }
};

// Logout ทุกอุปกรณ์
export const logoutAllUser = async (req, res) => {
    const client = await pool.connect();

    try {
        const userId = req.user.user_id;

        await client.query(
            'DELETE FROM sys_refresh_tokens WHERE user_id = $1',
            [userId]
        );

        res.json({
            success: true,
            message: 'ออกจากระบบทุกอุปกรณ์สำเร็จ'
        });

    } catch (error) {
        console.error('Logout all error:', error);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการออกจากระบบ'
        });
    } finally {
        client.release();
    }
};
