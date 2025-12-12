/**
 * MemberController Coverage Tests
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

// 1. Setup Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const controllerPath = path.resolve(__dirname, '../../src/controllers/MemberController.js');
const errorHandlerPath = path.resolve(__dirname, '../../src/middleware/errorHandler.js');

// 2. Mock Error Handler
class CustomError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

await jest.unstable_mockModule(errorHandlerPath, () => ({
  // Mock asyncHandler to behave like real middleware: catch error and pass to next
  asyncHandler: (fn) => async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  },
  createError: {
    badRequest: jest.fn((msg) => new CustomError(msg, 400)),
    unauthorized: jest.fn((msg) => new CustomError(msg, 401)),
  }
}));

// 3. Import Controller
const { createMemberController } = await import(controllerPath);

// Mock Service
const mockMemberService = {
  getMembers: jest.fn(),
  inviteMember: jest.fn(),
  changeMemberRole: jest.fn(),
  removeMember: jest.fn(),
  transferOwner: jest.fn()
};

describe('MemberController (Full Coverage)', () => {
  let controller;
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = createMemberController(mockMemberService);
    
    req = {
      params: { orgId: 'org-123' },
      user: { 
        user_id: 'user-1',
        current_org_id: 'org-default',
        org_role_id: 'admin'
      },
      body: {}
    };
    
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    
    next = jest.fn();
  });

  describe('listMembers', () => {
    it('should use orgId from params if provided', async () => {
      req.params.orgId = 'org-param';
      await controller.listMembers(req, res, next);
      expect(mockMemberService.getMembers).toHaveBeenCalledWith('org-param', 'admin');
    });

    it('should fallback to user.current_org_id if params missing', async () => {
      req.params.orgId = undefined;
      await controller.listMembers(req, res, next);
      expect(mockMemberService.getMembers).toHaveBeenCalledWith('org-default', 'admin');
    });

    it('should throw BadRequest if no orgId found anywhere', async () => {
      req.params.orgId = undefined;
      req.user.current_org_id = undefined;
      
      await controller.listMembers(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringMatching(/required/i),
        statusCode: 400
      }));
    });
  });

  describe('inviteMemberToCompany', () => {
    it('should invite successfully', async () => {
      req.body = { invitedUserId: 'u2', roleId: 'viewer' };
      mockMemberService.inviteMember.mockResolvedValue({ status: 'ok' });
      
      await controller.inviteMemberToCompany(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it('should handle service errors via next()', async () => {
      req.body = { invitedUserId: 'u2', roleId: 'viewer' };
      const error = new Error('Conflict');
      mockMemberService.inviteMember.mockRejectedValue(error);
      
      await controller.inviteMemberToCompany(req, res, next);
      
      // ✅ This should now pass because asyncHandler mock catches and calls next
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('changeMemberRole', () => {
    it('should change role successfully', async () => {
      req.params.memberId = 'm1';
      req.body.newRoleId = 'editor';
      await controller.changeMemberRole(req, res, next);
      expect(mockMemberService.changeMemberRole).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    it('should remove member successfully', async () => {
      req.params.memberId = 'm1';
      await controller.removeMember(req, res, next);
      expect(mockMemberService.removeMember).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('transferOwner', () => {
    it('should transfer owner successfully', async () => {
      req.body.newOwnerUserId = 'new-owner';
      await controller.transferOwner(req, res, next);
      expect(mockMemberService.transferOwner).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });
  });
});