// test/services/InvitationService.coverage.test.js
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createInvitationService } from '../../src/services/InvitationService.js';

describe('InvitationService (100% Coverage)', () => {
  let service;
  let mockUser, mockMember, mockOrg, mockInvitation;
  let mockDb, mockMailer, mockJwt;
  let mockTransaction;

  beforeEach(() => {
    // 1. Mock DB
    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
      finished: false
    };
    mockDb = {
      transaction: jest.fn().mockResolvedValue(mockTransaction)
    };

    // 2. Mock Models
    mockUser = { findByEmail: jest.fn() };
    mockMember = { exists: jest.fn(), findByUser: jest.fn(), create: jest.fn() };
    mockOrg = { findById: jest.fn(), isOwner: jest.fn() };
    mockInvitation = {
      findByEmail: jest.fn(),
      updateStatus: jest.fn(),
      create: jest.fn(),
      findByToken: jest.fn(),
      findPendingByOrg: jest.fn(),
      expireOldInvitations: jest.fn()
    };

    // 3. Mock Utilities
    mockMailer = jest.fn().mockResolvedValue(true);
    mockJwt = {
      sign: jest.fn().mockReturnValue('jwt-token'),
      verify: jest.fn().mockReturnValue({ email: 'test@mail.com' })
    };

    // 4. Create Service
    service = createInvitationService({
      UserModel: mockUser,
      MemberModel: mockMember,
      OrganizationModel: mockOrg,
      InvitationModel: mockInvitation,
      sequelize: mockDb,
      sendEmail: mockMailer,
      jwt: mockJwt,
      env: { FRONTEND_URL: 'http://fe' },
      INVITE_SECRET: 'secret'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- Token Utils ---
  describe('Token Utils', () => {
    it('generateInviteToken', () => {
      const token = service.generateInviteToken({});
      expect(token).toBe('jwt-token');
      expect(mockJwt.sign).toHaveBeenCalled();
    });

    it('verifyInviteToken (valid)', () => {
      const res = service.verifyInviteToken('token');
      expect(res).toEqual({ email: 'test@mail.com' });
    });

    it('verifyInviteToken (invalid)', () => {
      mockJwt.verify.mockImplementation(() => { throw new Error('Invalid'); });
      const res = service.verifyInviteToken('bad');
      expect(res).toBeNull();
    });
  });

  // --- sendInvitation ---
  describe('sendInvitation', () => {
    const validData = ['a@b.com', 'o1', '1', 'u1'];

    it('should throw if missing data', async () => {
      await expect(service.sendInvitation()).rejects.toThrow('กรุณากรอกข้อมูลให้ครบถ้วน');
    });

    it('should throw if user already member', async () => {
      mockUser.findByEmail.mockResolvedValue({ user_id: 'u2' });
      mockMember.exists.mockResolvedValue(true);
      await expect(service.sendInvitation(...validData)).rejects.toThrow('เป็นสมาชิกบริษัทของท่านอยู่แล้ว');
    });

    it('should throw if user employee elsewhere', async () => {
      mockUser.findByEmail.mockResolvedValue({ user_id: 'u2' });
      mockMember.exists.mockResolvedValue(false);
      mockMember.findByUser.mockResolvedValue([{ org_id: 'o2', role_id: 2 }]);
      await expect(service.sendInvitation('a@b.com', 'o1', '2', 'u1')).rejects.toThrow('เป็นสมาชิกอยู่แล้วในบริษัทอื่น');
    });

    it('should send invitation successfully', async () => {
      mockUser.findByEmail.mockResolvedValue(null);
      mockInvitation.findByEmail.mockResolvedValue([]);
      mockInvitation.create.mockResolvedValue({ invitation_id: 'iv1' });
      mockOrg.findById.mockResolvedValue({ org_name: 'Test Co' });

      const res = await service.sendInvitation(...validData);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockInvitation.create).toHaveBeenCalled();
      expect(mockMailer).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(res.success).toBe(true);
    });

    it('should cancel pending invitations before sending new one', async () => {
      mockUser.findByEmail.mockResolvedValue(null);
      mockInvitation.findByEmail.mockResolvedValue([{ invitation_id: 'old' }]);
      mockInvitation.create.mockResolvedValue({ invitation_id: 'new' });

      await service.sendInvitation(...validData);

      expect(mockInvitation.updateStatus).toHaveBeenCalledWith('old', 'cancelled', mockTransaction);
    });

    it('should rollback on error', async () => {
      mockUser.findByEmail.mockResolvedValue(null);
      mockInvitation.create.mockRejectedValue(new Error('DB Fail'));

      await expect(service.sendInvitation(...validData)).rejects.toThrow('DB Fail');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  // --- getInvitationInfo ---
  describe('getInvitationInfo', () => {
    it('should throw if invalid token', async () => {
      mockInvitation.findByToken.mockResolvedValue(null);
      await expect(service.getInvitationInfo('t')).rejects.toThrow('Invalid invitation token');
    });

    it('should throw if not pending', async () => {
      mockInvitation.findByToken.mockResolvedValue({ status: 'accepted' });
      await expect(service.getInvitationInfo('t')).rejects.toThrow('has been accepted');
    });

    it('should throw if expired', async () => {
      mockInvitation.findByToken.mockResolvedValue({ status: 'pending', expires_at: new Date(0) });
      await expect(service.getInvitationInfo('t')).rejects.toThrow('has expired');
      expect(mockInvitation.updateStatus).toHaveBeenCalledWith(undefined, 'expired');
    });

    it('should throw if JWT invalid', async () => {
      mockInvitation.findByToken.mockResolvedValue({ status: 'pending', expires_at: new Date(Date.now() + 10000) });
      mockJwt.verify.mockImplementation(() => { throw new Error(); });
      await expect(service.getInvitationInfo('t')).rejects.toThrow('Invalid invitation token signature');
    });

    it('should return info', async () => {
      mockInvitation.findByToken.mockResolvedValue({ 
        status: 'pending', expires_at: new Date(Date.now() + 10000), email: 'a', org_id: 'o1' 
      });
      mockUser.findByEmail.mockResolvedValue(null);
      mockOrg.findById.mockResolvedValue({ org_name: 'Co' });

      const res = await service.getInvitationInfo('t');
      expect(res.org_name).toBe('Co');
      expect(res.isExistingUser).toBe(false);
    });
  });

  // --- acceptInvitation ---
  describe('acceptInvitation', () => {
    it('should accept successfully', async () => {
      mockInvitation.findByToken.mockResolvedValue({ 
        status: 'pending', expires_at: new Date(Date.now() + 10000), role_id: '1', org_id: 'o1' 
      });

      const res = await service.acceptInvitation('t', 'u1');

      expect(mockMember.create).toHaveBeenCalled();
      expect(mockInvitation.updateStatus).toHaveBeenCalledWith(undefined, 'accepted', mockTransaction);
      expect(res.success).toBe(true);
    });

    it('should check employee constraints', async () => {
      mockInvitation.findByToken.mockResolvedValue({ 
        status: 'pending', expires_at: new Date(Date.now() + 10000), role_id: '2', org_id: 'o1' 
      });
      mockMember.findByUser.mockResolvedValue([{ org_id: 'o2', role_id: 2 }]);

      await expect(service.acceptInvitation('t', 'u1')).rejects.toThrow('สมาชิกอยู่แล้วในบริษัทอื่น');
    });
  });

  // --- cancelInvitation ---
  describe('cancelInvitation', () => {
    it('should cancel if invited by self', async () => {
      mockInvitation.findByToken.mockResolvedValue({ 
        status: 'pending', invited_by: 'u1', org_id: 'o1' 
      });
      mockOrg.isOwner.mockResolvedValue(false);

      const res = await service.cancelInvitation('t', 'u1');
      expect(mockInvitation.updateStatus).toHaveBeenCalledWith(undefined, 'cancelled');
      expect(res.success).toBe(true);
    });

    it('should throw if unauthorized', async () => {
      mockInvitation.findByToken.mockResolvedValue({ 
        status: 'pending', invited_by: 'u2', org_id: 'o1' 
      });
      mockOrg.isOwner.mockResolvedValue(false);

      await expect(service.cancelInvitation('t', 'u1')).rejects.toThrow('Unauthorized');
    });
  });

  // --- Other Methods ---
  describe('Other Methods', () => {
    it('resendInvitation proxies to sendInvitation', async () => {
      // Mock internal call by mocking dependencies again or just trust logic
      // Since it calls `this.sendInvitation`, we can verify side effects
      mockUser.findByEmail.mockResolvedValue(null);
      mockInvitation.findByEmail.mockResolvedValue([]);
      mockInvitation.create.mockResolvedValue({});
      
      await service.resendInvitation('a', 'o', '1', 'u');
      expect(mockMailer).toHaveBeenCalled();
    });

    it('getOrganizationInvitations', async () => {
      await service.getOrganizationInvitations('o1');
      expect(mockInvitation.findPendingByOrg).toHaveBeenCalled();
    });

    it('cleanupExpiredInvitations', async () => {
      await service.cleanupExpiredInvitations();
      expect(mockInvitation.expireOldInvitations).toHaveBeenCalled();
    });
  });
});