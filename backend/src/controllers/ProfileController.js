// src/controllers/ProfileController.js
import StorageService from '../services/StorageService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const createProfileController = (profileService = StorageService) => {

  // GET /api/profile
  const getProfile = asyncHandler(async (req, res) => {
    const userId = req.user.user_id;
    const data = await profileService.getProfile(userId);

    res.json({
      success: true,
      data
    });
  });

  // PUT /api/profile
  const updateProfile = asyncHandler(async (req, res) => {
    const userId = req.user.user_id;
    const updatedUser = await profileService.updateProfile(userId, req.body);

    res.json({
      success: true,
      message: 'อัพเดทข้อมูลสำเร็จ',
      data: updatedUser
    });
  });

  // POST /api/profile/upload-image
  const uploadProfileImage = asyncHandler(async (req, res) => {
    const userId = req.user.user_id;
    const file = req.file;

    // เรียก function name ให้ตรงกับ Service
    const result = await profileService.updateProfileImage(userId, file);

    res.json({
      success: true,
      message: 'อัพโหลดรูปภาพสำเร็จ',
      data: result
    });
  });

  // DELETE /api/profile/delete-image
  const deleteProfileImage = asyncHandler(async (req, res) => {
    const userId = req.user.user_id;
    
    // เรียก function name ให้ตรงกับ Service
    await profileService.deleteProfileImage(userId);

    res.json({
      success: true,
      message: 'ลบรูปภาพสำเร็จ'
    });
  });

  // GET /api/profile/image-proxy
  const imageProxy = asyncHandler(async (req, res) => {
    const { url } = req.query;

    const { buffer, contentType } = await profileService.fetchImageProxy(url);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
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