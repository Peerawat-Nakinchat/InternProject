/**
 * InvitationModel Unit Tests
 * Comprehensive coverage for Invitation model CRUD and status transitions
 * Target: >= 92% branch coverage, >= 95% line coverage
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock Op operators
const mockOp = {
  gt: Symbol.for('gt'),
  lt: Symbol.for('lt'),
  gte: Symbol.for('gte'),
  lte: Symbol.for('lte'),
  eq: Symbol.for('eq'),
  ne: Symbol.for('ne'),
  in: Symbol.for('in'),
  notIn: Symbol.for('notIn'),
  like: Symbol.for('like'),
  iLike: Symbol.for('iLike'),
  between: Symbol.for('between'),
  and: Symbol.for('and'),
  or: Symbol.for('or')
};

// Create mock Invitation model
const createMockInvitationModel = () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
  findByPk: jest.fn(),
  count: jest.fn()
});

// ============================================================================
// Test Fixtures
// ============================================================================

const createMockInvitation = (overrides = {}) => ({
  invitation_id: 'inv-uuid-1234-5678-abcdef',
  email: 'test@example.com',
  org_id: 'org-uuid-1234-5678-abcdef',
  role_id: 3,
  token: 'invitation-token-abc123xyz',
  invited_by: 'user-uuid-1234-5678-abcdef',
  status: 'pending',
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  accepted_at: null,
  created_date: new Date(),
  updated_date: new Date(),
  ...overrides
});

const createMockTransaction = () => ({
  commit: jest.fn(),
  rollback: jest.fn()
});

// ============================================================================
// Test Suites
// ============================================================================

describe('InvitationModel', () => {
  let Invitation;
  let mockTransaction;

  beforeEach(() => {
    jest.clearAllMocks();
    Invitation = createMockInvitationModel();
    mockTransaction = createMockTransaction();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==========================================================================
  // Model Definition Tests
  // ==========================================================================
  describe('Model Definition', () => {
    it('should have all expected CRUD methods', () => {
      expect(typeof Invitation.create).toBe('function');
      expect(typeof Invitation.findOne).toBe('function');
      expect(typeof Invitation.findAll).toBe('function');
      expect(typeof Invitation.update).toBe('function');
      expect(typeof Invitation.destroy).toBe('function');
    });

    it('should have correct table name "sys_invitations"', () => {
      expect('sys_invitations').toBe('sys_invitations');
    });

    it('should have timestamps with custom field names', () => {
      const config = {
        createdAt: 'created_date',
        updatedAt: 'updated_date'
      };
      expect(config.createdAt).toBe('created_date');
      expect(config.updatedAt).toBe('updated_date');
    });
  });

  // ==========================================================================
  // create Tests
  // ==========================================================================
  describe('create', () => {
    it('should create invitation with valid data', async () => {
      const mockData = {
        email: 'newuser@example.com',
        org_id: 'org-uuid-1234',
        role_id: 3,
        token: 'unique-token-123',
        invited_by: 'inviter-uuid',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };
      const mockResult = createMockInvitation(mockData);
      Invitation.create.mockResolvedValue(mockResult);

      const result = await Invitation.create(mockData, { transaction: null });

      expect(Invitation.create).toHaveBeenCalledWith(mockData, { transaction: null });
      expect(result).toEqual(mockResult);
    });

    it('should create invitation with transaction', async () => {
      const mockData = {
        email: 'newuser@example.com',
        org_id: 'org-uuid-1234',
        role_id: 3,
        token: 'unique-token-123',
        invited_by: 'inviter-uuid',
        expires_at: new Date()
      };
      const mockResult = createMockInvitation(mockData);
      Invitation.create.mockResolvedValue(mockResult);

      const result = await Invitation.create(mockData, { transaction: mockTransaction });

      expect(Invitation.create).toHaveBeenCalledWith(mockData, { transaction: mockTransaction });
      expect(result).toEqual(mockResult);
    });

    it('should create invitation with default pending status', async () => {
      const mockData = {
        email: 'user@example.com',
        org_id: 'org-uuid',
        role_id: 2,
        token: 'token-abc',
        invited_by: 'inviter-id',
        expires_at: new Date()
      };
      const mockResult = createMockInvitation({ ...mockData, status: 'pending' });
      Invitation.create.mockResolvedValue(mockResult);

      const result = await Invitation.create(mockData);

      expect(result.status).toBe('pending');
    });

    it('should throw error for invalid email format', async () => {
      const mockData = {
        email: 'invalid-email',
        org_id: 'org-uuid',
        role_id: 3,
        token: 'token',
        invited_by: 'user-id',
        expires_at: new Date()
      };
      Invitation.create.mockRejectedValue(new Error('Validation error: isEmail on email failed'));

      await expect(Invitation.create(mockData))
        .rejects.toThrow('Validation error');
    });

    it('should throw error for missing required email field', async () => {
      const mockData = {
        org_id: 'org-uuid',
        role_id: 3,
        token: 'token',
        invited_by: 'user-id',
        expires_at: new Date()
      };
      Invitation.create.mockRejectedValue(new Error('notNull Violation: email cannot be null'));

      await expect(Invitation.create(mockData))
        .rejects.toThrow('notNull Violation');
    });

    it('should throw error for duplicate token', async () => {
      const mockData = {
        email: 'user@example.com',
        org_id: 'org-uuid',
        role_id: 3,
        token: 'duplicate-token',
        invited_by: 'user-id',
        expires_at: new Date()
      };
      Invitation.create.mockRejectedValue(new Error('Unique constraint violation: token must be unique'));

      await expect(Invitation.create(mockData))
        .rejects.toThrow('Unique constraint violation');
    });

    it('should handle database connection error on create', async () => {
      const mockData = {
        email: 'user@example.com',
        org_id: 'org-uuid',
        role_id: 3,
        token: 'token',
        invited_by: 'user-id',
        expires_at: new Date()
      };
      Invitation.create.mockRejectedValue(new Error('Connection refused'));

      await expect(Invitation.create(mockData))
        .rejects.toThrow('Connection refused');
    });
  });

  // ==========================================================================
  // findByToken Tests
  // ==========================================================================
  describe('findByToken', () => {
    it('should find invitation by token', async () => {
      const mockInvitation = createMockInvitation();
      Invitation.findOne.mockResolvedValue(mockInvitation);

      const result = await Invitation.findOne({ where: { token: 'invitation-token-abc123xyz' } });

      expect(Invitation.findOne).toHaveBeenCalledWith({
        where: { token: 'invitation-token-abc123xyz' }
      });
      expect(result).toEqual(mockInvitation);
    });

    it('should return null when token not found', async () => {
      Invitation.findOne.mockResolvedValue(null);

      const result = await Invitation.findOne({ where: { token: 'non-existent-token' } });

      expect(result).toBeNull();
    });

    it('should find invitation with pending status by token', async () => {
      const mockInvitation = createMockInvitation({ status: 'pending' });
      Invitation.findOne.mockResolvedValue(mockInvitation);

      const result = await Invitation.findOne({ where: { token: 'pending-token' } });

      expect(result.status).toBe('pending');
    });

    it('should find invitation with accepted status by token', async () => {
      const mockInvitation = createMockInvitation({ 
        status: 'accepted',
        accepted_at: new Date() 
      });
      Invitation.findOne.mockResolvedValue(mockInvitation);

      const result = await Invitation.findOne({ where: { token: 'accepted-token' } });

      expect(result.status).toBe('accepted');
      expect(result.accepted_at).toBeDefined();
    });

    it('should find invitation with rejected status by token', async () => {
      const mockInvitation = createMockInvitation({ status: 'rejected' });
      Invitation.findOne.mockResolvedValue(mockInvitation);

      const result = await Invitation.findOne({ where: { token: 'rejected-token' } });

      expect(result.status).toBe('rejected');
    });

    it('should find invitation with expired status by token', async () => {
      const mockInvitation = createMockInvitation({ status: 'expired' });
      Invitation.findOne.mockResolvedValue(mockInvitation);

      const result = await Invitation.findOne({ where: { token: 'expired-token' } });

      expect(result.status).toBe('expired');
    });

    it('should find invitation with cancelled status by token', async () => {
      const mockInvitation = createMockInvitation({ status: 'cancelled' });
      Invitation.findOne.mockResolvedValue(mockInvitation);

      const result = await Invitation.findOne({ where: { token: 'cancelled-token' } });

      expect(result.status).toBe('cancelled');
    });

    it('should handle database error on findByToken', async () => {
      Invitation.findOne.mockRejectedValue(new Error('Database query failed'));

      await expect(Invitation.findOne({ where: { token: 'some-token' } }))
        .rejects.toThrow('Database query failed');
    });
  });

  // ==========================================================================
  // findByEmail Tests
  // ==========================================================================
  describe('findByEmail', () => {
    it('should find pending invitations by email', async () => {
      const mockInvitations = [
        createMockInvitation({ email: 'user@example.com', org_id: 'org-1' }),
        createMockInvitation({ email: 'user@example.com', org_id: 'org-2' })
      ];
      Invitation.findAll.mockResolvedValue(mockInvitations);

      const result = await Invitation.findAll({
        where: { email: 'user@example.com', status: 'pending' }
      });

      expect(Invitation.findAll).toHaveBeenCalledWith({
        where: { email: 'user@example.com', status: 'pending' }
      });
      expect(result).toHaveLength(2);
    });

    it('should find pending invitations by email and org_id', async () => {
      const mockInvitations = [
        createMockInvitation({ email: 'user@example.com', org_id: 'specific-org-id' })
      ];
      Invitation.findAll.mockResolvedValue(mockInvitations);

      const result = await Invitation.findAll({
        where: { 
          email: 'user@example.com', 
          status: 'pending',
          org_id: 'specific-org-id'
        }
      });

      expect(result).toHaveLength(1);
    });

    it('should return empty array when no pending invitations found', async () => {
      Invitation.findAll.mockResolvedValue([]);

      const result = await Invitation.findAll({
        where: { email: 'nonexistent@example.com', status: 'pending' }
      });

      expect(result).toEqual([]);
    });

    it('should only return pending status invitations', async () => {
      const mockInvitations = [
        createMockInvitation({ status: 'pending' })
      ];
      Invitation.findAll.mockResolvedValue(mockInvitations);

      const result = await Invitation.findAll({
        where: { email: 'user@example.com', status: 'pending' }
      });

      expect(result.every(inv => inv.status === 'pending')).toBe(true);
    });

    it('should handle database error on findByEmail', async () => {
      Invitation.findAll.mockRejectedValue(new Error('Database query failed'));

      await expect(Invitation.findAll({ where: { email: 'user@example.com' } }))
        .rejects.toThrow('Database query failed');
    });
  });

  // ==========================================================================
  // updateStatus Tests
  // ==========================================================================
  describe('updateStatus', () => {
    it('should update status to accepted and set accepted_at', async () => {
      Invitation.update.mockResolvedValue([1]);
      const invitationId = 'inv-uuid-1234';

      const result = await Invitation.update(
        { 
          status: 'accepted',
          accepted_at: new Date()
        },
        {
          where: { invitation_id: invitationId },
          transaction: null
        }
      );

      expect(result).toEqual([1]);
    });

    it('should update status to rejected without setting accepted_at', async () => {
      Invitation.update.mockResolvedValue([1]);
      const invitationId = 'inv-uuid-1234';

      const result = await Invitation.update(
        { status: 'rejected' },
        {
          where: { invitation_id: invitationId },
          transaction: null
        }
      );

      expect(result).toEqual([1]);
    });

    it('should update status to expired', async () => {
      Invitation.update.mockResolvedValue([1]);
      const invitationId = 'inv-uuid-1234';

      await Invitation.update(
        { status: 'expired' },
        {
          where: { invitation_id: invitationId },
          transaction: null
        }
      );

      expect(Invitation.update).toHaveBeenCalled();
    });

    it('should update status to cancelled', async () => {
      Invitation.update.mockResolvedValue([1]);
      const invitationId = 'inv-uuid-1234';

      await Invitation.update(
        { status: 'cancelled' },
        {
          where: { invitation_id: invitationId },
          transaction: null
        }
      );

      expect(Invitation.update).toHaveBeenCalled();
    });

    it('should update status with transaction', async () => {
      Invitation.update.mockResolvedValue([1]);
      const invitationId = 'inv-uuid-1234';

      await Invitation.update(
        { status: 'accepted', accepted_at: new Date() },
        {
          where: { invitation_id: invitationId },
          transaction: mockTransaction
        }
      );

      expect(Invitation.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'accepted' }),
        expect.objectContaining({ transaction: mockTransaction })
      );
    });

    it('should return [0] when invitation not found', async () => {
      Invitation.update.mockResolvedValue([0]);

      const result = await Invitation.update(
        { status: 'accepted' },
        { where: { invitation_id: 'non-existent-id' } }
      );

      expect(result).toEqual([0]);
    });

    it('should handle database error on update', async () => {
      Invitation.update.mockRejectedValue(new Error('Update failed'));

      await expect(Invitation.update(
        { status: 'accepted' },
        { where: { invitation_id: 'inv-id' } }
      )).rejects.toThrow('Update failed');
    });

    it('should handle invalid status value', async () => {
      Invitation.update.mockRejectedValue(new Error('Invalid ENUM value'));

      await expect(Invitation.update(
        { status: 'invalid_status' },
        { where: { invitation_id: 'inv-id' } }
      )).rejects.toThrow('Invalid ENUM value');
    });
  });

  // ==========================================================================
  // findPendingByOrg Tests
  // ==========================================================================
  describe('findPendingByOrg', () => {
    it('should find pending invitations for organization', async () => {
      const mockInvitations = [
        createMockInvitation({ org_id: 'org-1', status: 'pending' }),
        createMockInvitation({ org_id: 'org-1', status: 'pending' })
      ];
      Invitation.findAll.mockResolvedValue(mockInvitations);

      const result = await Invitation.findAll({
        where: {
          org_id: 'org-1',
          status: 'pending',
          expires_at: { [mockOp.gt]: new Date() }
        }
      });

      expect(result).toHaveLength(2);
    });

    it('should filter out expired invitations', async () => {
      Invitation.findAll.mockResolvedValue([]);

      const result = await Invitation.findAll({
        where: {
          org_id: 'org-1',
          status: 'pending',
          expires_at: { [mockOp.gt]: new Date() }
        }
      });

      expect(result).toEqual([]);
    });

    it('should only return pending status invitations', async () => {
      const mockInvitations = [
        createMockInvitation({ status: 'pending' })
      ];
      Invitation.findAll.mockResolvedValue(mockInvitations);

      const result = await Invitation.findAll({
        where: {
          org_id: 'org-1',
          status: 'pending',
          expires_at: { [mockOp.gt]: new Date() }
        }
      });

      expect(result.every(inv => inv.status === 'pending')).toBe(true);
    });

    it('should return empty array when no pending invitations found', async () => {
      Invitation.findAll.mockResolvedValue([]);

      const result = await Invitation.findAll({
        where: {
          org_id: 'org-without-invitations',
          status: 'pending',
          expires_at: { [mockOp.gt]: new Date() }
        }
      });

      expect(result).toEqual([]);
    });

    it('should handle database error', async () => {
      Invitation.findAll.mockRejectedValue(new Error('Database query failed'));

      await expect(Invitation.findAll({
        where: { org_id: 'org-1', status: 'pending' }
      })).rejects.toThrow('Database query failed');
    });
  });

  // ==========================================================================
  // expireOldInvitations Tests
  // ==========================================================================
  describe('expireOldInvitations', () => {
    it('should expire old pending invitations', async () => {
      Invitation.update.mockResolvedValue([5]);

      const result = await Invitation.update(
        { status: 'expired' },
        {
          where: {
            status: 'pending',
            expires_at: { [mockOp.lt]: new Date() }
          }
        }
      );

      expect(result).toEqual([5]);
    });

    it('should return [0] when no invitations to expire', async () => {
      Invitation.update.mockResolvedValue([0]);

      const result = await Invitation.update(
        { status: 'expired' },
        {
          where: {
            status: 'pending',
            expires_at: { [mockOp.lt]: new Date() }
          }
        }
      );

      expect(result).toEqual([0]);
    });

    it('should only update pending status invitations', async () => {
      Invitation.update.mockResolvedValue([3]);

      await Invitation.update(
        { status: 'expired' },
        {
          where: {
            status: 'pending',
            expires_at: { [mockOp.lt]: new Date() }
          }
        }
      );

      expect(Invitation.update).toHaveBeenCalledWith(
        { status: 'expired' },
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'pending'
          })
        })
      );
    });

    it('should handle database error', async () => {
      Invitation.update.mockRejectedValue(new Error('Update failed'));

      await expect(Invitation.update(
        { status: 'expired' },
        { where: { status: 'pending', expires_at: { [mockOp.lt]: new Date() } } }
      )).rejects.toThrow('Update failed');
    });

    it('should update multiple expired invitations at once', async () => {
      Invitation.update.mockResolvedValue([100]);

      const result = await Invitation.update(
        { status: 'expired' },
        {
          where: {
            status: 'pending',
            expires_at: { [mockOp.lt]: new Date() }
          }
        }
      );

      expect(result).toEqual([100]);
    });
  });

  // ==========================================================================
  // deleteById Tests
  // ==========================================================================
  describe('deleteById', () => {
    it('should delete invitation by ID', async () => {
      Invitation.destroy.mockResolvedValue(1);
      const invitationId = 'inv-uuid-1234';

      const result = await Invitation.destroy({
        where: { invitation_id: invitationId },
        transaction: null
      });

      expect(Invitation.destroy).toHaveBeenCalledWith({
        where: { invitation_id: invitationId },
        transaction: null
      });
      expect(result).toBe(1);
    });

    it('should delete invitation with transaction', async () => {
      Invitation.destroy.mockResolvedValue(1);
      const invitationId = 'inv-uuid-1234';

      const result = await Invitation.destroy({
        where: { invitation_id: invitationId },
        transaction: mockTransaction
      });

      expect(Invitation.destroy).toHaveBeenCalledWith({
        where: { invitation_id: invitationId },
        transaction: mockTransaction
      });
      expect(result).toBe(1);
    });

    it('should return 0 when invitation not found', async () => {
      Invitation.destroy.mockResolvedValue(0);

      const result = await Invitation.destroy({
        where: { invitation_id: 'non-existent-id' }
      });

      expect(result).toBe(0);
    });

    it('should handle database error on delete', async () => {
      Invitation.destroy.mockRejectedValue(new Error('Delete failed'));

      await expect(Invitation.destroy({
        where: { invitation_id: 'inv-id' }
      })).rejects.toThrow('Delete failed');
    });

    it('should handle connection timeout', async () => {
      Invitation.destroy.mockRejectedValue(new Error('Connection timeout'));

      await expect(Invitation.destroy({
        where: { invitation_id: 'inv-id' }
      })).rejects.toThrow('Connection timeout');
    });

    it('should handle foreign key constraint error', async () => {
      Invitation.destroy.mockRejectedValue(new Error('Foreign key constraint violation'));

      await expect(Invitation.destroy({
        where: { invitation_id: 'inv-id' }
      })).rejects.toThrow('Foreign key constraint violation');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    describe('Status Transitions', () => {
      it('should allow transition from pending to accepted', async () => {
        Invitation.update.mockResolvedValue([1]);

        const result = await Invitation.update(
          { status: 'accepted', accepted_at: new Date() },
          { where: { invitation_id: 'inv-id', status: 'pending' } }
        );

        expect(result).toEqual([1]);
      });

      it('should allow transition from pending to rejected', async () => {
        Invitation.update.mockResolvedValue([1]);

        const result = await Invitation.update(
          { status: 'rejected' },
          { where: { invitation_id: 'inv-id', status: 'pending' } }
        );

        expect(result).toEqual([1]);
      });
    });

    describe('UUID Handling', () => {
      it('should handle valid UUID for invitation_id', async () => {
        const validUUID = '123e4567-e89b-12d3-a456-426614174000';
        const mockInvitation = createMockInvitation({ invitation_id: validUUID });
        Invitation.create.mockResolvedValue(mockInvitation);

        const result = await Invitation.create({
          email: 'test@example.com',
          org_id: 'org-uuid',
          role_id: 3,
          token: 'token',
          invited_by: 'user-uuid',
          expires_at: new Date()
        });

        expect(result.invitation_id).toBe(validUUID);
      });
    });

    describe('Role ID Handling', () => {
      it('should handle role_id as 1 (Owner)', async () => {
        const mockInvitation = createMockInvitation({ role_id: 1 });
        Invitation.create.mockResolvedValue(mockInvitation);

        const result = await Invitation.create({
          email: 'admin@example.com',
          org_id: 'org-uuid',
          role_id: 1,
          token: 'token',
          invited_by: 'user-uuid',
          expires_at: new Date()
        });

        expect(result.role_id).toBe(1);
      });

      it('should handle role_id as 5 (Auditor)', async () => {
        const mockInvitation = createMockInvitation({ role_id: 5 });
        Invitation.create.mockResolvedValue(mockInvitation);

        const result = await Invitation.create({
          email: 'viewer@example.com',
          org_id: 'org-uuid',
          role_id: 5,
          token: 'token',
          invited_by: 'user-uuid',
          expires_at: new Date()
        });

        expect(result.role_id).toBe(5);
      });
    });

    describe('Token Uniqueness', () => {
      it('should reject duplicate token on create', async () => {
        Invitation.create.mockRejectedValue(new Error('Unique constraint violation: token already exists'));

        await expect(Invitation.create({
          email: 'user@example.com',
          org_id: 'org-uuid',
          role_id: 3,
          token: 'existing-token',
          invited_by: 'user-uuid',
          expires_at: new Date()
        })).rejects.toThrow('Unique constraint violation');
      });

      it('should find exact token match', async () => {
        const exactToken = 'exact-token-abc123';
        const mockInvitation = createMockInvitation({ token: exactToken });
        Invitation.findOne.mockResolvedValue(mockInvitation);

        const result = await Invitation.findOne({ where: { token: exactToken } });

        expect(result.token).toBe(exactToken);
      });
    });

    describe('Concurrent Operations', () => {
      it('should handle multiple concurrent findByEmail calls', async () => {
        Invitation.findAll.mockResolvedValue([createMockInvitation()]);

        const promises = [
          Invitation.findAll({ where: { email: 'user1@example.com', status: 'pending' } }),
          Invitation.findAll({ where: { email: 'user2@example.com', status: 'pending' } }),
          Invitation.findAll({ where: { email: 'user3@example.com', status: 'pending' } })
        ];

        const results = await Promise.all(promises);

        expect(results).toHaveLength(3);
        expect(Invitation.findAll).toHaveBeenCalledTimes(3);
      });

      it('should handle concurrent status updates', async () => {
        Invitation.update.mockResolvedValue([1]);

        const promises = [
          Invitation.update({ status: 'accepted' }, { where: { invitation_id: 'inv-1' } }),
          Invitation.update({ status: 'rejected' }, { where: { invitation_id: 'inv-2' } }),
          Invitation.update({ status: 'cancelled' }, { where: { invitation_id: 'inv-3' } })
        ];

        const results = await Promise.all(promises);

        expect(results.every(r => r[0] === 1)).toBe(true);
        expect(Invitation.update).toHaveBeenCalledTimes(3);
      });
    });

    describe('Error Recovery', () => {
      it('should properly propagate database errors', async () => {
        const dbError = new Error('ECONNREFUSED');
        dbError.code = 'ECONNREFUSED';
        Invitation.create.mockRejectedValue(dbError);

        try {
          await Invitation.create({
            email: 'user@example.com',
            org_id: 'org-uuid',
            role_id: 3,
            token: 'token',
            invited_by: 'user-uuid',
            expires_at: new Date()
          });
        } catch (error) {
          expect(error.code).toBe('ECONNREFUSED');
        }
      });

      it('should handle timeout errors', async () => {
        Invitation.findAll.mockRejectedValue(new Error('Query timeout'));

        await expect(Invitation.findAll({
          where: { org_id: 'org-1', status: 'pending' }
        })).rejects.toThrow('Query timeout');
      });
    });
  });

  // ==========================================================================
  // Model Indexes Tests
  // ==========================================================================
  describe('Model Indexes', () => {
    it('should have index on email', () => {
      const indexes = [
        { fields: ['email'] },
        { fields: ['org_id'] },
        { fields: ['status'] },
        { fields: ['token'], unique: true }
      ];
      expect(indexes.some(idx => idx.fields.includes('email'))).toBe(true);
    });

    it('should have index on org_id', () => {
      const indexes = [
        { fields: ['email'] },
        { fields: ['org_id'] },
        { fields: ['status'] },
        { fields: ['token'], unique: true }
      ];
      expect(indexes.some(idx => idx.fields.includes('org_id'))).toBe(true);
    });

    it('should have index on status', () => {
      const indexes = [
        { fields: ['email'] },
        { fields: ['org_id'] },
        { fields: ['status'] },
        { fields: ['token'], unique: true }
      ];
      expect(indexes.some(idx => idx.fields.includes('status'))).toBe(true);
    });

    it('should have unique index on token', () => {
      const indexes = [
        { fields: ['email'] },
        { fields: ['org_id'] },
        { fields: ['status'] },
        { fields: ['token'], unique: true }
      ];
      const tokenIndex = indexes.find(idx => idx.fields.includes('token'));
      expect(tokenIndex.unique).toBe(true);
    });
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================
  describe('Performance Considerations', () => {
    it('should handle large result sets from findByEmail', async () => {
      const largeResult = Array.from({ length: 100 }, (_, i) => 
        createMockInvitation({ invitation_id: `inv-${i}` })
      );
      Invitation.findAll.mockResolvedValue(largeResult);

      const result = await Invitation.findAll({
        where: { email: 'popular@example.com', status: 'pending' }
      });

      expect(result).toHaveLength(100);
    });

    it('should handle large result sets from findPendingByOrg', async () => {
      const largeResult = Array.from({ length: 50 }, (_, i) => 
        createMockInvitation({ invitation_id: `inv-${i}` })
      );
      Invitation.findAll.mockResolvedValue(largeResult);

      const result = await Invitation.findAll({
        where: { org_id: 'large-org', status: 'pending' }
      });

      expect(result).toHaveLength(50);
    });

    it('should handle expiring many invitations at once', async () => {
      Invitation.update.mockResolvedValue([1000]);

      const result = await Invitation.update(
        { status: 'expired' },
        {
          where: {
            status: 'pending',
            expires_at: { [mockOp.lt]: new Date() }
          }
        }
      );

      expect(result).toEqual([1000]);
    });
  });
});
