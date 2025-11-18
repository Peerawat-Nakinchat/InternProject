import express from 'express';
import { 
    registerUser, 
    loginUser, 
    getProfile, 
    refreshAccessToken,
    logoutUser,
    logoutAllUser
} from '../controllers/AuthController.js';
import { protect } from '../middleware/authMiddleware.js';
import { refreshAccessToken as refreshMiddleware } from '../middleware/refreshTokenMiddleware.js';

const router = express.Router();

// Public Routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);

router.post('/token', refreshMiddleware, refreshAccessToken);

// Protected
router.post('/logout-all', protect, logoutAllUser);
router.get('/profile', protect, getProfile);

export default router;
