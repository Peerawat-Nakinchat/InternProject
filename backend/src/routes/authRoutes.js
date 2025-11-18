import express from 'express';
import { 
    registerUser, 
    loginUser, 
    getProfile, 
    refreshAccessToken 
} from '../controllers/AuthController.js';
import { protect } from '../middleware/authMiddleware.js';
import { refreshAccessToken as refreshMiddleware } from '../middleware/refreshTokenMiddleware.js';

const router = express.Router();

// Public Routes
router.post('/register', registerUser); 
router.post('/login', loginUser);     
router.post('/logout', AuthController.logoutUser);
router.post('/logout-all', authenticate, AuthController.logoutAllUser);

router.post('/token', refreshMiddleware, refreshAccessToken); 

// Protected Route
router.get('/profile', protect, getProfile); 

// router.post('/logout', protect, logoutUser); 

export default router;