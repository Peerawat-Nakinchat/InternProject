// src/controllers/ProfileController.js
import UserModel from '../models/UserModel.js';
import StorageService from '../services/StorageService.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

export const createProfileController = (userModel = UserModel, storageService = StorageService) => {

  // GET /api/profile
  const getProfile = asyncHandler(async (req, res) => {
    const userId = req.user.user_id;

    const user = await userModel.findById(userId);

    if (!user) {
      throw createError.notFound('ไม่พบข้อมูลผู้ใช้');
    }

    res.json({
      success: true,
      data: user
    });
  });

  // PUT /api/profile
  const updateProfile = asyncHandler(async (req, res) => {
    const userId = req.user.user_id;
    const { name, surname, sex, user_address_1, user_address_2, user_address_3 } = req.body;

    const updateData = {
      name,
      surname,
      sex,
      user_address_1,
      user_address_2,
      user_address_3
    };

    const updatedUser = await userModel.updateProfile(userId, updateData);

    res.json({
      success: true,
      message: 'อัพเดทข้อมูลสำเร็จ',
      data: updatedUser
    });
  });

  // POST /api/profile/upload-image
  const uploadProfileImage = asyncHandler(async (req, res) => {
    const userId = req.user.user_id;

    logger.info('📤 Upload request received');
    logger.info('User ID:', userId);
    logger.info('Has file:', !!req.file);
    logger.info('Body:', req.body);

    // Check if file exists
    if (!req.file) {
      logger.error('❌ No file in request');
      throw createError.badRequest('กรุณาเลือกไฟล์รูปภาพ (field name: profileImage)');
    }

    logger.info('📄 File details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Validate file size
    if (req.file.size > 5 * 1024 * 1024) {
      throw createError.badRequest('ไฟล์มีขนาดใหญ่เกิน 5MB');
    }

    // Get current user data
    const currentUser = await userModel.findById(userId);

    // Delete old profile image if exists
    if (currentUser.profile_image_url) {
      await storageService.deleteOldProfileImage(currentUser.profile_image_url);
    }

    // Upload new image to Supabase
    const { url } = await storageService.uploadImage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      userId
    );

    // Update user profile with new image URL
    const updatedUser = await userModel.updateProfile(userId, {
      profile_image_url: url
    });

    res.json({
      success: true,
      message: 'อัพโหลดรูปภาพสำเร็จ',
      data: {
        profile_image_url: url,
        user: updatedUser
      }
    });
  });

  // DELETE /api/profile/delete-image
  const deleteProfileImage = asyncHandler(async (req, res) => {
    const userId = req.user.user_id;

    // Get current user data
    const currentUser = await userModel.findById(userId);

    if (!currentUser.profile_image_url) {
      throw createError.badRequest('ไม่มีรูปโปรไฟล์ให้ลบ');
    }

    // Delete image from Supabase
    await storageService.deleteImage(currentUser.profile_image_url);

    // Update user profile to remove image URL
    await userModel.updateProfile(userId, {
      profile_image_url: null
    });

    res.json({
      success: true,
      message: 'ลบรูปภาพสำเร็จ'
    });
  });

  // GET /api/profile/image-proxy - Proxy image from Supabase to avoid CORS
  const imageProxy = asyncHandler(async (req, res) => {
    const { url } = req.query;

    if (!url) {
      throw createError.badRequest('Missing image URL');
    }

    // Validate URL is from Supabase
    if (!url.includes('supabase')) {
      throw createError.badRequest('Invalid image URL');
    }

    try {
      // Fetch image from Supabase
      const response = await fetch(url);

      if (!response.ok) {
        throw createError.notFound('Image not found');
      }

      // Get content type
      const contentType = response.headers.get('content-type') || 'image/jpeg';

      // Set response headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 1 day

      // Pipe the image
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error) {
      logger.error('Image proxy error:', error);
      throw createError.internal('Failed to fetch image');
    }
  });

  return {
    getProfile,
    updateProfile,
    uploadProfileImage,
    deleteProfileImage,
    imageProxy
  };
};

const defaultController = createProfileController();

export const ProfileController = {
  getProfile: defaultController.getProfile,
  updateProfile: defaultController.updateProfile,
  uploadProfileImage: defaultController.uploadProfileImage,
  deleteProfileImage: defaultController.deleteProfileImage,
  imageProxy: defaultController.imageProxy
};

export default ProfileController;
