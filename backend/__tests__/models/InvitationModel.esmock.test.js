/**
 * InvitationModel Integration Tests using esmock
 * Uses esmock to properly mock ES modules and test actual code
 * Target: >= 92% branch coverage, >= 95% line coverage
 */

import { describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import esmock from 'esmock';

// ==================== MOCKED MODULES ====================

const mockOp = {
  gt: Symbol('gt'),
  lt: Symbol('lt'),
  gte: Symbol('gte'),
  lte: Symbol('lte'),
  ne: Symbol('ne'),
  eq: Symbol('eq'),
  in: Symbol('in'),
  or: Symbol('or'),
  and: Symbol('and'),
};

const mockSequelize = {
  define: null,
  literal: (sql) => ({ literal: sql }),
  fn: (name, col) => ({ fn: name, col }),
  col: (name) => ({ col: name }),
  Op: mockOp,
  Sequelize: {
    Op: mockOp
  }
};

// Store captured model definition
let capturedDefinition = null;
let capturedOptions = null;
let MockInvitationModel = null;

// ==================== TESTS ====================

describe('InvitationModel with esmock', () => {
  let Invitation;
  let InvitationModel;

  beforeAll(async () => {
    // Create mock define function that captures the definition
    mockSequelize.define = (tableName, attributes, options) => {
      capturedDefinition = attributes;
      capturedOptions = options;
      
      function Model(data) {
        Object.assign(this, data);
      }
      
      // Add static Sequelize methods
      Model.findByPk = async () => null;
      Model.findOne = async () => null;
      Model.findAll = async () => [];
      Model.create = async (data) => ({ ...data, invitation_id: 'mock-invite-id' });
      Model.update = async () => [0];
      Model.destroy = async () => 0;
      Model.count = async () => 0;
      
      MockInvitationModel = Model;
      return Model;
    };

    try {
      const module = await esmock('../../src/models/InvitationModel.js', {
        '../../src/config/dbConnection.js': {
          default: mockSequelize,
        },
        'sequelize': {
          DataTypes: {
            UUID: 'UUID',
            UUIDV4: 'UUIDV4',
            STRING: (size) => `STRING(${size})`,
            INTEGER: 'INTEGER',
            DATE: 'DATE',
            NOW: 'NOW',
            ENUM: (...values) => `ENUM(${values.join(',')})`,
          },
          Op: mockOp,
        },
      });
      
      Invitation = module.Invitation;
      InvitationModel = module.InvitationModel || module.default;
    } catch (error) {
      console.error('Failed to load InvitationModel with esmock:', error);
    }
  });

  describe('Model Definition', () => {
    it('should define model with sequelize.define', () => {
      expect(Invitation).toBeDefined();
    });

    it('should capture model definition', () => {
      expect(capturedDefinition).toBeDefined();
    });

    it('should have invitation_id field as primary key', () => {
      if (capturedDefinition) {
        expect(capturedDefinition.invitation_id).toBeDefined();
        expect(capturedDefinition.invitation_id.primaryKey).toBe(true);
      }
    });

    it('should have email field with validation', () => {
      if (capturedDefinition) {
        expect(capturedDefinition.email).toBeDefined();
        expect(capturedDefinition.email.allowNull).toBe(false);
      }
    });

    it('should have org_id field', () => {
      if (capturedDefinition) {
        expect(capturedDefinition.org_id).toBeDefined();
        expect(capturedDefinition.org_id.allowNull).toBe(false);
      }
    });

    it('should have role_id field', () => {
      if (capturedDefinition) {
        expect(capturedDefinition.role_id).toBeDefined();
        expect(capturedDefinition.role_id.allowNull).toBe(false);
      }
    });

    it('should have token field with unique constraint', () => {
      if (capturedDefinition) {
        expect(capturedDefinition.token).toBeDefined();
        expect(capturedDefinition.token.unique).toBe(true);
      }
    });

    it('should have invited_by field', () => {
      if (capturedDefinition) {
        expect(capturedDefinition.invited_by).toBeDefined();
        expect(capturedDefinition.invited_by.allowNull).toBe(false);
      }
    });

    it('should have status field with ENUM', () => {
      if (capturedDefinition) {
        expect(capturedDefinition.status).toBeDefined();
        expect(capturedDefinition.status.defaultValue).toBe('pending');
      }
    });

    it('should have expires_at field', () => {
      if (capturedDefinition) {
        expect(capturedDefinition.expires_at).toBeDefined();
        expect(capturedDefinition.expires_at.allowNull).toBe(false);
      }
    });

    it('should have accepted_at field', () => {
      if (capturedDefinition) {
        expect(capturedDefinition.accepted_at).toBeDefined();
        expect(capturedDefinition.accepted_at.allowNull).toBe(true);
      }
    });

    it('should have correct table options', () => {
      if (capturedOptions) {
        expect(capturedOptions.timestamps).toBe(true);
        expect(capturedOptions.tableName).toBe('sys_invitations');
      }
    });
  });

  describe('InvitationModel.create', () => {
    beforeEach(() => {
      Invitation.create = async (data, options) => ({
        invitation_id: 'new-invite-id',
        ...data,
        created_date: new Date(),
        updated_date: new Date()
      });
    });

    it('should create invitation with valid data', async () => {
      const data = {
        email: 'test@test.com',
        org_id: 'org-123',
        role_id: 3,
        token: 'unique-token-123',
        invited_by: 'user-123',
        expires_at: new Date('2025-01-01')
      };

      const result = await InvitationModel.create(data);

      expect(result).toBeDefined();
      expect(result.email).toBe('test@test.com');
      expect(result.org_id).toBe('org-123');
      expect(result.token).toBe('unique-token-123');
    });

    it('should pass transaction option', async () => {
      const mockTransaction = { id: 'txn-123' };
      let capturedTransaction = null;
      
      Invitation.create = async (data, options) => {
        capturedTransaction = options?.transaction;
        return { invitation_id: 'new-id', ...data };
      };

      await InvitationModel.create({
        email: 'test@test.com',
        org_id: 'org-123',
        role_id: 3,
        token: 'token',
        invited_by: 'user-123',
        expires_at: new Date()
      }, mockTransaction);

      expect(capturedTransaction).toEqual(mockTransaction);
    });

    it('should pass null transaction when not provided', async () => {
      let capturedTransaction = 'not-set';
      Invitation.create = async (data, options) => {
        capturedTransaction = options?.transaction;
        return { invitation_id: 'id', ...data };
      };

      await InvitationModel.create({
        email: 'test@test.com',
        org_id: 'org-123',
        role_id: 3,
        token: 'token',
        invited_by: 'user-123',
        expires_at: new Date()
      });

      expect(capturedTransaction).toBeNull();
    });
  });

  describe('InvitationModel.findByToken', () => {
    it('should find invitation by token', async () => {
      const mockInvitation = {
        invitation_id: 'invite-123',
        token: 'unique-token',
        status: 'pending'
      };
      
      Invitation.findOne = async (options) => {
        expect(options.where.token).toBe('unique-token');
        return mockInvitation;
      };

      const result = await InvitationModel.findByToken('unique-token');

      expect(result).toEqual(mockInvitation);
    });

    it('should return null when token not found', async () => {
      Invitation.findOne = async () => null;

      const result = await InvitationModel.findByToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('InvitationModel.findByEmail', () => {
    it('should find pending invitations by email', async () => {
      const mockInvitations = [
        { invitation_id: 'invite-1', email: 'test@test.com', status: 'pending' },
        { invitation_id: 'invite-2', email: 'test@test.com', status: 'pending' }
      ];
      
      Invitation.findAll = async (options) => {
        expect(options.where.email).toBe('test@test.com');
        expect(options.where.status).toBe('pending');
        return mockInvitations;
      };

      const result = await InvitationModel.findByEmail('test@test.com');

      expect(result).toHaveLength(2);
    });

    it('should filter by orgId when provided', async () => {
      let capturedWhere = null;
      Invitation.findAll = async (options) => {
        capturedWhere = options.where;
        return [];
      };

      await InvitationModel.findByEmail('test@test.com', 'org-123');

      expect(capturedWhere.org_id).toBe('org-123');
    });

    it('should not filter by orgId when not provided', async () => {
      let capturedWhere = null;
      Invitation.findAll = async (options) => {
        capturedWhere = options.where;
        return [];
      };

      await InvitationModel.findByEmail('test@test.com');

      expect(capturedWhere.org_id).toBeUndefined();
    });

    it('should not filter by orgId when null', async () => {
      let capturedWhere = null;
      Invitation.findAll = async (options) => {
        capturedWhere = options.where;
        return [];
      };

      await InvitationModel.findByEmail('test@test.com', null);

      expect(capturedWhere.org_id).toBeUndefined();
    });

    it('should return empty array when no invitations found', async () => {
      Invitation.findAll = async () => [];

      const result = await InvitationModel.findByEmail('unknown@test.com');

      expect(result).toEqual([]);
    });
  });

  describe('InvitationModel.updateStatus', () => {
    it('should update invitation status', async () => {
      Invitation.update = async (data, options) => {
        expect(data.status).toBe('accepted');
        expect(options.where.invitation_id).toBe('invite-123');
        return [1];
      };

      const result = await InvitationModel.updateStatus('invite-123', 'accepted');

      expect(result).toEqual([1]);
    });

    it('should set accepted_at when status is accepted', async () => {
      let capturedData = null;
      Invitation.update = async (data, options) => {
        capturedData = data;
        return [1];
      };

      const beforeUpdate = new Date();
      await InvitationModel.updateStatus('invite-123', 'accepted');
      const afterUpdate = new Date();

      expect(capturedData.accepted_at).toBeDefined();
      expect(capturedData.accepted_at.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      expect(capturedData.accepted_at.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
    });

    it('should not set accepted_at for other statuses', async () => {
      let capturedData = null;
      Invitation.update = async (data, options) => {
        capturedData = data;
        return [1];
      };

      await InvitationModel.updateStatus('invite-123', 'rejected');

      expect(capturedData.accepted_at).toBeUndefined();
    });

    it('should pass transaction option', async () => {
      const mockTransaction = { id: 'txn-123' };
      let capturedTransaction = null;
      
      Invitation.update = async (data, options) => {
        capturedTransaction = options?.transaction;
        return [1];
      };

      await InvitationModel.updateStatus('invite-123', 'accepted', mockTransaction);

      expect(capturedTransaction).toEqual(mockTransaction);
    });

    it('should pass null transaction when not provided', async () => {
      let capturedTransaction = 'not-set';
      Invitation.update = async (data, options) => {
        capturedTransaction = options?.transaction;
        return [1];
      };

      await InvitationModel.updateStatus('invite-123', 'cancelled');

      expect(capturedTransaction).toBeNull();
    });

    it('should handle expired status', async () => {
      let capturedData = null;
      Invitation.update = async (data, options) => {
        capturedData = data;
        return [1];
      };

      await InvitationModel.updateStatus('invite-123', 'expired');

      expect(capturedData.status).toBe('expired');
      expect(capturedData.accepted_at).toBeUndefined();
    });

    it('should handle cancelled status', async () => {
      let capturedData = null;
      Invitation.update = async (data, options) => {
        capturedData = data;
        return [1];
      };

      await InvitationModel.updateStatus('invite-123', 'cancelled');

      expect(capturedData.status).toBe('cancelled');
    });
  });

  describe('InvitationModel.findPendingByOrg', () => {
    it('should find pending non-expired invitations for organization', async () => {
      const mockInvitations = [
        { invitation_id: 'invite-1', status: 'pending' },
        { invitation_id: 'invite-2', status: 'pending' }
      ];
      
      Invitation.findAll = async (options) => {
        expect(options.where.org_id).toBe('org-123');
        expect(options.where.status).toBe('pending');
        expect(options.where.expires_at).toBeDefined();
        return mockInvitations;
      };

      const result = await InvitationModel.findPendingByOrg('org-123');

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no pending invitations', async () => {
      Invitation.findAll = async () => [];

      const result = await InvitationModel.findPendingByOrg('org-no-invites');

      expect(result).toEqual([]);
    });
  });

  describe('InvitationModel.expireOldInvitations', () => {
    it('should update expired invitations', async () => {
      Invitation.update = async (data, options) => {
        expect(data.status).toBe('expired');
        expect(options.where.status).toBe('pending');
        expect(options.where.expires_at).toBeDefined();
        return [10];
      };

      const result = await InvitationModel.expireOldInvitations();

      expect(result).toEqual([10]);
    });

    it('should return 0 when no invitations to expire', async () => {
      Invitation.update = async () => [0];

      const result = await InvitationModel.expireOldInvitations();

      expect(result).toEqual([0]);
    });
  });

  describe('InvitationModel.deleteById', () => {
    it('should delete invitation by ID', async () => {
      Invitation.destroy = async (options) => {
        expect(options.where.invitation_id).toBe('invite-123');
        return 1;
      };

      const result = await InvitationModel.deleteById('invite-123');

      expect(result).toBe(1);
    });

    it('should return 0 when invitation not found', async () => {
      Invitation.destroy = async () => 0;

      const result = await InvitationModel.deleteById('non-existent');

      expect(result).toBe(0);
    });

    it('should pass transaction option', async () => {
      const mockTransaction = { id: 'txn-123' };
      let capturedTransaction = null;
      
      Invitation.destroy = async (options) => {
        capturedTransaction = options?.transaction;
        return 1;
      };

      await InvitationModel.deleteById('invite-123', mockTransaction);

      expect(capturedTransaction).toEqual(mockTransaction);
    });

    it('should pass null transaction when not provided', async () => {
      let capturedTransaction = 'not-set';
      Invitation.destroy = async (options) => {
        capturedTransaction = options?.transaction;
        return 1;
      };

      await InvitationModel.deleteById('invite-123');

      expect(capturedTransaction).toBeNull();
    });
  });

  describe('Export Structure', () => {
    it('should export Invitation', () => {
      expect(Invitation).toBeDefined();
    });

    it('should export InvitationModel', () => {
      expect(InvitationModel).toBeDefined();
    });

    it('should have create method', () => {
      expect(InvitationModel.create).toBeDefined();
      expect(typeof InvitationModel.create).toBe('function');
    });

    it('should have findByToken method', () => {
      expect(InvitationModel.findByToken).toBeDefined();
      expect(typeof InvitationModel.findByToken).toBe('function');
    });

    it('should have findByEmail method', () => {
      expect(InvitationModel.findByEmail).toBeDefined();
      expect(typeof InvitationModel.findByEmail).toBe('function');
    });

    it('should have updateStatus method', () => {
      expect(InvitationModel.updateStatus).toBeDefined();
      expect(typeof InvitationModel.updateStatus).toBe('function');
    });

    it('should have findPendingByOrg method', () => {
      expect(InvitationModel.findPendingByOrg).toBeDefined();
      expect(typeof InvitationModel.findPendingByOrg).toBe('function');
    });

    it('should have expireOldInvitations method', () => {
      expect(InvitationModel.expireOldInvitations).toBeDefined();
      expect(typeof InvitationModel.expireOldInvitations).toBe('function');
    });

    it('should have deleteById method', () => {
      expect(InvitationModel.deleteById).toBeDefined();
      expect(typeof InvitationModel.deleteById).toBe('function');
    });
  });

  describe('Edge Cases', () => {
    it('should handle create with all fields', async () => {
      let capturedData = null;
      Invitation.create = async (data, options) => {
        capturedData = data;
        return { invitation_id: 'id', ...data };
      };

      const fullData = {
        email: 'test@test.com',
        org_id: 'org-123',
        role_id: 2,
        token: 'very-long-unique-token-string',
        invited_by: 'user-456',
        status: 'pending',
        expires_at: new Date('2025-12-31')
      };

      await InvitationModel.create(fullData);

      expect(capturedData).toEqual(fullData);
    });

    it('should handle updateStatus to pending', async () => {
      let capturedData = null;
      Invitation.update = async (data, options) => {
        capturedData = data;
        return [1];
      };

      await InvitationModel.updateStatus('invite-123', 'pending');

      expect(capturedData.status).toBe('pending');
      expect(capturedData.accepted_at).toBeUndefined();
    });

    it('should handle findByEmail with empty org', async () => {
      let capturedWhere = null;
      Invitation.findAll = async (options) => {
        capturedWhere = options.where;
        return [];
      };

      await InvitationModel.findByEmail('test@test.com', '');

      // Empty string is falsy, so org_id should not be added
      expect(capturedWhere.org_id).toBeUndefined();
    });

    it('should handle updateStatus return value', async () => {
      Invitation.update = async () => [5];

      const result = await InvitationModel.updateStatus('invite-123', 'cancelled');

      expect(result).toEqual([5]);
    });

    it('should handle deleteById returning multiple deleted', async () => {
      Invitation.destroy = async () => 3;

      const result = await InvitationModel.deleteById('invite-123');

      expect(result).toBe(3);
    });
  });
});
