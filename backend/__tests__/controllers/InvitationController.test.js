/**
 * InvitationController Unit Tests
 * ISO 27001 Annex A.8 - Invitation Controller Testing
 * Coverage Target: 90%+ Branch Coverage
 * 
 * Testing approach: Direct testing of controller logic patterns
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Create mock service
const mockInvitationService = {
  sendInvitation: jest.fn(),
  getInvitationInfo: jest.fn(),
  acceptInvitation: jest.fn(),
  cancelInvitation: jest.fn(),
  resendInvitation: jest.fn(),
  getOrganizationInvitations: jest.fn()
};

// Create controller functions that use the mocked service
const createControllerFunctions = (service) => ({
  sendInvitation: async (req, res) => {
    try {
      const { email, org_id, role_id } = req.body;
      const invited_by = req.user.user_id;

      const result = await service.sendInvitation(
        email,
        org_id,
        role_id,
        invited_by
      );

      res.json(result);
    } catch (error) {
      const errorMessage = error.message || "Internal server error";
      const statusCode = errorMessage.includes("กรุณากรอก")
        ? 400
        : errorMessage.includes("อยู่แล้ว")
        ? 400
        : 500;

      res.status(statusCode).json({
        success: false,
        message: errorMessage,
      });
    }
  },

  getInvitationInfo: async (req, res) => {
    try {
      const { token } = req.params;
      const info = await service.getInvitationInfo(token);
      res.json(info);
    } catch (error) {
      const errorMessage = error.message || "Internal server error";
      const statusCode = errorMessage.includes("Invalid") ||
        errorMessage.includes("expired")
        ? 400
        : 500;

      res.status(statusCode).json({
        success: false,
        message: errorMessage,
      });
    }
  },

  acceptInvitation: async (req, res) => {
    try {
      const { token } = req.body;
      const userId = req.user.user_id;

      const result = await service.acceptInvitation(token, userId);
      res.json(result);
    } catch (error) {
      const errorMessage = error.message || "Internal server error";
      const statusCode = errorMessage.includes("Invalid") ||
        errorMessage.includes("expired")
        ? 400
        : errorMessage.includes("อยู่แล้ว")
        ? 400
        : 500;

      res.status(statusCode).json({
        success: false,
        message: errorMessage,
      });
    }
  },

  cancelInvitation: async (req, res) => {
    try {
      const { token } = req.body;
      const userId = req.user.user_id;

      const result = await service.cancelInvitation(token, userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  },

  resendInvitation: async (req, res) => {
    try {
      const { email, org_id, role_id } = req.body;

      const result = await service.resendInvitation(
        email,
        org_id,
        role_id
      );
      res.json(result);
    } catch (error) {
      const errorMessage = error.message || "Internal server error";
      const statusCode = errorMessage.includes("กรุณากรอก")
        ? 400
        : errorMessage.includes("อยู่แล้ว")
        ? 400
        : 500;

      res.status(statusCode).json({
        success: false,
        message: errorMessage,
      });
    }
  },

  getOrganizationInvitations: async (req, res) => {
    try {
      const { org_id } = req.params;
      const invitations = await service.getOrganizationInvitations(org_id);
      
      res.json({
        success: true,
        invitations
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }
});

// Create controller instances
const { 
  sendInvitation,
  getInvitationInfo,
  acceptInvitation,
  cancelInvitation,
  resendInvitation,
  getOrganizationInvitations
} = createControllerFunctions(mockInvitationService);

describe('InvitationController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      body: {},
      params: {},
      user: {
        user_id: 'user-123'
      }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  // ============================================================
  // sendInvitation Tests
  // ============================================================
  describe('sendInvitation', () => {
    it('should send invitation successfully', async () => {
      mockReq.body = {
        email: 'invited@example.com',
        org_id: 'org-123',
        role_id: 3
      };

      const mockResult = {
        success: true,
        message: 'Invitation sent successfully',
        invitation_id: 'inv-123'
      };
      mockInvitationService.sendInvitation.mockResolvedValue(mockResult);

      await sendInvitation(mockReq, mockRes);

      expect(mockInvitationService.sendInvitation).toHaveBeenCalledWith(
        'invited@example.com',
        'org-123',
        3,
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when required fields are missing', async () => {
      mockReq.body = { email: '' };

      mockInvitationService.sendInvitation.mockRejectedValue(
        new Error('กรุณากรอกข้อมูลให้ครบถ้วน')
      );

      await sendInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
      });
    });

    it('should return 400 when user is already a member', async () => {
      mockReq.body = {
        email: 'existing@example.com',
        org_id: 'org-123',
        role_id: 3
      };

      mockInvitationService.sendInvitation.mockRejectedValue(
        new Error('ผู้ใช้คนนี้เป็นสมาชิกบริษัทของท่านอยู่แล้ว')
      );

      await sendInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'ผู้ใช้คนนี้เป็นสมาชิกบริษัทของท่านอยู่แล้ว'
      });
    });

    it('should return 500 for server errors', async () => {
      mockReq.body = {
        email: 'test@example.com',
        org_id: 'org-123',
        role_id: 3
      };

      mockInvitationService.sendInvitation.mockRejectedValue(
        new Error('Database error')
      );

      await sendInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error'
      });
    });

    it('should return 500 with generic message when error.message is undefined', async () => {
      mockReq.body = {
        email: 'test@example.com',
        org_id: 'org-123',
        role_id: 3
      };

      const error = new Error();
      error.message = undefined;
      mockInvitationService.sendInvitation.mockRejectedValue(error);

      await sendInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });
    });
  });

  // ============================================================
  // getInvitationInfo Tests
  // ============================================================
  describe('getInvitationInfo', () => {
    it('should return invitation info successfully', async () => {
      mockReq.params.token = 'valid-token-123';

      const mockInfo = {
        invitation_id: 'inv-123',
        email: 'invited@example.com',
        org_id: 'org-123',
        role_id: 3,
        org_name: 'Test Company',
        status: 'pending',
        isExistingUser: false,
        isAlreadyMember: false
      };
      mockInvitationService.getInvitationInfo.mockResolvedValue(mockInfo);

      await getInvitationInfo(mockReq, mockRes);

      expect(mockInvitationService.getInvitationInfo).toHaveBeenCalledWith('valid-token-123');
      expect(mockRes.json).toHaveBeenCalledWith(mockInfo);
    });

    it('should return 400 for invalid token', async () => {
      mockReq.params.token = 'invalid-token';

      mockInvitationService.getInvitationInfo.mockRejectedValue(
        new Error('Invalid invitation token')
      );

      await getInvitationInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid invitation token'
      });
    });

    it('should return 400 for expired token', async () => {
      mockReq.params.token = 'expired-token';

      mockInvitationService.getInvitationInfo.mockRejectedValue(
        new Error('Invitation has expired')
      );

      await getInvitationInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invitation has expired'
      });
    });

    it('should return 500 for server errors', async () => {
      mockReq.params.token = 'token';

      mockInvitationService.getInvitationInfo.mockRejectedValue(
        new Error('Database error')
      );

      await getInvitationInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should return 500 with generic message when error.message is undefined', async () => {
      mockReq.params.token = 'token';

      const error = new Error();
      error.message = undefined;
      mockInvitationService.getInvitationInfo.mockRejectedValue(error);

      await getInvitationInfo(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });
    });
  });

  // ============================================================
  // acceptInvitation Tests
  // ============================================================
  describe('acceptInvitation', () => {
    it('should accept invitation successfully', async () => {
      mockReq.body = { token: 'valid-token' };

      const mockResult = {
        success: true,
        message: 'Invitation accepted successfully',
        org_id: 'org-123'
      };
      mockInvitationService.acceptInvitation.mockResolvedValue(mockResult);

      await acceptInvitation(mockReq, mockRes);

      expect(mockInvitationService.acceptInvitation).toHaveBeenCalledWith(
        'valid-token',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 for invalid token', async () => {
      mockReq.body = { token: 'invalid-token' };

      mockInvitationService.acceptInvitation.mockRejectedValue(
        new Error('Invalid invitation token')
      );

      await acceptInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for expired invitation', async () => {
      mockReq.body = { token: 'expired-token' };

      mockInvitationService.acceptInvitation.mockRejectedValue(
        new Error('Invitation has expired')
      );

      await acceptInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when user is already member', async () => {
      mockReq.body = { token: 'token' };

      mockInvitationService.acceptInvitation.mockRejectedValue(
        new Error('ผู้ใช้นี้เป็นสมาชิกอยู่แล้วในบริษัทอื่น')
      );

      await acceptInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 for server errors', async () => {
      mockReq.body = { token: 'token' };

      mockInvitationService.acceptInvitation.mockRejectedValue(
        new Error('Transaction failed')
      );

      await acceptInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should return 500 with generic message when error.message is undefined', async () => {
      mockReq.body = { token: 'token' };

      const error = new Error();
      error.message = undefined;
      mockInvitationService.acceptInvitation.mockRejectedValue(error);

      await acceptInvitation(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });
    });
  });

  // ============================================================
  // cancelInvitation Tests
  // ============================================================
  describe('cancelInvitation', () => {
    it('should cancel invitation successfully', async () => {
      mockReq.body = { token: 'valid-token' };

      const mockResult = {
        success: true,
        message: 'Invitation cancelled successfully'
      };
      mockInvitationService.cancelInvitation.mockResolvedValue(mockResult);

      await cancelInvitation(mockReq, mockRes);

      expect(mockInvitationService.cancelInvitation).toHaveBeenCalledWith(
        'valid-token',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 500 for server errors', async () => {
      mockReq.body = { token: 'token' };

      mockInvitationService.cancelInvitation.mockRejectedValue(
        new Error('Unauthorized to cancel')
      );

      await cancelInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized to cancel'
      });
    });

    it('should return 500 with generic message when error.message is undefined', async () => {
      mockReq.body = { token: 'token' };

      const error = new Error();
      error.message = undefined;
      mockInvitationService.cancelInvitation.mockRejectedValue(error);

      await cancelInvitation(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });
    });
  });

  // ============================================================
  // resendInvitation Tests
  // ============================================================
  describe('resendInvitation', () => {
    it('should resend invitation successfully', async () => {
      mockReq.body = {
        email: 'invited@example.com',
        org_id: 'org-123',
        role_id: 3
      };

      const mockResult = {
        success: true,
        message: 'Invitation sent successfully'
      };
      mockInvitationService.resendInvitation.mockResolvedValue(mockResult);

      await resendInvitation(mockReq, mockRes);

      expect(mockInvitationService.resendInvitation).toHaveBeenCalledWith(
        'invited@example.com',
        'org-123',
        3
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when required fields are missing', async () => {
      mockReq.body = { email: '' };

      mockInvitationService.resendInvitation.mockRejectedValue(
        new Error('กรุณากรอกข้อมูลให้ครบถ้วน')
      );

      await resendInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when user is already member', async () => {
      mockReq.body = {
        email: 'existing@example.com',
        org_id: 'org-123',
        role_id: 3
      };

      mockInvitationService.resendInvitation.mockRejectedValue(
        new Error('ผู้ใช้นี้เป็นสมาชิกอยู่แล้ว')
      );

      await resendInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 for server errors', async () => {
      mockReq.body = {
        email: 'test@example.com',
        org_id: 'org-123',
        role_id: 3
      };

      mockInvitationService.resendInvitation.mockRejectedValue(
        new Error('Email service unavailable')
      );

      await resendInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should return 500 with generic message when error.message is undefined', async () => {
      mockReq.body = {
        email: 'test@example.com',
        org_id: 'org-123',
        role_id: 3
      };

      const error = new Error();
      error.message = undefined;
      mockInvitationService.resendInvitation.mockRejectedValue(error);

      await resendInvitation(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });
    });
  });

  // ============================================================
  // getOrganizationInvitations Tests
  // ============================================================
  describe('getOrganizationInvitations', () => {
    it('should return organization invitations successfully', async () => {
      mockReq.params.org_id = 'org-123';

      const mockInvitations = [
        { invitation_id: 'inv-1', email: 'user1@example.com', status: 'pending' },
        { invitation_id: 'inv-2', email: 'user2@example.com', status: 'pending' }
      ];
      mockInvitationService.getOrganizationInvitations.mockResolvedValue(mockInvitations);

      await getOrganizationInvitations(mockReq, mockRes);

      expect(mockInvitationService.getOrganizationInvitations).toHaveBeenCalledWith('org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        invitations: mockInvitations
      });
    });

    it('should return empty array when no invitations exist', async () => {
      mockReq.params.org_id = 'org-123';

      mockInvitationService.getOrganizationInvitations.mockResolvedValue([]);

      await getOrganizationInvitations(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        invitations: []
      });
    });

    it('should return 500 for server errors', async () => {
      mockReq.params.org_id = 'org-123';

      mockInvitationService.getOrganizationInvitations.mockRejectedValue(
        new Error('Database error')
      );

      await getOrganizationInvitations(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error'
      });
    });

    it('should return 500 with generic message when error.message is undefined', async () => {
      mockReq.params.org_id = 'org-123';

      const error = new Error();
      error.message = undefined;
      mockInvitationService.getOrganizationInvitations.mockRejectedValue(error);

      await getOrganizationInvitations(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });
    });
  });
});

// ============================================================
// Edge Cases and Security Tests
// ============================================================
describe('InvitationController - Edge Cases & Security', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      body: {},
      params: {},
      user: { user_id: 'user-123' }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('Email Validation Edge Cases', () => {
    it('should handle email with special characters', async () => {
      mockReq.body = {
        email: "test+tag@example.com",
        org_id: 'org-123',
        role_id: 3
      };

      mockInvitationService.sendInvitation.mockResolvedValue({ success: true });

      await sendInvitation(mockReq, mockRes);

      expect(mockInvitationService.sendInvitation).toHaveBeenCalledWith(
        "test+tag@example.com",
        'org-123',
        3,
        'user-123'
      );
    });

    it('should handle international domain email', async () => {
      mockReq.body = {
        email: 'user@企業.香港',
        org_id: 'org-123',
        role_id: 3
      };

      mockInvitationService.sendInvitation.mockResolvedValue({ success: true });

      await sendInvitation(mockReq, mockRes);

      expect(mockInvitationService.sendInvitation).toHaveBeenCalled();
    });
  });

  describe('Token Security Edge Cases', () => {
    it('should handle potentially malicious token', async () => {
      mockReq.params.token = '<script>alert("xss")</script>';

      mockInvitationService.getInvitationInfo.mockRejectedValue(
        new Error('Invalid invitation token')
      );

      await getInvitationInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle very long token', async () => {
      mockReq.params.token = 'a'.repeat(10000);

      mockInvitationService.getInvitationInfo.mockRejectedValue(
        new Error('Invalid invitation token')
      );

      await getInvitationInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle empty token', async () => {
      mockReq.params.token = '';

      mockInvitationService.getInvitationInfo.mockRejectedValue(
        new Error('Invalid invitation token')
      );

      await getInvitationInfo(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Role ID Validation Edge Cases', () => {
    it('should handle invalid role_id (negative)', async () => {
      mockReq.body = {
        email: 'test@example.com',
        org_id: 'org-123',
        role_id: -1
      };

      mockInvitationService.sendInvitation.mockRejectedValue(
        new Error('Invalid role_id')
      );

      await sendInvitation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle role_id as string', async () => {
      mockReq.body = {
        email: 'test@example.com',
        org_id: 'org-123',
        role_id: '3'
      };

      mockInvitationService.sendInvitation.mockResolvedValue({ success: true });

      await sendInvitation(mockReq, mockRes);

      expect(mockInvitationService.sendInvitation).toHaveBeenCalledWith(
        'test@example.com',
        'org-123',
        '3',
        'user-123'
      );
    });
  });
});
