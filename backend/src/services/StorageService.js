// src/services/StorageService.js
import supabase from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import { createError } from '../middleware/errorHandler.js';
import logger from "../utils/logger.js";

const BUCKET_NAME = 'profile-images';

/**
 * Upload image to Supabase Storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {string} mimeType - File MIME type
 * @param {string} userId - User ID for organizing files
 * @returns {Promise<{url: string, path: string}>}
 */
export const uploadImage = async (fileBuffer, fileName, mimeType, userId) => {
  if (!supabase) {
    throw createError.serviceUnavailable('Supabase storage is not configured');
  }

  try {
    // Generate unique file path
    const fileExt = fileName.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExt}`;
    const filePath = `profiles/${userId}/${uniqueFileName}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: false
      });

    if (error) {
      logger.error('Supabase upload error:', error);
      throw createError.internal('Failed to upload image to storage');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    logger.info('📸 Supabase public URL data:', urlData);

    return {
      url: urlData.publicUrl,
      path: filePath
    };
  } catch (error) {
    logger.error('Error uploading image:', error);
    throw error;
  }
};

/**
 * Delete image from Supabase Storage
 * @param {string} filePath - File path in storage
 * @returns {Promise<boolean>}
 */
export const deleteImage = async (filePath) => {
  if (!supabase) {
    logger.warn('Supabase storage is not configured, skipping delete');
    return false;
  }

  try {
    // Extract path from URL if full URL is provided
    let pathToDelete = filePath;
    if (filePath.includes('supabase')) {
      const urlParts = filePath.split(`${BUCKET_NAME}/`);
      pathToDelete = urlParts[1] || filePath;
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([pathToDelete]);

    if (error) {
      logger.error('Supabase delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error deleting image:', error);
    return false;
  }
};

/**
 * Get public URL for an image
 * @param {string} filePath - File path in storage
 * @returns {string}
 */
export const getPublicUrl = (filePath) => {
  if (!supabase) {
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return publicUrl;
};

/**
 * Delete old profile image if exists
 * @param {string} oldImageUrl - Old image URL
 * @returns {Promise<void>}
 */
export const deleteOldProfileImage = async (oldImageUrl) => {
  if (!oldImageUrl || !oldImageUrl.includes('supabase')) {
    return;
  }

  try {
    await deleteImage(oldImageUrl);
  } catch (error) {
    logger.error('Error deleting old profile image:', error);
    // Don't throw error, just log it
  }
};


export const uploadBase64Image = async (base64String, userId) => {
  if (!base64String || !base64String.startsWith("data:image/")) return null;

  try {
    const matches = base64String.match(/^data:image\/([a-zA-Z0-9+-]+);base64,(.+)$/);
    if (!matches) throw createError.badRequest("Invalid image format");

    let imageType = matches[1] === "jpg" ? "jpeg" : matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    
    // Validate Size (5MB)
    if (buffer.length > 5 * 1024 * 1024) throw createError.badRequest("ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB");

    const fileName = `profile_${Date.now()}.${imageType}`;
    const mimeType = `image/${imageType}`;

    return await uploadImage(buffer, fileName, mimeType, userId);
  } catch (error) {
    logger.error("❌ Base64 Upload Error:", error);
    throw error;
  }
};

export const StorageService = {
  uploadImage,
  deleteImage,
  getPublicUrl,
  deleteOldProfileImage,
  uploadBase64Image
};

export default StorageService;
