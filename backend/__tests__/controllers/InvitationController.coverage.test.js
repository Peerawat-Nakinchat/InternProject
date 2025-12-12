/**
 * InvitationController Unit Tests
 * Tests for invitation management endpoints
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

// ✅ 1. Setup Absolute Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const responseHandlerPath = path.resolve(__dirname, '../../src/utils/responseHandler.js');
const errorHandlerPath = path.resolve(__dirname, '../../src/middleware/errorHandler.js');
const invitationServicePath = path.resolve(__dirname, '../../src/services/InvitationService.js');
const invitationControllerPath = path.resolve(__dirname, '../../src/controllers/InvitationController.js');

// ✅ 2. Mock Modules
// Mock ResponseHandler
await jest.unstable_mockModule(responseHandlerPath, () => ({
  ResponseHandler: {
    success: jest.fn(),
    created: jest.fn(),
  }
}));

// Mock asyncHandler (Pass-through)
await jest.unstable_mockModule(errorHandlerPath, () => ({
  asyncHandler: (fn) => fn
}));

// Mock Default Service (สำคัญสำหรับการเทส Default Parameter)
const mockDefaultService = {
  sendInvitation: jest.fn(),
  getInvitationInfo: jest.fn(),
  acceptInvitation: jest.fn(),
  cancelInvitation: jest.fn(),
  resendInvitation: jest.fn(),
  getOrganizationInvitations: jest.fn(),
};

await jest.unstable_mockModule(invitationServicePath, () => ({
  default: mockDefaultService
}));

// ✅ 3. Import Modules
const { createInvitationController, default: DefaultController } = await import(invitationControllerPath);
const { ResponseHandler } = await import(responseHandlerPath);

describe('InvitationController', () => {
  let mockService;
  let controller;
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    // สร้าง Mock Service แยกสำหรับการเทสแบบ Dependency Injection
    mockService = {
      sendInvitation: jest.fn(),
      getInvitationInfo: jest.fn(),
      acceptInvitation: jest.fn(),
      cancelInvitation: jest.fn(),
      resendInvitation: jest.fn(),
      getOrganizationInvitations: jest.fn(),
    };

    controller = createInvitationController(mockService);

    req = {
      body: {},
      params: {},
      user: { user_id: 'test-user-id' },
      clientInfo: {
        ipAddress: '127.0.0.1',
        userAgent: 'Jest-Test-Agent'
      },
      headers: {
        'user-agent': 'Fallback-Agent'
      },
      ip: '10.0.0.1'
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn()
    };
  });

  describe('Factory Function & Default Export', () => {
    it('should use default InvitationService when no service is provided', async () => {
      // Test Coverage สำหรับบรรทัด: (service = InvitationService)
      const defaultCtrl = createInvitationController(); 
      
      // ลองเรียก method หนึ่งเพื่อดูว่ามันไปเรียก mockDefaultService หรือไม่
      req.body = { email: 'default@test.com', org_id: '1', role_id: '1' };
      await defaultCtrl.sendInvitation(req, res);

      expect(mockDefaultService.sendInvitation).toHaveBeenCalled();
    });

    it('should export a default controller instance', () => {
      // Test Coverage สำหรับบรรทัด: const InvitationController = createInvitationController();
      expect(DefaultController).toBeDefined();
      expect(DefaultController.sendInvitation).toBeDefined();
    });
  });

  describe('sendInvitation', () => {
    it('should call service.sendInvitation with correct params (Happy Path)', async () => {
      req.body = {
        email: 'test@example.com',
        org_id: 'org-123',
        role_id: 'role-admin'
      };
      const mockResult = { id: 'invitation-id' };
      mockService.sendInvitation.mockResolvedValue(mockResult);

      await controller.sendInvitation(req, res);

      expect(mockService.sendInvitation).toHaveBeenCalledWith(
        'test@example.com',
        'org-123',
        'role-admin',
        'test-user-id',
        { ip: '127.0.0.1', userAgent: 'Jest-Test-Agent' }
      );
      expect(ResponseHandler.created).toHaveBeenCalledWith(res, mockResult);
    });

    it('should use fallback IP and UserAgent when clientInfo is missing', async () => {
      // Test Branch: req.clientInfo || {} และ fallback logic
      req.clientInfo = undefined;
      req.body = { email: 'test@test.com', org_id: '1', role_id: '1' };

      await controller.sendInvitation(req, res);

      expect(mockService.sendInvitation).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        { ip: '10.0.0.1', userAgent: 'Fallback-Agent' } // คาดหวังค่าจาก req.ip และ req.headers
      );
    });

    it('should use fallback IP and UserAgent when clientInfo properties are missing', async () => {
      // Test Branch: clientInfo.ipAddress || req.ip
      req.clientInfo = {}; // clientInfo มีแต่ว่างเปล่า
      req.body = { email: 'test@test.com', org_id: '1', role_id: '1' };

      await controller.sendInvitation(req, res);

      expect(mockService.sendInvitation).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        { ip: '10.0.0.1', userAgent: 'Fallback-Agent' }
      );
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation (Happy Path)', async () => {
      req.body.token = 'accept-token';
      const mockResult = { success: true };
      mockService.acceptInvitation.mockResolvedValue(mockResult);

      await controller.acceptInvitation(req, res);

      expect(mockService.acceptInvitation).toHaveBeenCalledWith(
        'accept-token',
        'test-user-id',
        { ip: '127.0.0.1', userAgent: 'Jest-Test-Agent' }
      );
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, mockResult);
    });

    it('should use fallback IP and UserAgent when clientInfo is missing', async () => {
      // ✅ ต้องเพิ่ม Test นี้ใน function นี้ด้วย เพื่อเก็บ Branch Coverage
      req.clientInfo = undefined;
      req.body.token = 'accept-token';

      await controller.acceptInvitation(req, res);

      expect(mockService.acceptInvitation).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { ip: '10.0.0.1', userAgent: 'Fallback-Agent' }
      );
    });
  });

  describe('resendInvitation', () => {
    it('should resend invitation (Happy Path)', async () => {
      req.body = { email: 'resend@test.com', org_id: 'org-1', role_id: 'role-1' };
      const mockResult = { sent: true };
      mockService.resendInvitation.mockResolvedValue(mockResult);

      await controller.resendInvitation(req, res);

      expect(mockService.resendInvitation).toHaveBeenCalledWith(
        'resend@test.com',
        'org-1',
        'role-1',
        'test-user-id',
        { ip: '127.0.0.1', userAgent: 'Jest-Test-Agent' }
      );
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, mockResult);
    });

    it('should use fallback IP and UserAgent when clientInfo is missing', async () => {
      // ✅ ต้องเพิ่ม Test นี้ใน function นี้ด้วย เพื่อเก็บ Branch Coverage
      req.clientInfo = undefined;
      req.body = { email: 'resend@test.com', org_id: 'org-1', role_id: 'role-1' };

      await controller.resendInvitation(req, res);

      expect(mockService.resendInvitation).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        { ip: '10.0.0.1', userAgent: 'Fallback-Agent' }
      );
    });
  });

  describe('getInvitationInfo', () => {
    it('should get invitation info', async () => {
      req.params.token = 'token-123';
      const mockInfo = { email: 'test@test.com' };
      mockService.getInvitationInfo.mockResolvedValue(mockInfo);

      await controller.getInvitationInfo(req, res);

      expect(mockService.getInvitationInfo).toHaveBeenCalledWith('token-123');
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, mockInfo);
    });
  });

  describe('cancelInvitation', () => {
    it('should cancel invitation', async () => {
      req.body.token = 'cancel-token';
      const mockResult = { success: true };
      mockService.cancelInvitation.mockResolvedValue(mockResult);

      await controller.cancelInvitation(req, res);

      expect(mockService.cancelInvitation).toHaveBeenCalledWith('cancel-token', 'test-user-id');
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, mockResult);
    });
  });

  describe('getOrganizationInvitations', () => {
    it('should fetch all invitations', async () => {
      req.params.org_id = 'org-1';
      const mockList = [];
      mockService.getOrganizationInvitations.mockResolvedValue(mockList);

      await controller.getOrganizationInvitations(req, res);

      expect(mockService.getOrganizationInvitations).toHaveBeenCalledWith('org-1');
      expect(ResponseHandler.success).toHaveBeenCalledWith(res, { invitations: mockList });
    });
  });
});