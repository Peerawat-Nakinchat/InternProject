// src/services/StorageService.js
import supabase from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import UserModel from '../models/UserModel.js'; 
import { createError } from '../middleware/errorHandler.js';
import logger from "../utils/logger.js";

const BUCKET_NAME = 'profile-images';

// ==========================================
// ส่วน Business Logic (จัดการ User + DB)
// ==========================================

/**
 * ดึงข้อมูลโปรไฟล์ผู้ใช้
 */
export const getProfile = async (userId) => {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw createError.notFound('ไม่พบข้อมูลผู้ใช้');
  }
  return user;
};

/**
 * อัพเดทข้อมูลข้อความ (Text Data)
 */
export const updateProfile = async (userId, updateData) => {
  const { name, surname, sex, user_address_1, user_address_2, user_address_3 } = updateData;
  
  // กรองข้อมูลเฉพาะที่อนุญาตให้อัพเดท
  const safeData = {
    name, surname, sex, user_address_1, user_address_2, user_address_3
  };

  return await UserModel.updateProfile(userId, safeData);
};

/**
 * จัดการอัพโหลดรูปภาพ (Business Logic)
 * เปลี่ยนชื่อจาก handleImageUpload -> updateProfileImage ให้ตรงกับ Controller
 */
export const updateProfileImage = async (userId, file) => {
  // 1. Validation
  if (!file) throw createError.badRequest('กรุณาเลือกไฟล์รูปภาพ');
  if (file.size > 5 * 1024 * 1024) throw createError.badRequest('ไฟล์มีขนาดใหญ่เกิน 5MB');

  // 2. Get current user
  const currentUser = await UserModel.findById(userId);

  // 3. Delete old image if exists
  if (currentUser && currentUser.profile_image_url) {
    await deleteOldProfileImage(currentUser.profile_image_url);
  }

  // 4. Upload new image
  const { url } = await uploadImage(
    file.buffer,
    file.originalname,
    file.mimetype,
    userId
  );

  // 5. Update Database
  const updatedUser = await UserModel.updateProfile(userId, {
    profile_image_url: url
  });

  return {
    profile_image_url: url,
    user: updatedUser
  };
};

/**
 * จัดการลบรูปโปรไฟล์ (Business Logic)
 * เปลี่ยนชื่อจาก handleImageDelete -> deleteProfileImage ให้ตรงกับ Controller
 */
export const deleteProfileImage = async (userId) => {
  const currentUser = await UserModel.findById(userId);

  if (!currentUser || !currentUser.profile_image_url) {
    throw createError.badRequest('ไม่มีรูปโปรไฟล์ให้ลบ');
  }

  // ลบไฟล์จริง
  await deleteImage(currentUser.profile_image_url);

  // อัพเดท Database
  await UserModel.updateProfile(userId, {
    profile_image_url: null
  });

  return true;
};


// ==========================================
// ส่วน Storage Logic (จัดการ Supabase)
// ==========================================

export const uploadImage = async (fileBuffer, fileName, mimeType, userId) => {
  if (!supabase) throw createError.serviceUnavailable('Supabase storage is not configured');

  try {
    const fileExt = fileName.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExt}`;
    const filePath = `profiles/${userId}/${uniqueFileName}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, { contentType: mimeType, upsert: false });

    if (error) {
      logger.error('❌ Supabase upload error:', error);
      throw createError.internal('Failed to upload image');
    }

    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    logger.info('✅ Image uploaded:', { path: filePath, url: data.publicUrl });

    return { url: data.publicUrl, path: filePath };
  } catch (error) {
    logger.error('Error uploading image:', error);
    throw error;
  }
};

export const deleteImage = async (filePathOrUrl) => {
  if (!supabase || !filePathOrUrl) return false;

  try {
    let pathToDelete = filePathOrUrl;
    if (filePathOrUrl.includes(BUCKET_NAME) && filePathOrUrl.includes('http')) {
      const parts = filePathOrUrl.split(`${BUCKET_NAME}/`);
      if (parts.length > 1) pathToDelete = parts[1];
    }

    const { error } = await supabase.storage.from(BUCKET_NAME).remove([pathToDelete]);
    if (error) {
      logger.error('❌ Supabase delete error:', error);
      return false;
    }
    return true;
  } catch (error) {
    logger.error('Error deleting image:', error);
    return false;
  }
};

export const deleteOldProfileImage = async (oldImageUrl) => {
  if (!oldImageUrl || !oldImageUrl.includes('supabase')) return;
  try {
    await deleteImage(oldImageUrl);
  } catch (error) {
    logger.error('Warning: Failed to delete old profile image:', error);
  }
};

export const fetchImageProxy = async (url) => {
  if (!url || !url.includes('supabase')) throw createError.badRequest('Invalid image URL');
  try {
    const response = await fetch(url);
    if (!response.ok) throw createError.notFound('Image not found');
    const buffer = await response.arrayBuffer();
    return { buffer: Buffer.from(buffer), contentType: response.headers.get('content-type') || 'image/jpeg' };
  } catch (error) {
    logger.error('Image proxy error:', error);
    throw createError.internal('Failed to fetch image');
  }
};

export const uploadBase64Image = async (base64String, userId) => {
  // หมายเหตุ: ฟังก์ชันนี้จะทำการ Upload อย่างเดียว ไม่ได้ update user profile ใน database
  // เหมาะสำหรับใช้งาน utility ทั่วไป
  if (!base64String || !base64String.startsWith("data:image/")) return null;
  try {
    const matches = base64String.match(/^data:image\/([a-zA-Z0-9+-]+);base64,(.+)$/);
    if (!matches) throw createError.badRequest("Invalid image format");
    
    let imageType = matches[1] === "jpg" ? "jpeg" : matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    if (buffer.length > 5 * 1024 * 1024) throw createError.badRequest("ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB");
    
    const fileName = `profile_${Date.now()}.${imageType}`;
    return await uploadImage(buffer, fileName, `image/${imageType}`, userId);
  } catch (error) {
    logger.error("❌ Base64 Upload Error:", error);
    throw error;
  }
};

// Export รวมทุกฟังก์ชัน (ชื่อตรงกับ Controller แล้ว)
const StorageService = {
  // Business Logic
  getProfile,
  updateProfile,
  updateProfileImage, // แก้ชื่อให้ตรง
  deleteProfileImage, // แก้ชื่อให้ตรง
  
  // Storage Utils
  uploadImage,
  deleteImage,
  deleteOldProfileImage,
  fetchImageProxy,
  uploadBase64Image
};

export default StorageService;