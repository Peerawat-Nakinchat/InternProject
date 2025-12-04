// src/routes/profileRoutes.js
import express from 'express';
import ProfileController from '../controllers/ProfileController.js';
import { uploadSingle } from '../middleware/uploadMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route - Image proxy (no auth required)
router.get('/image-proxy', ProfileController.imageProxy);

// All routes below require authentication
router.use(protect);

// GET /api/profile - Get user profile
router.get('/', ProfileController.getProfile);

// PUT /api/profile - Update user profile
router.put('/', ProfileController.updateProfile);

// POST /api/profile/upload-image - Upload profile image
router.post('/upload-image', uploadSingle('profileImage'), ProfileController.uploadProfileImage);

// DELETE /api/profile/delete-image - Delete profile image
router.delete('/delete-image', ProfileController.deleteProfileImage);

export default router;
