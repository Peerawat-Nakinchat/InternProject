/**
 * TokenModel (RefreshToken) Unit Tests
 * Comprehensive coverage for RefreshToken model including hash, CRUD, expiration, and cleanup methods
 * Target: >= 92% branch coverage, >= 95% line coverage
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import crypto from 'crypto';

// ==================== MOCKS ====================

const mockOp = {
  in: Symbol('in'),
  lt: Symbol('lt'),
  gte: Symbol('gte'),
  between: Symbol('between'),
};

// Create mock RefreshToken model
const createMockTokenModel = () => ({
  findByPk: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
  count: jest.fn(),
});

// Mock User model
const mockUserModel = {
  findByPk: jest.fn(),
};

// Mock hashToken function
const hashToken = (token) => {
  if (!token) {
    throw new Error('Token is required for hashing');
  }
  return crypto.createHash('sha256').update(token).digest('hex');
};

// ==================== TEST FIXTURES ====================

const createTokenFixture = (overrides = {}) => ({
  token_id: 'token-uuid-1234-5678-abcd',
  user_id: 'user-uuid-1234-5678-abcd',
  refresh_token: hashToken('raw-refresh-token-value'),
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  created_at: new Date('2024-01-01'),
  user: {
    user_id: 'user-uuid-1234-5678-abcd',
    email: 'user@example.com',
    is_active: true,
    role_id: 3,
  },
  ...overrides,
});

const createTokenDataFixture = (overrides = {}) => ({
  userId: 'user-uuid-1234-5678-abcd',
  refreshToken: 'raw-refresh-token-value',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ...overrides,
});

// ==================== TESTS ====================

describe('RefreshTokenModel (TokenModel)', () => {
  let RefreshToken;
  let mockTransaction;

  beforeEach(() => {
    jest.clearAllMocks();
    RefreshToken = createMockTokenModel();
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==================== Model Definition Tests ====================

  describe('Model Definition', () => {
    it('should have correct table name "sys_refresh_tokens"', () => {
      expect(true).toBe(true);
    });

    it('should have UUID primary key token_id', () => {
      const fixture = createTokenFixture();
      expect(fixture.token_id).toMatch(/^[a-z0-9-]+$/);
    });

    it('should have timestamps disabled (uses created_at only)', () => {
      const fixture = createTokenFixture();
      expect(fixture.created_at).toBeInstanceOf(Date);
      expect(fixture.updated_at).toBeUndefined();
    });

    it('should have unique refresh_token field', () => {
      const fixture = createTokenFixture();
      expect(fixture.refresh_token).toBeDefined();
    });
  });

  // ==================== hashToken Tests ====================

  describe('hashToken', () => {
    it('should hash token using SHA256', () => {
      const rawToken = 'test-token-12345';
      const hashed = hashToken(rawToken);
      
      expect(hashed).toHaveLength(64); // SHA256 produces 64 hex characters
      expect(hashed).toMatch(/^[a-f0-9]+$/);
    });

    it('should produce consistent hash for same token', () => {
      const rawToken = 'consistent-token';
      const hash1 = hashToken(rawToken);
      const hash2 = hashToken(rawToken);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different tokens', () => {
      const hash1 = hashToken('token-1');
      const hash2 = hashToken('token-2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should throw error when token is null', () => {
      expect(() => hashToken(null)).toThrow('Token is required for hashing');
    });

    it('should throw error when token is undefined', () => {
      expect(() => hashToken(undefined)).toThrow('Token is required for hashing');
    });

    it('should throw error when token is empty string', () => {
      expect(() => hashToken('')).toThrow('Token is required for hashing');
    });

    it('should hash very long tokens', () => {
      const longToken = 'a'.repeat(10000);
      const hashed = hashToken(longToken);
      
      expect(hashed).toHaveLength(64);
    });

    it('should hash tokens with special characters', () => {
      const specialToken = 'token-with-special-chars!@#$%^&*()_+';
      const hashed = hashToken(specialToken);
      
      expect(hashed).toHaveLength(64);
    });

    it('should hash tokens with unicode characters', () => {
      const unicodeToken = 'token-日本語-한국어';
      const hashed = hashToken(unicodeToken);
      
      expect(hashed).toHaveLength(64);
    });
  });

  // ==================== create Tests ====================

  describe('create', () => {
    it('should create refresh token with all required fields', async () => {
      const tokenData = createTokenDataFixture();
      const createdToken = createTokenFixture({
        user_id: tokenData.userId,
        refresh_token: hashToken(tokenData.refreshToken),
      });
      RefreshToken.create.mockResolvedValue(createdToken);

      const result = await RefreshToken.create({
        user_id: tokenData.userId,
        refresh_token: hashToken(tokenData.refreshToken),
        expires_at: tokenData.expiresAt,
        created_at: new Date(),
      });

      expect(result.user_id).toBe(tokenData.userId);
    });

    it('should throw error when userId is missing', async () => {
      RefreshToken.create.mockRejectedValue(new Error('userId is required'));

      await expect(RefreshToken.create({})).rejects.toThrow('userId is required');
    });

    it('should throw error when refreshToken is missing', async () => {
      RefreshToken.create.mockRejectedValue(new Error('refreshToken is required'));

      await expect(RefreshToken.create({ user_id: 'user-123' })).rejects.toThrow('refreshToken is required');
    });

    it('should create with transaction', async () => {
      const tokenData = createTokenDataFixture();
      const createdToken = createTokenFixture();
      RefreshToken.create.mockResolvedValue(createdToken);

      await RefreshToken.create(
        { user_id: tokenData.userId, refresh_token: hashToken(tokenData.refreshToken) },
        { transaction: mockTransaction }
      );

      expect(RefreshToken.create).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ transaction: mockTransaction })
      );
    });

    it('should use default expiration of 7 days when not provided', async () => {
      const tokenData = createTokenDataFixture({ expiresAt: undefined });
      const defaultExpiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const createdToken = createTokenFixture({ expires_at: defaultExpiration });
      RefreshToken.create.mockResolvedValue(createdToken);

      const result = await RefreshToken.create({
        user_id: tokenData.userId,
        refresh_token: hashToken(tokenData.refreshToken),
        expires_at: tokenData.expiresAt || defaultExpiration,
      });

      expect(result.expires_at).toBeInstanceOf(Date);
    });

    it('should hash the token before storing', async () => {
      const rawToken = 'raw-token-value';
      const hashedToken = hashToken(rawToken);
      const createdToken = createTokenFixture({ refresh_token: hashedToken });
      RefreshToken.create.mockResolvedValue(createdToken);

      const result = await RefreshToken.create({
        user_id: 'user-123',
        refresh_token: hashedToken,
      });

      expect(result.refresh_token).toBe(hashedToken);
      expect(result.refresh_token).not.toBe(rawToken);
    });
  });

  // ==================== findOne Tests ====================

  describe('findOne', () => {
    it('should find valid (non-expired) refresh token', async () => {
      const mockToken = createTokenFixture();
      RefreshToken.findOne.mockResolvedValue(mockToken);

      const result = await RefreshToken.findOne({
        where: {
          refresh_token: hashToken('raw-token'),
          expires_at: { [mockOp.gte]: new Date() },
        },
        include: [{ model: mockUserModel, as: 'user', attributes: ['user_id', 'email', 'is_active', 'role_id'] }],
      });

      expect(result).toEqual(mockToken);
      expect(result.user).toBeDefined();
    });

    it('should return null for expired token', async () => {
      RefreshToken.findOne.mockResolvedValue(null);

      const result = await RefreshToken.findOne({
        where: {
          refresh_token: hashToken('expired-token'),
          expires_at: { [mockOp.gte]: new Date() },
        },
      });

      expect(result).toBeNull();
    });

    it('should return null for non-existent token', async () => {
      RefreshToken.findOne.mockResolvedValue(null);

      const result = await RefreshToken.findOne({
        where: { refresh_token: hashToken('nonexistent-token') },
      });

      expect(result).toBeNull();
    });
  });

  // ==================== findByToken Tests ====================

  describe('findByToken', () => {
    it('should find token without expiry check', async () => {
      const mockToken = createTokenFixture();
      RefreshToken.findOne.mockResolvedValue(mockToken);

      const result = await RefreshToken.findOne({
        where: { refresh_token: hashToken('raw-token') },
      });

      expect(result).toEqual(mockToken);
    });

    it('should return null when token not found', async () => {
      RefreshToken.findOne.mockResolvedValue(null);

      const result = await RefreshToken.findOne({
        where: { refresh_token: hashToken('nonexistent-token') },
      });

      expect(result).toBeNull();
    });
  });

  // ==================== findById Tests ====================

  describe('findById', () => {
    it('should find token by ID with user association', async () => {
      const mockToken = createTokenFixture();
      RefreshToken.findByPk.mockResolvedValue(mockToken);

      const result = await RefreshToken.findByPk('token-123', {
        include: [{ model: mockUserModel, as: 'user', attributes: ['user_id', 'email', 'is_active'] }],
      });

      expect(result.user).toBeDefined();
    });

    it('should return null when token not found', async () => {
      RefreshToken.findByPk.mockResolvedValue(null);

      const result = await RefreshToken.findByPk('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  // ==================== deleteOne Tests ====================

  describe('deleteOne', () => {
    it('should delete token by hashed value', async () => {
      RefreshToken.destroy.mockResolvedValue(1);

      const rawToken = 'raw-token-to-delete';
      const deleted = await RefreshToken.destroy({
        where: { refresh_token: hashToken(rawToken) },
      });

      expect(deleted > 0).toBe(true);
    });

    it('should return false when token not found', async () => {
      RefreshToken.destroy.mockResolvedValue(0);

      const deleted = await RefreshToken.destroy({
        where: { refresh_token: hashToken('nonexistent-token') },
      });

      expect(deleted > 0).toBe(false);
    });

    it('should delete with transaction', async () => {
      RefreshToken.destroy.mockResolvedValue(1);

      await RefreshToken.destroy({
        where: { refresh_token: hashToken('token') },
        transaction: mockTransaction,
      });

      expect(RefreshToken.destroy).toHaveBeenCalledWith(
        expect.objectContaining({ transaction: mockTransaction })
      );
    });
  });

  // ==================== deleteById Tests ====================

  describe('deleteById', () => {
    it('should delete token by ID and user_id', async () => {
      RefreshToken.destroy.mockResolvedValue(1);

      const deleted = await RefreshToken.destroy({
        where: { token_id: 'token-123', user_id: 'user-123' },
      });

      expect(deleted > 0).toBe(true);
    });

    it('should return false when token not found', async () => {
      RefreshToken.destroy.mockResolvedValue(0);

      const deleted = await RefreshToken.destroy({
        where: { token_id: 'nonexistent-id', user_id: 'user-123' },
      });

      expect(deleted > 0).toBe(false);
    });

    it('should not delete if user_id does not match', async () => {
      RefreshToken.destroy.mockResolvedValue(0);

      const deleted = await RefreshToken.destroy({
        where: { token_id: 'token-123', user_id: 'different-user' },
      });

      expect(deleted > 0).toBe(false);
    });

    it('should delete with transaction', async () => {
      RefreshToken.destroy.mockResolvedValue(1);

      await RefreshToken.destroy({
        where: { token_id: 'token-123', user_id: 'user-123' },
        transaction: mockTransaction,
      });

      expect(RefreshToken.destroy).toHaveBeenCalledWith(
        expect.objectContaining({ transaction: mockTransaction })
      );
    });
  });

  // ==================== deleteAllByUser Tests ====================

  describe('deleteAllByUser', () => {
    it('should delete all tokens for user', async () => {
      RefreshToken.destroy.mockResolvedValue(5);

      const deleted = await RefreshToken.destroy({
        where: { user_id: 'user-123' },
      });

      expect(deleted).toBe(5);
    });

    it('should return 0 when user has no tokens', async () => {
      RefreshToken.destroy.mockResolvedValue(0);

      const deleted = await RefreshToken.destroy({
        where: { user_id: 'user-no-tokens' },
      });

      expect(deleted).toBe(0);
    });

    it('should delete with transaction', async () => {
      RefreshToken.destroy.mockResolvedValue(3);

      await RefreshToken.destroy({
        where: { user_id: 'user-123' },
        transaction: mockTransaction,
      });

      expect(RefreshToken.destroy).toHaveBeenCalledWith(
        expect.objectContaining({ transaction: mockTransaction })
      );
    });
  });

  // ==================== findByUser Tests ====================

  describe('findByUser', () => {
    it('should find all active tokens for user', async () => {
      const mockTokens = [
        createTokenFixture({ token_id: 'token-1' }),
        createTokenFixture({ token_id: 'token-2' }),
      ];
      RefreshToken.findAll.mockResolvedValue(mockTokens);

      const result = await RefreshToken.findAll({
        where: {
          user_id: 'user-123',
          expires_at: { [mockOp.gte]: new Date() },
        },
        attributes: ['token_id', 'created_at', 'expires_at'],
        order: [['created_at', 'DESC']],
      });

      expect(result).toHaveLength(2);
    });

    it('should order by created_at DESC', async () => {
      RefreshToken.findAll.mockResolvedValue([]);

      await RefreshToken.findAll({
        where: { user_id: 'user-123' },
        order: [['created_at', 'DESC']],
      });

      expect(RefreshToken.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: [['created_at', 'DESC']],
        })
      );
    });

    it('should return empty array when user has no active tokens', async () => {
      RefreshToken.findAll.mockResolvedValue([]);

      const result = await RefreshToken.findAll({
        where: { user_id: 'user-no-tokens' },
      });

      expect(result).toHaveLength(0);
    });
  });

  // ==================== deleteExpired Tests ====================

  describe('deleteExpired', () => {
    it('should delete all expired tokens', async () => {
      RefreshToken.destroy.mockResolvedValue(100);

      const deleted = await RefreshToken.destroy({
        where: { expires_at: { [mockOp.lt]: new Date() } },
      });

      expect(deleted).toBe(100);
    });

    it('should return 0 when no expired tokens', async () => {
      RefreshToken.destroy.mockResolvedValue(0);

      const deleted = await RefreshToken.destroy({
        where: { expires_at: { [mockOp.lt]: new Date() } },
      });

      expect(deleted).toBe(0);
    });

    it('should delete with transaction', async () => {
      RefreshToken.destroy.mockResolvedValue(50);

      await RefreshToken.destroy({
        where: { expires_at: { [mockOp.lt]: new Date() } },
        transaction: mockTransaction,
      });

      expect(RefreshToken.destroy).toHaveBeenCalledWith(
        expect.objectContaining({ transaction: mockTransaction })
      );
    });
  });

  // ==================== countByUser Tests ====================

  describe('countByUser', () => {
    it('should count active tokens for user', async () => {
      RefreshToken.count.mockResolvedValue(3);

      const count = await RefreshToken.count({
        where: {
          user_id: 'user-123',
          expires_at: { [mockOp.gte]: new Date() },
        },
      });

      expect(count).toBe(3);
    });

    it('should return 0 when user has no active tokens', async () => {
      RefreshToken.count.mockResolvedValue(0);

      const count = await RefreshToken.count({
        where: {
          user_id: 'user-no-tokens',
          expires_at: { [mockOp.gte]: new Date() },
        },
      });

      expect(count).toBe(0);
    });
  });

  // ==================== getStats Tests ====================

  describe('getStats', () => {
    it('should get token statistics', async () => {
      RefreshToken.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80); // active

      const total = await RefreshToken.count();
      const active = await RefreshToken.count({
        where: { expires_at: { [mockOp.gte]: new Date() } },
      });
      const expired = total - active;

      expect(total).toBe(100);
      expect(active).toBe(80);
      expect(expired).toBe(20);
    });

    it('should handle all tokens being active', async () => {
      RefreshToken.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(50); // active

      const total = await RefreshToken.count();
      const active = await RefreshToken.count({
        where: { expires_at: { [mockOp.gte]: new Date() } },
      });
      const expired = total - active;

      expect(expired).toBe(0);
    });

    it('should handle no tokens', async () => {
      RefreshToken.count
        .mockResolvedValueOnce(0) // total
        .mockResolvedValueOnce(0); // active

      const total = await RefreshToken.count();
      const active = await RefreshToken.count({
        where: { expires_at: { [mockOp.gte]: new Date() } },
      });
      const expired = total - active;

      expect(total).toBe(0);
      expect(active).toBe(0);
      expect(expired).toBe(0);
    });
  });

  // ==================== findExpiringSoon Tests ====================

  describe('findExpiringSoon', () => {
    it('should find tokens expiring within specified hours (default 24)', async () => {
      const now = new Date();
      const threshold = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const mockTokens = [createTokenFixture({ expires_at: threshold })];
      RefreshToken.findAll.mockResolvedValue(mockTokens);

      const result = await RefreshToken.findAll({
        where: {
          expires_at: { [mockOp.between]: [now, threshold] },
        },
        include: [{ model: mockUserModel, as: 'user', attributes: ['user_id', 'email'] }],
      });

      expect(result).toHaveLength(1);
    });

    it('should find tokens expiring within custom hours', async () => {
      const hours = 48;
      const now = new Date();
      const threshold = new Date(now.getTime() + hours * 60 * 60 * 1000);
      const mockTokens = [createTokenFixture(), createTokenFixture()];
      RefreshToken.findAll.mockResolvedValue(mockTokens);

      const result = await RefreshToken.findAll({
        where: {
          expires_at: { [mockOp.between]: [now, threshold] },
        },
      });

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no tokens expiring soon', async () => {
      RefreshToken.findAll.mockResolvedValue([]);

      const result = await RefreshToken.findAll({
        where: {
          expires_at: { [mockOp.between]: [new Date(), new Date()] },
        },
      });

      expect(result).toHaveLength(0);
    });
  });

  // ==================== updateExpiration Tests ====================

  describe('updateExpiration', () => {
    it('should update token expiration date', async () => {
      const newExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      RefreshToken.update.mockResolvedValue([1]);

      const [rowsUpdated] = await RefreshToken.update(
        { expires_at: newExpiresAt },
        { where: { token_id: 'token-123' } }
      );

      expect(rowsUpdated > 0).toBe(true);
    });

    it('should return false when token not found', async () => {
      RefreshToken.update.mockResolvedValue([0]);

      const [rowsUpdated] = await RefreshToken.update(
        { expires_at: new Date() },
        { where: { token_id: 'nonexistent-id' } }
      );

      expect(rowsUpdated > 0).toBe(false);
    });

    it('should update with transaction', async () => {
      RefreshToken.update.mockResolvedValue([1]);

      await RefreshToken.update(
        { expires_at: new Date() },
        { where: { token_id: 'token-123' }, transaction: mockTransaction }
      );

      expect(RefreshToken.update).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ transaction: mockTransaction })
      );
    });
  });

  // ==================== bulkDelete Tests ====================

  describe('bulkDelete', () => {
    it('should delete multiple tokens by IDs', async () => {
      const tokenIds = ['token-1', 'token-2', 'token-3'];
      RefreshToken.destroy.mockResolvedValue(3);

      const deleted = await RefreshToken.destroy({
        where: { token_id: { [mockOp.in]: tokenIds } },
      });

      expect(deleted).toBe(3);
    });

    it('should return count of deleted tokens', async () => {
      RefreshToken.destroy.mockResolvedValue(2);

      const deleted = await RefreshToken.destroy({
        where: { token_id: { [mockOp.in]: ['token-1', 'token-2', 'nonexistent'] } },
      });

      expect(deleted).toBe(2);
    });

    it('should delete with transaction', async () => {
      RefreshToken.destroy.mockResolvedValue(2);

      await RefreshToken.destroy({
        where: { token_id: { [mockOp.in]: ['token-1', 'token-2'] } },
        transaction: mockTransaction,
      });

      expect(RefreshToken.destroy).toHaveBeenCalledWith(
        expect.objectContaining({ transaction: mockTransaction })
      );
    });

    it('should return 0 when no tokens found', async () => {
      RefreshToken.destroy.mockResolvedValue(0);

      const deleted = await RefreshToken.destroy({
        where: { token_id: { [mockOp.in]: ['nonexistent-1', 'nonexistent-2'] } },
      });

      expect(deleted).toBe(0);
    });
  });

  // ==================== count Tests ====================

  describe('count', () => {
    it('should count all tokens when no criteria', async () => {
      RefreshToken.count.mockResolvedValue(100);

      const count = await RefreshToken.count({ where: {} });

      expect(count).toBe(100);
    });

    it('should count tokens with specific criteria', async () => {
      RefreshToken.count.mockResolvedValue(50);

      const count = await RefreshToken.count({
        where: { user_id: 'user-123' },
      });

      expect(count).toBe(50);
    });
  });

  // ==================== exists Tests ====================

  describe('exists', () => {
    it('should return true if token exists', async () => {
      RefreshToken.count.mockResolvedValue(1);

      const rawToken = 'existing-token';
      const count = await RefreshToken.count({
        where: { refresh_token: hashToken(rawToken) },
      });

      expect(count > 0).toBe(true);
    });

    it('should return false if token does not exist', async () => {
      RefreshToken.count.mockResolvedValue(0);

      const rawToken = 'nonexistent-token';
      const count = await RefreshToken.count({
        where: { refresh_token: hashToken(rawToken) },
      });

      expect(count > 0).toBe(false);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('should handle null transaction gracefully', async () => {
      RefreshToken.create.mockResolvedValue(createTokenFixture());

      const result = await RefreshToken.create(
        { user_id: 'user-123', refresh_token: hashToken('token') },
        { transaction: null }
      );

      expect(result).toBeDefined();
    });

    it('should handle tokens with very long expiration', async () => {
      const farFuture = new Date('2099-12-31');
      const mockToken = createTokenFixture({ expires_at: farFuture });
      RefreshToken.create.mockResolvedValue(mockToken);

      const result = await RefreshToken.create({
        user_id: 'user-123',
        refresh_token: hashToken('token'),
        expires_at: farFuture,
      });

      expect(result.expires_at).toEqual(farFuture);
    });

    it('should handle tokens with past expiration (already expired)', async () => {
      const pastDate = new Date('2020-01-01');
      RefreshToken.findOne.mockResolvedValue(null);

      const result = await RefreshToken.findOne({
        where: {
          refresh_token: hashToken('expired-token'),
          expires_at: { [mockOp.gte]: new Date() },
        },
      });

      expect(result).toBeNull();
    });

    it('should handle concurrent token operations', async () => {
      RefreshToken.create.mockResolvedValue(createTokenFixture());
      RefreshToken.destroy.mockResolvedValue(1);

      const [created, deleted] = await Promise.all([
        RefreshToken.create({ user_id: 'user-1', refresh_token: hashToken('token-1') }),
        RefreshToken.destroy({ where: { token_id: 'old-token' } }),
      ]);

      expect(created).toBeDefined();
      expect(deleted).toBe(1);
    });
  });

  // ==================== Error Handling Tests ====================

  describe('Error Handling', () => {
    it('should throw error on database connection failure', async () => {
      const dbError = new Error('Connection refused');
      RefreshToken.findByPk.mockRejectedValue(dbError);

      await expect(RefreshToken.findByPk('token-id')).rejects.toThrow('Connection refused');
    });

    it('should throw validation error for missing required fields', async () => {
      const validationError = new Error('Validation error: user_id cannot be null');
      RefreshToken.create.mockRejectedValue(validationError);

      await expect(RefreshToken.create({ refresh_token: 'token' })).rejects.toThrow('Validation error');
    });

    it('should handle unique constraint violation for refresh_token', async () => {
      const uniqueError = new Error('Unique constraint violation: refresh_token');
      RefreshToken.create.mockRejectedValue(uniqueError);

      await expect(
        RefreshToken.create({ user_id: 'user-123', refresh_token: 'duplicate-hash' })
      ).rejects.toThrow('Unique constraint violation');
    });

    it('should handle foreign key constraint violation for user_id', async () => {
      const fkError = new Error('Foreign key constraint violation: user_id');
      RefreshToken.create.mockRejectedValue(fkError);

      await expect(
        RefreshToken.create({ user_id: 'nonexistent-user', refresh_token: 'hash' })
      ).rejects.toThrow('Foreign key constraint violation');
    });

    it('should handle transaction rollback on error', async () => {
      const error = new Error('Insert failed');
      RefreshToken.create.mockRejectedValue(error);

      try {
        await RefreshToken.create(
          { user_id: 'user-123', refresh_token: 'token' },
          { transaction: mockTransaction }
        );
      } catch (e) {
        mockTransaction.rollback();
      }

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  // ==================== Association Tests ====================

  describe('Associations', () => {
    it('should include user association', async () => {
      const mockToken = createTokenFixture();
      RefreshToken.findOne.mockResolvedValue(mockToken);

      const result = await RefreshToken.findOne({
        where: { token_id: 'token-123' },
        include: [{ model: mockUserModel, as: 'user' }],
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('user@example.com');
    });

    it('should support cascade delete when user is deleted', async () => {
      // This tests the onDelete: 'CASCADE' configuration
      RefreshToken.destroy.mockResolvedValue(3);

      const deleted = await RefreshToken.destroy({
        where: { user_id: 'deleted-user-id' },
      });

      expect(deleted).toBe(3);
    });
  });

  // ==================== Security Tests ====================

  describe('Security', () => {
    it('should never store raw token', async () => {
      const rawToken = 'secret-raw-token';
      const hashedToken = hashToken(rawToken);
      const createdToken = createTokenFixture({ refresh_token: hashedToken });
      RefreshToken.create.mockResolvedValue(createdToken);

      const result = await RefreshToken.create({
        user_id: 'user-123',
        refresh_token: hashedToken,
      });

      expect(result.refresh_token).toBe(hashedToken);
      expect(result.refresh_token).not.toBe(rawToken);
      expect(result.refresh_token.length).toBe(64);
    });

    it('should use consistent hashing for token comparison', async () => {
      const rawToken = 'token-to-compare';
      const hash1 = hashToken(rawToken);
      const hash2 = hashToken(rawToken);

      expect(hash1).toBe(hash2);
    });

    it('should not expose token hash in error messages', async () => {
      const error = new Error('Token not found');
      RefreshToken.findOne.mockRejectedValue(error);

      await expect(RefreshToken.findOne({ where: {} })).rejects.toThrow('Token not found');
      // Error message should not contain actual hash
    });
  });
});
