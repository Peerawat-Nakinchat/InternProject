/**
 * ProfileController Coverage Tests
 * Targets 100% Code Coverage (Refactored for Lean Controller)
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

// ✅ 1. Setup Absolute Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const profileControllerPath = path.resolve(__dirname, '../../src/controllers/ProfileController.js');
const errorHandlerPath = path.resolve(__dirname, '../../src/middleware/errorHandler.js');
const loggerPath = path.resolve(__dirname, '../../src/utils/logger.js');

// ✅ 2. Mock Modules
// Mock Logger
await jest.unstable_mockModule(loggerPath, () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
  }
}));

// Mock Error Handler
class CustomError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

await jest.unstable_mockModule(errorHandlerPath, () => ({
  asyncHandler: (fn) => fn, // Pass-through
  createError: {
    notFound: jest.fn((msg) => new CustomError(msg, 404)),
    badRequest: jest.fn((msg) => new CustomError(msg, 400)),
    internal: jest.fn((msg) => new CustomError(msg, 500)),
  }
}));

// Mock Service (เราไม่ต้อง Mock UserModel/StorageService จริงๆ เพราะเราจะ Inject Mock Service เข้าไปตรงๆ)
// แต่ถ้าไฟล์ Controller มีการ import Service เข้ามาเป็น default เราอาจต้อง mock เพื่อกัน error
const servicePath = path.resolve(__dirname, '../../src/services/StorageService.js'); 
await jest.unstable_mockModule(servicePath, () => ({
  default: {}
}));


// ✅ 3. Import Module Under Test
const { createProfileController, default: DefaultController } = await import(profileControllerPath);
const { createError } = await import(errorHandlerPath);

describe('ProfileController', () => {
  let mockProfileService;
  let controller;
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    // Prepare Mock Service (พระเอกคนใหม่)
    // เราจำลองว่า Service มีฟังก์ชันครบตามที่ Controller เรียกใช้
    mockProfileService = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      updateProfileImage: jest.fn(),
      deleteProfileImage: jest.fn(),
      fetchImageProxy: jest.fn()
    };

    // Inject Mock Service เข้าไปใน Controller
    controller = createProfileController(mockProfileService);

    // Mock Request/Response
    req = {
      user: { user_id: 'test-uid' },
      body: {},
      query: {},
      file: {},
    };

    res = {
      json: jest.fn(),
      setHeader: jest.fn(),
      send: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should use default dependencies if none provided', () => {
      // Test default parameters logic
      const defaultCtrl = createProfileController(); 
      // Note: ถ้าไม่ได้ mock file import จริงๆ บรรทัดนี้อาจจะใช้ Real Service 
      // แต่เป้าหมายคือเช็คว่า function return object ออกมาได้ไม่พัง
      expect(defaultCtrl).toBeDefined();
      expect(DefaultController).toBeDefined();
    });
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      const mockUser = { id: 'test-uid', name: 'Test User' };
      // Setup Mock: เมื่อ controller เรียก service.getProfile ให้ตอบกลับมาแบบนี้
      mockProfileService.getProfile.mockResolvedValue(mockUser);

      await controller.getProfile(req, res);

      // Assert: Controller ต้องเรียก Service ด้วย ID ที่ถูกต้อง
      expect(mockProfileService.getProfile).toHaveBeenCalledWith('test-uid');
      // Assert: Controller ต้องส่ง response กลับ
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser
      });
    });

    it('should propagate error if service fails', async () => {
      // จำลองว่า Service โยน Error ออกมา
      const error = new CustomError('Service Failed', 500);
      mockProfileService.getProfile.mockRejectedValue(error);

      // เนื่องจากเราใช้ mock asyncHandler ที่เป็น pass-through เราจึง expect promise reject ได้เลย
      await expect(controller.getProfile(req, res)).rejects.toThrow('Service Failed');
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      req.body = { name: 'New Name' };
      const mockUpdatedUser = { id: 'test-uid', name: 'New Name' };
      
      mockProfileService.updateProfile.mockResolvedValue(mockUpdatedUser);

      await controller.updateProfile(req, res);

      expect(mockProfileService.updateProfile).toHaveBeenCalledWith('test-uid', req.body);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'อัพเดทข้อมูลสำเร็จ',
        data: mockUpdatedUser
      });
    });
  });

  describe('uploadProfileImage', () => {
    // Controller ตอนนี้ทำหน้าที่แค่รับของส่งต่อ Validation พื้นฐานอาจจะอยู่ที่ Service หรือ Middleware
    // แต่ถ้า Controller ยังมีโค้ดเช็ค file อยู่ ก็ต้องเทส
    
    it('should call service to upload image', async () => {
      req.file = {
        buffer: Buffer.from('fake-image'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024
      };

      const mockResult = { 
        profile_image_url: 'new-url.jpg',
        user: { id: 'test-uid' }
      };

      mockProfileService.updateProfileImage.mockResolvedValue(mockResult);

      await controller.uploadProfileImage(req, res);

      // Assert: เช็คว่า Controller ส่ง file ให้ Service ถูกต้อง
      expect(mockProfileService.updateProfileImage).toHaveBeenCalledWith('test-uid', req.file);
      
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'อัพโหลดรูปภาพสำเร็จ',
        data: mockResult
      });
    });

    // ถ้า Logic การเช็ค file size ย้ายไป Service แล้ว เราไม่ต้องเทสละเอียดที่นี่ 
    // แต่ถ้า Controller ยังมี Logic นี้อยู่ (ตามที่ refactor กันล่าสุด เราย้ายไป Service แล้ว)
    // ดังนั้น Test นี้จะเน้นว่า "ถ้า Service โยน Error กลับมา Controller ต้องจัดการได้"
  });

  describe('deleteProfileImage', () => {
    it('should delete profile image successfully', async () => {
      mockProfileService.deleteProfileImage.mockResolvedValue(true);

      await controller.deleteProfileImage(req, res);

      expect(mockProfileService.deleteProfileImage).toHaveBeenCalledWith('test-uid');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'ลบรูปภาพสำเร็จ'
      });
    });
  });

  describe('imageProxy', () => {
    it('should proxy image successfully', async () => {
      req.query.url = 'https://supabase.co/storage/image.jpg';
      const mockBuffer = Buffer.from('image-data');
      
      // จำลองว่า Service ไป fetch มาให้แล้ว และส่ง buffer กลับมา
      mockProfileService.fetchImageProxy.mockResolvedValue({
        buffer: mockBuffer,
        contentType: 'image/jpeg'
      });

      await controller.imageProxy(req, res);

      expect(mockProfileService.fetchImageProxy).toHaveBeenCalledWith(req.query.url);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=86400');
      expect(res.send).toHaveBeenCalledWith(mockBuffer);
    });

    // Test Case: กรณี Service พัง (เช่น URL ผิด)
    it('should propagate error from service', async () => {
      req.query.url = 'invalid-url';
      mockProfileService.fetchImageProxy.mockRejectedValue(new CustomError('Invalid URL', 400));

      await expect(controller.imageProxy(req, res)).rejects.toThrow('Invalid URL');
    });
  });
});