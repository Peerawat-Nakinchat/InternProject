/**
 * InvitationController Coverage Tests
 * Tests the REAL InvitationController using dependency injection
 * This ensures actual code execution for coverage metrics (90%+ branch coverage)
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createInvitationController } from '../../src/controllers/InvitationController.js';

describe('InvitationController (Real Coverage Tests)', () => {
  let controller;
  let mockInvitationService;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock service
    mockInvitationService = {
      sendInvitation: jest.fn(),
      getInvitationInfo: jest.fn(),
      acceptInvitation: jest.fn(),
      cancelInvitation: jest.fn(),
      resendInvitation: jest.fn(),
      getOrganizationInvitations: jest.fn()
    };

    // Create controller with mock service using dependency injection
    controller = createInvitationController(mockInvitationService);

    mockReq = {
      user: { user_id: 'user-123' },
      body: {},
      params: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('sendInvitation', () => {
    it('should send invitation successfully', async () => {
      const invitationData = { email: 'test@example.com', org_id: 'org-123', role_id: 2 };
      const result = { success: true, message: 'Invitation sent' };
      
      mockReq.body = invitationData;
      mockInvitationService.sendInvitation.mockResolvedValue(result);

      await controller.sendInvitation(mockReq, mockRes);

      expect(mockInvitationService.sendInvitation).toHaveBeenCalledWith(
        'test@example.com',
        'org-123',
        2,
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith(result);
    });

    it('should return 400 for validation errors (message contains กรุณากรอก)', async () => {
      mockReq.body = { email: '', org_id: 'org-123', role_id: 2 };
      mockInvitationService.sendInvitation.mockRejectedValue(new Error('กรุณากรอกอีเมล'));

      await controller.sendInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'กรุณากรอกอีเมล'
      });
    });

    it('should return 400 for duplicate errors (message contains อยู่แล้ว)', async () => {
      mockReq.body = { email: 'test@example.com', org_id: 'org-123', role_id: 2 };
      mockInvitationService.sendInvitation.mockRejectedValue(new Error('มีคำเชิญอยู่แล้ว'));

      await controller.sendInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'มีคำเชิญอยู่แล้ว'
      });
    });

    it('should return 500 for server errors', async () => {
      mockReq.body = { email: 'test@example.com', org_id: 'org-123', role_id: 2 };
      mockInvitationService.sendInvitation.mockRejectedValue(new Error('Database error'));

      await controller.sendInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error'
      });
    });

    it('should return default error message when error.message is empty', async () => {
      mockReq.body = { email: 'test@example.com', org_id: 'org-123', role_id: 2 };
      mockInvitationService.sendInvitation.mockRejectedValue(new Error(''));

      await controller.sendInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });
    });
  });

  describe('getInvitationInfo', () => {
    it('should get invitation info successfully', async () => {
      const info = { email: 'test@example.com', org_name: 'Test Company' };
      mockReq.params = { token: 'valid-token' };
      mockInvitationService.getInvitationInfo.mockResolvedValue(info);

      await controller.getInvitationInfo(mockReq, mockRes);

      expect(mockInvitationService.getInvitationInfo).toHaveBeenCalledWith('valid-token');
      expect(mockRes.json).toHaveBeenCalledWith(info);
    });

    it('should return 400 for Invalid token', async () => {
      mockReq.params = { token: 'invalid-token' };
      mockInvitationService.getInvitationInfo.mockRejectedValue(new Error('Invalid token'));

      await controller.getInvitationInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token'
      });
    });

    it('should return 400 for expired token', async () => {
      mockReq.params = { token: 'expired-token' };
      mockInvitationService.getInvitationInfo.mockRejectedValue(new Error('Token has expired'));

      await controller.getInvitationInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token has expired'
      });
    });

    it('should return 500 for server errors', async () => {
      mockReq.params = { token: 'valid-token' };
      mockInvitationService.getInvitationInfo.mockRejectedValue(new Error('Database error'));

      await controller.getInvitationInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error'
      });
    });

    it('should return default error message when error.message is empty', async () => {
      mockReq.params = { token: 'valid-token' };
      mockInvitationService.getInvitationInfo.mockRejectedValue(new Error(''));

      await controller.getInvitationInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation successfully', async () => {
      const result = { success: true, message: 'Invitation accepted' };
      mockReq.body = { token: 'valid-token' };
      mockInvitationService.acceptInvitation.mockResolvedValue(result);

      await controller.acceptInvitation(mockReq, mockRes);

      expect(mockInvitationService.acceptInvitation).toHaveBeenCalledWith('valid-token', 'user-123');
      expect(mockRes.json).toHaveBeenCalledWith(result);
    });

    it('should return 400 for Invalid token', async () => {
      mockReq.body = { token: 'invalid-token' };
      mockInvitationService.acceptInvitation.mockRejectedValue(new Error('Invalid token'));

      await controller.acceptInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token'
      });
    });

    it('should return 400 for expired token', async () => {
      mockReq.body = { token: 'expired-token' };
      mockInvitationService.acceptInvitation.mockRejectedValue(new Error('Token has expired'));

      await controller.acceptInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token has expired'
      });
    });

    it('should return 400 for already member (message contains อยู่แล้ว)', async () => {
      mockReq.body = { token: 'valid-token' };
      mockInvitationService.acceptInvitation.mockRejectedValue(new Error('เป็นสมาชิกอยู่แล้ว'));

      await controller.acceptInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'เป็นสมาชิกอยู่แล้ว'
      });
    });

    it('should return 500 for server errors', async () => {
      mockReq.body = { token: 'valid-token' };
      mockInvitationService.acceptInvitation.mockRejectedValue(new Error('Database error'));

      await controller.acceptInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error'
      });
    });

    it('should return default error message when error.message is empty', async () => {
      mockReq.body = { token: 'valid-token' };
      mockInvitationService.acceptInvitation.mockRejectedValue(new Error(''));

      await controller.acceptInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });
    });
  });

  describe('cancelInvitation', () => {
    it('should cancel invitation successfully', async () => {
      const result = { success: true, message: 'Invitation cancelled' };
      mockReq.body = { token: 'valid-token' };
      mockInvitationService.cancelInvitation.mockResolvedValue(result);

      await controller.cancelInvitation(mockReq, mockRes);

      expect(mockInvitationService.cancelInvitation).toHaveBeenCalledWith('valid-token', 'user-123');
      expect(mockRes.json).toHaveBeenCalledWith(result);
    });

    it('should return 500 for errors', async () => {
      mockReq.body = { token: 'valid-token' };
      mockInvitationService.cancelInvitation.mockRejectedValue(new Error('Error cancelling'));

      await controller.cancelInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error cancelling'
      });
    });

    it('should return default error message when error.message is empty', async () => {
      mockReq.body = { token: 'valid-token' };
      mockInvitationService.cancelInvitation.mockRejectedValue(new Error(''));

      await controller.cancelInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });
    });
  });

  describe('resendInvitation', () => {
    it('should resend invitation successfully', async () => {
      const result = { success: true, message: 'Invitation resent' };
      mockReq.body = { email: 'test@example.com', org_id: 'org-123', role_id: 2 };
      mockInvitationService.resendInvitation.mockResolvedValue(result);

      await controller.resendInvitation(mockReq, mockRes);

      expect(mockInvitationService.resendInvitation).toHaveBeenCalledWith(
        'test@example.com',
        'org-123',
        2
      );
      expect(mockRes.json).toHaveBeenCalledWith(result);
    });

    it('should return 400 for validation errors (message contains กรุณากรอก)', async () => {
      mockReq.body = { email: '', org_id: 'org-123', role_id: 2 };
      mockInvitationService.resendInvitation.mockRejectedValue(new Error('กรุณากรอกอีเมล'));

      await controller.resendInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'กรุณากรอกอีเมล'
      });
    });

    it('should return 400 for duplicate errors (message contains อยู่แล้ว)', async () => {
      mockReq.body = { email: 'test@example.com', org_id: 'org-123', role_id: 2 };
      mockInvitationService.resendInvitation.mockRejectedValue(new Error('มีคำเชิญอยู่แล้ว'));

      await controller.resendInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'มีคำเชิญอยู่แล้ว'
      });
    });

    it('should return 500 for server errors', async () => {
      mockReq.body = { email: 'test@example.com', org_id: 'org-123', role_id: 2 };
      mockInvitationService.resendInvitation.mockRejectedValue(new Error('Database error'));

      await controller.resendInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error'
      });
    });

    it('should return default error message when error.message is empty', async () => {
      mockReq.body = { email: 'test@example.com', org_id: 'org-123', role_id: 2 };
      mockInvitationService.resendInvitation.mockRejectedValue(new Error(''));

      await controller.resendInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });
    });
  });

  describe('getOrganizationInvitations', () => {
    it('should get organization invitations successfully', async () => {
      const invitations = [
        { email: 'test1@example.com', status: 'pending' },
        { email: 'test2@example.com', status: 'accepted' }
      ];
      mockReq.params = { org_id: 'org-123' };
      mockInvitationService.getOrganizationInvitations.mockResolvedValue(invitations);

      await controller.getOrganizationInvitations(mockReq, mockRes);

      expect(mockInvitationService.getOrganizationInvitations).toHaveBeenCalledWith('org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        invitations
      });
    });

    it('should return 500 for errors', async () => {
      mockReq.params = { org_id: 'org-123' };
      mockInvitationService.getOrganizationInvitations.mockRejectedValue(new Error('Database error'));

      await controller.getOrganizationInvitations(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error'
      });
    });

    it('should return default error message when error.message is empty', async () => {
      mockReq.params = { org_id: 'org-123' };
      mockInvitationService.getOrganizationInvitations.mockRejectedValue(new Error(''));

      await controller.getOrganizationInvitations(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });
    });
  });
});
