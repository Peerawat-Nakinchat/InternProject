import * as AuthService from '../services/AuthService.js';

/**
 * Handles user registration request.
 * POST /api/auth/register
 */
const registerUser = async (req, res) => {
    try {
        const { email, password, name, surname } = req.body;

        if (!email || !password || !name || !surname) {
            return res.status(400).json({ 
                success: false, 
                message: 'กรุณากรอกข้อมูลให้ครบถ้วน: อีเมล, รหัสผ่าน, ชื่อ, และนามสกุล' 
            });
        }

        const newUser = await AuthService.register({ email, password, name, surname });
        
        res.status(201).json({ 
            success: true, 
            message: 'ลงทะเบียนสำเร็จ', 
            user: newUser 
        });

    } catch (error) {
        console.error('Registration error:', error.message);
        if (error.message.includes('exists')) {
            return res.status(409).json({ success: false, message: 'อีเมลนี้ถูกใช้แล้ว' });
        }
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลงทะเบียน' });
    }
};

/**
 * Handles user login request.
 * POST /api/auth/login
 */
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'กรุณากรอกอีเมลและรหัสผ่าน' 
            });
        }

        const { accessToken, refreshToken, user } = await AuthService.login(email, password);
        
        res.status(200).json({
            success: true,
            message: 'เข้าสู่ระบบสำเร็จ',
            accessToken: accessToken, 
            refreshToken: refreshToken, 
            user: user,
        });

    } catch (error) {
        console.error('Login error:', error.message);
        if (error.message.includes('Invalid')) {
            return res.status(401).json({ success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
    }
};

/**
 * Handles token refresh request.
 * POST /api/auth/token
 */
const refreshAccessToken = (req, res) => {
    const newAccessToken = res.locals.newAccessToken;

    if (!newAccessToken) {
        return res.status(403).json({ success: false, message: 'ไม่สามารถสร้าง Access Token ใหม่ได้' });
    }
    
    res.status(200).json({
        success: true,
        message: 'Access Token ถูกรีเฟรชแล้ว',
        accessToken: newAccessToken,
    });
};

/**
 * Get user profile (Protected route for testing auth)
 * GET /api/auth/profile
 */
const getProfile = async (req, res) => {
    res.json({
        success: true,
        message: 'ข้อมูลโปรไฟล์',
        user: req.user,
    });
};

const logoutUser = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ success: false, message: 'ต้องส่ง Refresh Token' });
        }

        await AuthService.logout(refreshToken);

        res.status(200).json({
            success: true,
            message: 'ออกจากระบบสำเร็จ'
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการออกจากระบบ' });
    }
};

const logoutAllUser = async (req, res) => {
    try {
        const userId = req.user.user_id;

        await AuthService.logoutAll(userId);

        res.status(200).json({
            success: true,
            message: 'ออกจากระบบทุกอุปกรณ์สำเร็จ'
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
};



export {
    registerUser,
    loginUser,
    logoutUser,
    logoutAllUser,
    refreshAccessToken,
    getProfile,
};