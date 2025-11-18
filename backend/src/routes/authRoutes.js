import express from 'express';
import { 
    registerUser, 
    loginUser, 
    getProfile,
    logoutUser,
    logoutAllUser
} from '../controllers/AuthController.js';

import { refreshAccessToken } from '../middleware/refreshTokenMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);

// Refresh Token Route
router.post('/token', refreshAccessToken, (req, res) => {
    return res.json({
        success: true,
        accessToken: res.locals.newAccessToken,
    });
});

// Protected
router.post('/logout-all', protect, logoutAllUser);
router.get('/profile', protect, getProfile);

export default router;
