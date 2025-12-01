/**
 * TokenController Coverage Tests
 * Tests the REAL TokenController using dependency injection
 * This ensures actual code execution for coverage metrics (90%+ branch coverage)
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createTokenController } from '../../src/controllers/TokenController.js';

describe('TokenController (Real Coverage Tests)', () => {
  let controller;
  let mockUserModel;
  let mockTokenGenerator;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock User model
    mockUserModel = {
      findByPk: jest.fn()
    };

    // Create mock token generator
    mockTokenGenerator = jest.fn();

    // Create controller with mock dependencies
    controller = createTokenController({
      userModel: mockUserModel,
      tokenGenerator: mockTokenGenerator
    });

    mockReq = {
      refreshUserId: 'user-123'
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('createNewAccessToken', () => {
    it('should create new access token successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@test.com' };
      mockUserModel.findByPk.mockResolvedValue(mockUser);
      mockTokenGenerator.mockReturnValue('new-access-token');

      await controller.createNewAccessToken(mockReq, mockRes);

      expect(mockUserModel.findByPk).toHaveBeenCalledWith('user-123');
      expect(mockTokenGenerator).toHaveBeenCalledWith('user-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        accessToken: 'new-access-token'
      });
    });

    it('should return 404 when user not found', async () => {
      mockUserModel.findByPk.mockResolvedValue(null);

      await controller.createNewAccessToken(mockReq, mockRes);

      expect(mockUserModel.findByPk).toHaveBeenCalledWith('user-123');
      expect(mockTokenGenerator).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'ไม่พบผู้ใช้งาน'
      });
    });

    it('should return 404 when user is undefined', async () => {
      mockUserModel.findByPk.mockResolvedValue(undefined);

      await controller.createNewAccessToken(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on database error', async () => {
      mockUserModel.findByPk.mockRejectedValue(new Error('Database error'));

      await controller.createNewAccessToken(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'เกิดข้อผิดพลาดในการออก access token ใหม่'
      });
    });

    it('should return 500 when token generator throws', async () => {
      const mockUser = { id: 'user-123' };
      mockUserModel.findByPk.mockResolvedValue(mockUser);
      mockTokenGenerator.mockImplementation(() => {
        throw new Error('Token generation failed');
      });

      await controller.createNewAccessToken(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'เกิดข้อผิดพลาดในการออก access token ใหม่'
      });
    });
  });
});
