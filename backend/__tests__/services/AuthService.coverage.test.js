// test/services/AuthService.coverage.test.js
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createAuthService } from '../../src/services/AuthService.js';

describe('AuthService (100% Coverage)', () => {
  let service;
  let mockUser, mockMember, mockToken, mockInvitation, mockInviteService;
  let mockDb, mockHasher, mockCrypto, mockMailer, mockTokenUtils;
  let mockTransaction;

  beforeEach(() => {
    // 1. Mock DB & Transaction
    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
      finished: false
    };
    mockDb = {
      transaction: jest.fn().mockResolvedValue(mockTransaction)
    };

    // 2. Mock Models
    mockUser = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      findById: jest.fn(),
      setResetToken: jest.fn(),
      findByResetToken: jest.fn(),
      updatePassword: jest.fn(),
      updateEmail: jest.fn(),
      updateProfile: jest.fn()
    };
    mockMember = { create: jest.fn() };
    mockToken = {
      create: jest.fn(),
      findOne: jest.fn(),
      deleteOne: jest.fn(),
      deleteAllByUser: jest.fn()
    };
    mockInvitation = {
      findByToken: jest.fn(),
      updateStatus: jest.fn()
    };

    // 3. Mock Utilities
    mockInviteService = { getInvitationInfo: jest.fn() };
    mockHasher = {
      genSalt: jest.fn().mockResolvedValue('salt'),
      hash: jest.fn().mockResolvedValue('hashed'),
      compare: jest.fn().mockResolvedValue(true)
    };
    mockCrypto = { randomUUID: jest.fn().mockReturnValue('uuid') };
    mockMailer = jest.fn().mockResolvedValue(true);
    mockTokenUtils = {
      generateAccessToken: jest.fn().mockReturnValue('access'),
      generateRefreshToken: jest.fn().mockReturnValue('refresh'),
      verifyRefreshToken: jest.fn().mockReturnValue({ user_id: 'u1' })
    };

    // 4. Create Service
    service = createAuthService({
      UserModel: mockUser,
      MemberModel: mockMember,
      RefreshTokenModel: mockToken,
      InvitationModel: mockInvitation,
      InvitationService: mockInviteService,
      sequelize: mockDb,
      bcrypt: mockHasher,
      crypto: mockCrypto,
      sendEmail: mockMailer,
      tokenUtils: mockTokenUtils,
      env: { BCRYPT_SALT_ROUNDS: '10', REFRESH_TOKEN_EXPIRES_IN: '7d', FRONTEND_URL: 'http://fe' }
    });

    // 5. Silence Console
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // REGISTER TESTS
  // ==========================================
  describe('register', () => {
    const validData = {
      email: 'test@mail.com', password: '123', name: 'John', surname: 'Doe', sex: 'M'
    };

    it('should throw if missing required fields', async () => {
      await expect(service.register({})).rejects.toThrow('กรุณากรอกข้อมูลที่จำเป็น');
    });

    it('should validate invite token if provided', async () => {
      mockInviteService.getInvitationInfo.mockResolvedValue({ email: 'other@mail.com' });
      await expect(service.register({ ...validData, inviteToken: 't' }))
        .rejects.toThrow('อีเมลไม่ตรงกับคำเชิญ');
    });

    it('should throw if user exists', async () => {
      mockUser.findByEmail.mockResolvedValue({ id: 1 });
      await expect(service.register(validData)).rejects.toThrow('ไม่สามารถลงทะเบียนได้');
    });

    it('should register successfully', async () => {
      mockUser.findByEmail.mockResolvedValue(null);
      mockUser.create.mockResolvedValue({ user_id: 'u1' });
      
      const result = await service.register(validData);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockHasher.hash).toHaveBeenCalled();
      expect(mockUser.create).toHaveBeenCalled();
      expect(mockToken.create).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should process invitation if valid', async () => {
      mockUser.findByEmail.mockResolvedValue(null);
      mockUser.create.mockResolvedValue({ user_id: 'u1' });
      mockInviteService.getInvitationInfo.mockResolvedValue({ 
        email: 'test@mail.com', org_id: 'o1', role_id: '1', invitation_id: 'iv1' 
      });
      mockInvitation.findByToken.mockResolvedValue({ status: 'pending' });

      const result = await service.register({ ...validData, inviteToken: 't' });

      expect(mockMember.create).toHaveBeenCalled();
      expect(result.org_id).toBe('o1');
    });

    it('should rollback on error', async () => {
      mockUser.findByEmail.mockResolvedValue(null);
      mockUser.create.mockRejectedValue(new Error('DB Fail'));

      await expect(service.register(validData)).rejects.toThrow('DB Fail');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  // ==========================================
  // LOGIN TESTS
  // ==========================================
  describe('login', () => {
    it('should throw if missing credentials', async () => {
      await expect(service.login()).rejects.toThrow('กรุณากรอกอีเมลและรหัสผ่าน');
    });

    it('should throw if user not found or inactive', async () => {
      mockUser.findByEmailWithPassword.mockResolvedValue(null);
      await expect(service.login('a@b.com', '123')).rejects.toThrow('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    });

    it('should throw if password mismatch', async () => {
      mockUser.findByEmailWithPassword.mockResolvedValue({ password_hash: 'hash', is_active: true });
      mockHasher.compare.mockResolvedValue(false);
      await expect(service.login('a@b.com', '123')).rejects.toThrow('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    });

    it('should login successfully', async () => {
      mockUser.findByEmailWithPassword.mockResolvedValue({ 
        user_id: 'u1', password_hash: 'hash', is_active: true, email: 'a' 
      });
      
      const result = await service.login('a@b.com', '123');
      expect(result.accessToken).toBe('access');
      expect(result.refreshToken).toBe('refresh');
    });
  });

  // ==========================================
  // REFRESH TOKEN TESTS
  // ==========================================
  describe('refreshToken', () => {
    it('should throw if token missing', async () => {
      await expect(service.refreshToken()).rejects.toThrow('Refresh token is required');
    });

    it('should throw if token invalid', async () => {
      mockTokenUtils.verifyRefreshToken.mockReturnValue(null);
      await expect(service.refreshToken('t')).rejects.toThrow('Invalid refresh token');
    });

    it('should throw if user not found', async () => {
      mockToken.findOne.mockResolvedValue({ user_id: 'u1' });
      mockUser.findById.mockResolvedValue(null);
      await expect(service.refreshToken('t')).rejects.toThrow('User not found');
    });

    it('should succeed and rotate token', async () => {
      mockToken.findOne.mockResolvedValue({ user_id: 'u1' });
      mockUser.findById.mockResolvedValue({ user_id: 'u1', is_active: true });

      const result = await service.refreshToken('t');
      expect(mockToken.deleteOne).toHaveBeenCalled();
      expect(mockToken.create).toHaveBeenCalled();
      expect(result.accessToken).toBe('access');
    });
  });

  // ==========================================
  // PASSWORD RESET TESTS
  // ==========================================
  describe('forgotPassword', () => {
    it('should return success even if user not found', async () => {
      mockUser.findByEmail.mockResolvedValue(null);
      const res = await service.forgotPassword('a@b.com');
      expect(res.success).toBe(true);
    });

    it('should send email if user found', async () => {
      mockUser.findByEmail.mockResolvedValue({ user_id: 'u1' });
      await service.forgotPassword('a@b.com');
      expect(mockUser.setResetToken).toHaveBeenCalled();
      expect(mockMailer).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should throw if password too short', async () => {
      await expect(service.resetPassword('t', '123')).rejects.toThrow('6 ตัวอักษร');
    });

    it('should reset password successfully', async () => {
      mockUser.findByResetToken.mockResolvedValue({ user_id: 'u1' });
      const res = await service.resetPassword('t', '123456');
      expect(mockUser.updatePassword).toHaveBeenCalled();
      expect(res.success).toBe(true);
    });
  });

  // ==========================================
  // PROFILE & SETTINGS TESTS
  // ==========================================
  describe('changePassword', () => {
    it('should throw if old password wrong', async () => {
      mockUser.findById.mockResolvedValue({ email: 'a' });
      mockUser.findByEmailWithPassword.mockResolvedValue({ password_hash: 'h' });
      mockHasher.compare.mockResolvedValue(false);

      await expect(service.changePassword('u1', 'old', 'new')).rejects.toThrow('รหัสผ่านเดิมไม่ถูกต้อง');
    });

    it('should change password successfully', async () => {
      mockUser.findById.mockResolvedValue({ email: 'a' });
      mockUser.findByEmailWithPassword.mockResolvedValue({ password_hash: 'h' });
      mockHasher.compare.mockResolvedValue(true);

      const res = await service.changePassword('u1', 'old', 'new');
      expect(mockUser.updatePassword).toHaveBeenCalled();
      expect(mockToken.deleteAllByUser).toHaveBeenCalled();
      expect(res.success).toBe(true);
    });
  });

  describe('updateProfile', () => {
    it('should throw if name is empty', async () => {
      await expect(service.updateProfile('u1', { name: '' })).rejects.toThrow('ชื่อต้องไม่เป็นค่าว่าง');
    });

    it('should update profile', async () => {
      mockUser.findById.mockResolvedValue({ name: 'Old' });
      await service.updateProfile('u1', { name: 'New' });
      expect(mockUser.updateProfile).toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return sanitized profile', async () => {
      mockUser.findById.mockResolvedValue({ 
        toJSON: () => ({ password_hash: 'secret', name: 'John' })
      });
      const profile = await service.getProfile('u1');
      expect(profile.password_hash).toBeUndefined();
      expect(profile.name).toBe('John');
    });
  });

  // ==========================================
  // OAUTH TESTS
  // ==========================================
  describe('googleAuthCallback', () => {
    it('should generate tokens', async () => {
      const res = await service.googleAuthCallback({ user_id: 'u1' });
      expect(res.accessToken).toBe('access');
      expect(res.refreshToken).toBe('refresh');
      expect(mockToken.create).toHaveBeenCalled();
    });
  });
});