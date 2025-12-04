import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'; // สำคัญ: แก้ปัญหา jest is not defined
import { createAuthService } from '../../src/services/AuthService.js';
import { AppError } from '../../src/middleware/errorHandler.js';

describe('AuthService (Complete Coverage)', () => {
  let service, mockUser, mockMember, mockToken, mockInvitation, mockInviteService;
  let mockDb, mockHasher, mockCrypto, mockMailer, mockTokenUtils, mockTransaction;

  beforeEach(() => {
    // Mock Transaction
    mockTransaction = { commit: jest.fn(), rollback: jest.fn(), finished: false };
    mockDb = { transaction: jest.fn().mockResolvedValue(mockTransaction) };

    // Mock Models
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
      findByToken: jest.fn(),
      deleteOne: jest.fn(),
      deleteAllByUser: jest.fn()
    };
    mockInvitation = { findByToken: jest.fn(), updateStatus: jest.fn() };
    
    // Mock Services & Utils
    mockInviteService = { getInvitationInfo: jest.fn() };
    mockHasher = {
      genSalt: jest.fn().mockResolvedValue('salt'),
      hash: jest.fn().mockResolvedValue('hashed'),
      compare: jest.fn().mockResolvedValue(true)
    };
    mockCrypto = { randomUUID: jest.fn().mockReturnValue('uuid') };
    mockMailer = jest.fn().mockResolvedValue(true);
    mockTokenUtils = {
      generateAccessToken: jest.fn().mockReturnValue('access-token'),
      generateRefreshToken: jest.fn().mockReturnValue('refresh-token'),
      verifyRefreshToken: jest.fn().mockReturnValue({ user_id: 'u1' })
    };

    // Create Service Instance
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
      env: {
        BCRYPT_SALT_ROUNDS: '10',
        REFRESH_TOKEN_EXPIRES_IN: '7d',
        FRONTEND_URL: 'http://fe'
      }
    });

    // Silence logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validData = {
      email: 'test@mail.com',
      password: '123456',
      name: 'John',
      surname: 'Doe',
      sex: 'M'
    };

    it('should throw 400 if missing required fields', async () => {
      await expect(service.register({})).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringMatching(/กรุณากรอก/)
      });
    });

    it('should validate invite token email match', async () => {
      mockInviteService.getInvitationInfo.mockResolvedValue({
        email: 'other@mail.com'
      });
      await expect(
        service.register({ ...validData, inviteToken: 'token' })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringMatching(/อีเมลไม่ตรง/)
      });
    });

    it('should throw 409 if user exists', async () => {
      mockUser.findByEmail.mockResolvedValue({ user_id: 'existing' });
      await expect(service.register(validData)).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringMatching(/ถูกใช้งานแล้ว/)
      });
    });

    it('should register successfully without invite', async () => {
      mockUser.findByEmail.mockResolvedValue(null);
      mockUser.create.mockResolvedValue({ user_id: 'u1', ...validData });
      
      const result = await service.register(validData);
      
      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockHasher.hash).toHaveBeenCalled();
      expect(mockUser.create).toHaveBeenCalled();
      expect(mockToken.create).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('access-token');
    });

    it('should process invite token on registration', async () => {
      mockUser.findByEmail.mockResolvedValue(null);
      mockUser.create.mockResolvedValue({ user_id: 'u1' });
      mockInviteService.getInvitationInfo.mockResolvedValue({
        email: 'test@mail.com',
        org_id: 'org1',
        role_id: 3,
        invitation_id: 'inv1'
      });
      mockInvitation.findByToken.mockResolvedValue({
        invitation_id: 'inv1',
        status: 'pending'
      });

      const result = await service.register({
        ...validData,
        inviteToken: 'valid-token'
      });

      expect(mockMember.create).toHaveBeenCalled();
      expect(mockInvitation.updateStatus).toHaveBeenCalledWith(
        'inv1',
        'accepted',
        mockTransaction
      );
      expect(result.org_id).toBe('org1');
    });

    it('should rollback on error', async () => {
      mockUser.findByEmail.mockResolvedValue(null);
      mockUser.create.mockRejectedValue(new Error('DB Error'));

      await expect(service.register(validData)).rejects.toThrow('DB Error');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should throw 400 if missing credentials', async () => {
      await expect(service.login()).rejects.toMatchObject({
        statusCode: 400
      });
    });

    it('should throw 401 if user not found', async () => {
      mockUser.findByEmailWithPassword.mockResolvedValue(null);
      await expect(service.login('a@b.com', '123')).rejects.toMatchObject({
        statusCode: 401
      });
    });

    it('should throw 401 if user inactive', async () => {
      mockUser.findByEmailWithPassword.mockResolvedValue({
        user_id: 'u1',
        password_hash: 'hash',
        is_active: false
      });
      await expect(service.login('a@b.com', '123')).rejects.toMatchObject({
        statusCode: 401
      });
    });

    it('should throw 401 if password invalid', async () => {
      mockUser.findByEmailWithPassword.mockResolvedValue({
        user_id: 'u1',
        password_hash: 'hash',
        is_active: true
      });
      mockHasher.compare.mockResolvedValue(false);
      await expect(service.login('a@b.com', '123')).rejects.toMatchObject({
        statusCode: 401
      });
    });

    it('should login successfully', async () => {
      mockUser.findByEmailWithPassword.mockResolvedValue({
        user_id: 'u1',
        email: 'test@test.com',
        name: 'John',
        surname: 'Doe',
        password_hash: 'hash',
        is_active: true
      });
      mockHasher.compare.mockResolvedValue(true);

      const result = await service.login('test@test.com', '123');

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(mockToken.create).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should throw 400 if token missing', async () => {
      await expect(service.refreshToken()).rejects.toMatchObject({
        statusCode: 400
      });
    });

    it('should throw 401 if token invalid', async () => {
      mockTokenUtils.verifyRefreshToken.mockReturnValue(null);
      await expect(service.refreshToken('bad-token')).rejects.toMatchObject({
        statusCode: 401
      });
    });

    it('should throw 401 if token not in database', async () => {
      mockToken.findByToken.mockResolvedValue(null);
      await expect(service.refreshToken('token')).rejects.toMatchObject({
        statusCode: 401
      });
    });

    it('should throw 404 if user not found', async () => {
      mockToken.findByToken.mockResolvedValue({ user_id: 'u1' });
      mockUser.findById.mockResolvedValue(null);
      await expect(service.refreshToken('token')).rejects.toMatchObject({
        statusCode: 404
      });
    });

    it('should throw 401 if user inactive', async () => {
      mockToken.findByToken.mockResolvedValue({ user_id: 'u1' });
      mockUser.findById.mockResolvedValue({ user_id: 'u1', is_active: false });
      await expect(service.refreshToken('token')).rejects.toMatchObject({
        statusCode: 401
      });
    });

    it('should refresh token successfully', async () => {
      mockToken.findByToken.mockResolvedValue({ user_id: 'u1' });
      mockUser.findById.mockResolvedValue({ user_id: 'u1', is_active: true });

      const result = await service.refreshToken('old-token');

      expect(mockToken.deleteOne).toHaveBeenCalledWith('old-token');
      expect(mockToken.create).toHaveBeenCalled();
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });
  });

  describe('forgotPassword', () => {
    it('should throw 400 if email missing', async () => {
      await expect(service.forgotPassword()).rejects.toMatchObject({
        statusCode: 400
      });
    });

    it('should return success even if user not found (security)', async () => {
      mockUser.findByEmail.mockResolvedValue(null);
      const result = await service.forgotPassword('nonexist@test.com');
      expect(result.success).toBe(true);
      expect(mockMailer).not.toHaveBeenCalled();
    });

    it('should send reset email if user exists', async () => {
      mockUser.findByEmail.mockResolvedValue({ user_id: 'u1', email: 'a@b.com' });
      
      const result = await service.forgotPassword('a@b.com');
      
      expect(mockUser.setResetToken).toHaveBeenCalled();
      expect(mockMailer).toHaveBeenCalledWith(
        'a@b.com',
        expect.any(String),
        expect.stringContaining('http://fe/reset-password')
      );
      expect(result.success).toBe(true);
    });
  });

  describe('verifyResetToken', () => {
    it('should throw 400 if token missing', async () => {
      await expect(service.verifyResetToken()).rejects.toMatchObject({
        statusCode: 400
      });
    });

    it('should throw 400 if token invalid', async () => {
      mockUser.findByResetToken.mockResolvedValue(null);
      await expect(service.verifyResetToken('bad')).rejects.toMatchObject({
        statusCode: 400
      });
    });

    it('should return valid true if token valid', async () => {
      mockUser.findByResetToken.mockResolvedValue({ user_id: 'u1' });
      const result = await service.verifyResetToken('valid');
      expect(result.valid).toBe(true);
    });
  });

  describe('resetPassword', () => {
    it('should throw 400 if missing fields', async () => {
      await expect(service.resetPassword()).rejects.toMatchObject({
        statusCode: 400
      });
    });

    it('should throw 400 if password too short', async () => {
      await expect(service.resetPassword('token', '123')).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringMatching(/อย่างน้อย 6/)
      });
    });

    it('should throw 400 if token invalid', async () => {
      mockUser.findByResetToken.mockResolvedValue(null);
      await expect(service.resetPassword('bad', '123456')).rejects.toMatchObject({
        statusCode: 400
      });
    });

    it('should reset password successfully', async () => {
      mockUser.findByResetToken.mockResolvedValue({ user_id: 'u1' });
      
      const result = await service.resetPassword('token', '123456');
      
      expect(mockHasher.hash).toHaveBeenCalled();
      expect(mockUser.updatePassword).toHaveBeenCalledWith('u1', 'hashed');
      expect(result.success).toBe(true);
    });
  });

  describe('changeEmail', () => {
    it('should throw 404 if user not found', async () => {
      mockUser.findById.mockResolvedValue(null);
      await expect(
        service.changeEmail('u1', 'new@test.com', 'pass')
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 401 if password wrong', async () => {
      mockUser.findById.mockResolvedValue({ user_id: 'u1', email: 'old@test.com' });
      mockUser.findByEmailWithPassword.mockResolvedValue({ password_hash: 'hash' });
      mockHasher.compare.mockResolvedValue(false);
      
      await expect(
        service.changeEmail('u1', 'new@test.com', 'wrong')
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('should throw 409 if new email exists', async () => {
      mockUser.findById.mockResolvedValue({ user_id: 'u1', email: 'old@test.com' });
      mockUser.findByEmailWithPassword.mockResolvedValue({ password_hash: 'hash' });
      mockHasher.compare.mockResolvedValue(true);
      mockUser.findByEmail.mockResolvedValue({ user_id: 'u2' });
      
      await expect(
        service.changeEmail('u1', 'taken@test.com', 'pass')
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('should change email successfully', async () => {
      mockUser.findById.mockResolvedValue({ user_id: 'u1', email: 'old@test.com' });
      mockUser.findByEmailWithPassword.mockResolvedValue({ password_hash: 'hash' });
      mockHasher.compare.mockResolvedValue(true);
      mockUser.findByEmail.mockResolvedValue(null);
      
      const result = await service.changeEmail('u1', 'new@test.com', 'pass');
      
      expect(mockUser.updateEmail).toHaveBeenCalledWith('u1', 'new@test.com');
      expect(result.email).toBe('new@test.com');
    });
  });

  describe('changePassword', () => {
    it('should throw 404 if user not found', async () => {
      mockUser.findById.mockResolvedValue(null);
      await expect(
        service.changePassword('u1', 'old', 'new')
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 401 if old password wrong', async () => {
      mockUser.findById.mockResolvedValue({ user_id: 'u1', email: 'a@b.com' });
      mockUser.findByEmailWithPassword.mockResolvedValue({ password_hash: 'hash' });
      mockHasher.compare.mockResolvedValue(false);
      
      await expect(
        service.changePassword('u1', 'old', 'new123456')
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('should change password successfully', async () => {
      mockUser.findById.mockResolvedValue({ user_id: 'u1', email: 'a@b.com' });
      mockUser.findByEmailWithPassword.mockResolvedValue({ password_hash: 'hash' });
      mockHasher.compare.mockResolvedValue(true);

      const result = await service.changePassword('u1', 'old123', 'new123456');

      expect(mockHasher.hash).toHaveBeenCalledWith('new123456');
      expect(mockUser.updatePassword).toHaveBeenCalledWith('u1', 'hashed');
      expect(result.success).toBe(true);
    });
  });

  describe('updateProfile', () => {
    it('should throw 404 if user not found', async () => {
      mockUser.findById.mockResolvedValue(null);
      await expect(service.updateProfile('u1', { name: 'New' })).rejects.toMatchObject({
        statusCode: 404
      });
    });

    it('should update profile successfully', async () => {
      mockUser.findById.mockResolvedValue({ user_id: 'u1' });
      const updateData = { name: 'New Name', surname: 'New Surname' };
      
      const result = await service.updateProfile('u1', updateData);
      
      expect(mockUser.updateProfile).toHaveBeenCalledWith('u1', updateData);
      expect(result.success).toBe(true);
    });
  });

  describe('logout', () => {
    it('should call deleteOne with the provided token', async () => {
      await service.logout('some-refresh-token');
      expect(mockToken.deleteOne).toHaveBeenCalledWith('some-refresh-token');
    });

    it('should succeed even if token delete fails (idempotent)', async () => {
      mockToken.deleteOne.mockRejectedValue(new Error('Token not found'));
      // Should not throw
      await service.logout('token');
      expect(mockToken.deleteOne).toHaveBeenCalled();
    });
  });

});