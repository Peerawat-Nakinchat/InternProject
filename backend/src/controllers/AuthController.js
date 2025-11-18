import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {pool} from '../config/db.js';

// ฟังก์ชันสร้าง Access Token
const generateAccessToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );
};

// ฟังก์ชันสร้าง Refresh Token
const generateRefreshToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );
};

// ลงทะเบียนผู้ใช้ใหม่
export const registerUser = async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                error: 'กรุณากรอกข้อมูลให้ครบถ้วน'
            });
        }

        const checkEmail = await client.query(
            'SELECT id FROM sys_users WHERE email = $1',
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

        const result = await client.query(
            `INSERT INTO sys_users (email, password, name, created_at, updated_at) 
             VALUES ($1, $2, $3, NOW(), NOW()) 
             RETURNING id, email, name, created_at`,
            [email, hashedPassword, name]
        );

        const user = result.rows[0];
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        await client.query(
            `INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) 
             VALUES ($1, $2, NOW() + INTERVAL '7 days', NOW())`,
            [user.id, refreshToken]
        );

        res.status(201).json({
            success: true,
            message: 'ลงทะเบียนสำเร็จ',
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            }
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
        const { email, password, remember } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'กรุณากรอกอีเมลและรหัสผ่าน'
            });
        }

        const result = await client.query(
            'SELECT id, email, password, name FROM sys_users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
            });
        }

        const user = result.rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
            });
        }

        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);
        const expiresIn = remember ? '30 days' : '7 days';

        await client.query(
            'DELETE FROM refresh_tokens WHERE user_id = $1 AND expires_at < NOW()',
            [user.id]
        );

        await client.query(
            `INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) 
             VALUES ($1, $2, NOW() + INTERVAL '${expiresIn}', NOW())`,
            [user.id, refreshToken]
        );

        await client.query(
            'UPDATE sys_users SET last_login = NOW() WHERE id = $1',
            [user.id]
        );

        res.json({
            success: true,
            message: 'เข้าสู่ระบบสำเร็จ',
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name
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

// ดึงข้อมูล Profile
export const getProfile = async (req, res) => {
    const client = await pool.connect();
    
    try {
        const userId = req.user.id;

        const result = await client.query(
            'SELECT id, email, name, created_at, last_login FROM sys_users WHERE id = $1',
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

// Refresh Access Token
export const refreshAccessToken = async (req, res) => {
    try {
        const userId = req.user.id;
        const newAccessToken = generateAccessToken(userId);

        res.json({
            success: true,
            accessToken: newAccessToken
        });

    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการ refresh token'
        });
    }
};

// ออกจากระบบ
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
            'DELETE FROM refresh_tokens WHERE token = $1',
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

// ออกจากระบบทุกอุปกรณ์
export const logoutAllUser = async (req, res) => {
    const client = await pool.connect();
    
    try {
        const userId = req.user.id;

        await client.query(
            'DELETE FROM refresh_tokens WHERE user_id = $1',
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