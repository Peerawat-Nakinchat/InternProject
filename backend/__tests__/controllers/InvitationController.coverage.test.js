import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createInvitationController } from '../../src/controllers/InvitationController.js';

describe('InvitationController (Refactored)', () => {
  let controller;
  let mockInvitationService;
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockInvitationService = {
      sendInvitation: jest.fn(),
      getInvitationInfo: jest.fn(),
      acceptInvitation: jest.fn(),
      cancelInvitation: jest.fn(),
      resendInvitation: jest.fn(),
      getOrganizationInvitations: jest.fn()
    };
    controller = createInvitationController(mockInvitationService);
    mockReq = {
      user: { user_id: 'user-123' },
      body: {},
      params: {}, // Will set in tests
      query: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  describe('sendInvitation', () => {
    it('should call next() with error', async () => {
      const error = new Error('Validation error');
      // ✅ Fix: Body ครบ
      mockReq.body = { email: 'test@example.com', org_id: 'org-1', role_id: 2 };
      mockInvitationService.sendInvitation.mockRejectedValue(error);

      await controller.sendInvitation(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getInvitationInfo', () => {
    it('should call next() with error when token invalid', async () => {
      const error = new Error('Invalid token');
      mockReq.params = { token: 'invalid-token' }; // ✅ Fix: params
      mockInvitationService.getInvitationInfo.mockRejectedValue(error);

      await controller.getInvitationInfo(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('acceptInvitation', () => {
    it('should call next() on error', async () => {
      const error = new Error('Expired');
      mockReq.body = { token: 'expired-token' }; // ✅ Fix: body or params depending on impl
      mockInvitationService.acceptInvitation.mockRejectedValue(error);

      await controller.acceptInvitation(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});