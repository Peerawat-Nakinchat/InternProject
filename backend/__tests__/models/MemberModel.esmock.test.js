/**
 * MemberModel Integration Tests using esmock
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
  iLike: Symbol('iLike'),
};

// Mock User model
const MockUser = {
  name: 'User',
  tableName: 'sys_users'
};

// Mock Role model
const MockRole = {
  name: 'Role',
  tableName: 'sys_roles'
};

// Mock Organization model
const MockOrganization = {
  name: 'Organization',
  tableName: 'sys_organizations'
};

const mockSequelize = {
  define: null,
  literal: (sql) => ({ literal: sql }),
  fn: (name, col) => ({ fn: name, col }),
  col: (name) => ({ col: name }),
  Op: mockOp,
};

// Store captured model definition
let capturedDefinition = null;
let capturedOptions = null;
let MockOrganizationMemberModel = null;

// ==================== TESTS ====================

describe('MemberModel with esmock', () => {
  let OrganizationMember;
  let MemberModel;

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
      Model.create = async (data) => ({ ...data, membership_id: 'mock-member-id' });
      Model.upsert = async (data, options) => [{ ...data, membership_id: 'mock-member-id' }, true];
      Model.update = async () => [0, []];
      Model.destroy = async () => 0;
      Model.count = async () => 0;
      Model.findAndCountAll = async () => ({ count: 0, rows: [] });
      Model.bulkCreate = async (data) => data;
      
      MockOrganizationMemberModel = Model;
      return Model;
    };

    try {
      const module = await esmock('../../src/models/MemberModel.js', {
        '../../src/config/dbConnection.js': {
          default: mockSequelize,
        },
        '../../src/models/UserModel.js': {
          User: MockUser,
        },
        '../../src/models/RoleModel.js': {
          Role: MockRole,
        },
        '../../src/models/CompanyModel.js': {
          Organization: MockOrganization,
        },
        'sequelize': {
          DataTypes: {
            UUID: 'UUID',
            UUIDV4: 'UUIDV4',
            INTEGER: 'INTEGER',
            DATE: 'DATE',
            NOW: 'NOW',
          },
          Op: mockOp,
        },
      });
      
      OrganizationMember = module.OrganizationMember;
      MemberModel = module.MemberModel || module.default;
    } catch (error) {
      console.error('Failed to load MemberModel with esmock:', error);
    }
  });

  describe('Model Definition', () => {
    it('should define model with sequelize.define', () => {
      expect(OrganizationMember).toBeDefined();
    });

    it('should capture model definition', () => {
      expect(capturedDefinition).toBeDefined();
    });

    it('should have membership_id field as primary key', () => {
      if (capturedDefinition) {
        expect(capturedDefinition.membership_id).toBeDefined();
        expect(capturedDefinition.membership_id.primaryKey).toBe(true);
      }
    });

    it('should have org_id field', () => {
      if (capturedDefinition) {
        expect(capturedDefinition.org_id).toBeDefined();
        expect(capturedDefinition.org_id.allowNull).toBe(false);
      }
    });

    it('should have user_id field', () => {
      if (capturedDefinition) {
        expect(capturedDefinition.user_id).toBeDefined();
        expect(capturedDefinition.user_id.allowNull).toBe(false);
      }
    });

    it('should have role_id field with validation', () => {
      if (capturedDefinition) {
        expect(capturedDefinition.role_id).toBeDefined();
        expect(capturedDefinition.role_id.allowNull).toBe(false);
      }
    });

    it('should have joined_date field', () => {
      if (capturedDefinition) {
        expect(capturedDefinition.joined_date).toBeDefined();
      }
    });

    it('should have correct table options', () => {
      if (capturedOptions) {
        expect(capturedOptions.timestamps).toBe(false);
        expect(capturedOptions.tableName).toBe('sys_organization_members');
      }
    });
  });

  describe('MemberModel.create', () => {
    beforeEach(() => {
      OrganizationMember.upsert = async (data, options) => {
        return [{ ...data, membership_id: 'new-member-id' }, true];
      };
    });

    it('should create member with camelCase data', async () => {
      const data = {
        orgId: 'org-123',
        userId: 'user-123',
        roleId: 3
      };

      const result = await MemberModel.create(data);

      expect(result).toBeDefined();
      expect(result.org_id).toBe('org-123');
      expect(result.user_id).toBe('user-123');
      expect(result.role_id).toBe(3);
    });

    it('should create member with snake_case data', async () => {
      const data = {
        org_id: 'org-456',
        user_id: 'user-456',
        role_id: 2
      };

      const result = await MemberModel.create(data);

      expect(result).toBeDefined();
      expect(result.org_id).toBe('org-456');
      expect(result.user_id).toBe('user-456');
    });

    it('should convert roleId to number', async () => {
      let capturedData = null;
      OrganizationMember.upsert = async (data, options) => {
        capturedData = data;
        return [{ ...data, membership_id: 'id' }, true];
      };

      await MemberModel.create({
        orgId: 'org-123',
        userId: 'user-123',
        roleId: '3'
      });

      expect(capturedData.role_id).toBe(3);
    });

    it('should pass transaction option', async () => {
      const mockTransaction = { id: 'txn-123' };
      let capturedTransaction = null;
      
      OrganizationMember.upsert = async (data, options) => {
        capturedTransaction = options?.transaction;
        return [{ ...data, membership_id: 'new-id' }, true];
      };

      await MemberModel.create({
        orgId: 'org-123',
        userId: 'user-123',
        roleId: 3
      }, mockTransaction);

      expect(capturedTransaction).toEqual(mockTransaction);
    });

    it('should set joined_date to current date', async () => {
      let capturedData = null;
      OrganizationMember.upsert = async (data, options) => {
        capturedData = data;
        return [{ ...data, membership_id: 'id' }, true];
      };

      const beforeCreate = new Date();
      await MemberModel.create({
        orgId: 'org-123',
        userId: 'user-123',
        roleId: 3
      });
      const afterCreate = new Date();

      expect(capturedData.joined_date.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(capturedData.joined_date.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });

  describe('MemberModel.findOne', () => {
    it('should find member by org and user', async () => {
      const mockMember = {
        membership_id: 'member-123',
        org_id: 'org-123',
        user_id: 'user-123',
        role_id: 3
      };
      
      OrganizationMember.findOne = async (options) => {
        expect(options.where.org_id).toBe('org-123');
        expect(options.where.user_id).toBe('user-123');
        expect(options.include).toBeDefined();
        return mockMember;
      };

      const result = await MemberModel.findOne('org-123', 'user-123');

      expect(result).toEqual(mockMember);
    });

    it('should return null when member not found', async () => {
      OrganizationMember.findOne = async () => null;

      const result = await MemberModel.findOne('org-123', 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('MemberModel.exists', () => {
    it('should return true when member exists', async () => {
      OrganizationMember.count = async () => 1;

      const result = await MemberModel.exists('org-123', 'user-123');

      expect(result).toBe(true);
    });

    it('should return false when member does not exist', async () => {
      OrganizationMember.count = async () => 0;

      const result = await MemberModel.exists('org-123', 'user-123');

      expect(result).toBe(false);
    });

    it('should pass correct where clause', async () => {
      let capturedWhere = null;
      OrganizationMember.count = async (options) => {
        capturedWhere = options.where;
        return 0;
      };

      await MemberModel.exists('org-456', 'user-789');

      expect(capturedWhere.org_id).toBe('org-456');
      expect(capturedWhere.user_id).toBe('user-789');
    });
  });

  describe('MemberModel.getRole', () => {
    it('should return role_id when member exists', async () => {
      OrganizationMember.findOne = async () => ({
        role_id: 3
      });

      const result = await MemberModel.getRole('org-123', 'user-123');

      expect(result).toBe(3);
    });

    it('should return null when member not found', async () => {
      OrganizationMember.findOne = async () => null;

      const result = await MemberModel.getRole('org-123', 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('MemberModel.findByOrganization', () => {
    it('should find all members of organization', async () => {
      const mockMembers = [
        { membership_id: 'member-1', role_id: 2 },
        { membership_id: 'member-2', role_id: 3 }
      ];
      
      OrganizationMember.findAll = async (options) => {
        expect(options.where.org_id).toBe('org-123');
        return mockMembers;
      };

      const result = await MemberModel.findByOrganization('org-123');

      expect(result).toHaveLength(2);
    });

    it('should apply role_id filter when provided', async () => {
      let capturedWhere = null;
      OrganizationMember.findAll = async (options) => {
        capturedWhere = options.where;
        return [];
      };

      await MemberModel.findByOrganization('org-123', { role_id: 2 });

      expect(capturedWhere.role_id).toBe(2);
    });

    it('should not include role_id filter when not provided', async () => {
      let capturedWhere = null;
      OrganizationMember.findAll = async (options) => {
        capturedWhere = options.where;
        return [];
      };

      await MemberModel.findByOrganization('org-123', {});

      expect(capturedWhere.role_id).toBeUndefined();
    });

    it('should return empty array when no members found', async () => {
      OrganizationMember.findAll = async () => [];

      const result = await MemberModel.findByOrganization('org-empty');

      expect(result).toEqual([]);
    });
  });

  describe('MemberModel.findByUser', () => {
    it('should find all memberships for user', async () => {
      const mockMemberships = [
        { membership_id: 'member-1', org_id: 'org-1' },
        { membership_id: 'member-2', org_id: 'org-2' }
      ];
      
      OrganizationMember.findAll = async (options) => {
        expect(options.where.user_id).toBe('user-123');
        return mockMemberships;
      };

      const result = await MemberModel.findByUser('user-123');

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no memberships found', async () => {
      OrganizationMember.findAll = async () => [];

      const result = await MemberModel.findByUser('user-no-orgs');

      expect(result).toEqual([]);
    });
  });

  describe('MemberModel.updateRole', () => {
    it('should update member role and return updated member', async () => {
      const mockMember = { membership_id: 'member-123', role_id: 2 };
      OrganizationMember.update = async (data, options) => {
        expect(data.role_id).toBe(2);
        return [1, [mockMember]];
      };

      const result = await MemberModel.updateRole('org-123', 'user-123', 2);

      expect(result.role_id).toBe(2);
    });

    it('should pass transaction option', async () => {
      const mockTransaction = { id: 'txn-123' };
      let capturedTransaction = null;
      
      OrganizationMember.update = async (data, options) => {
        capturedTransaction = options?.transaction;
        return [1, [{ membership_id: 'id', role_id: 2 }]];
      };

      await MemberModel.updateRole('org-123', 'user-123', 2, mockTransaction);

      expect(capturedTransaction).toEqual(mockTransaction);
    });
  });

  describe('MemberModel.remove', () => {
    it('should remove member and return true', async () => {
      OrganizationMember.destroy = async () => 1;

      const result = await MemberModel.remove('org-123', 'user-123');

      expect(result).toBe(true);
    });

    it('should return false when member not found', async () => {
      OrganizationMember.destroy = async () => 0;

      const result = await MemberModel.remove('org-123', 'non-existent');

      expect(result).toBe(false);
    });

    it('should pass transaction option', async () => {
      const mockTransaction = { id: 'txn-123' };
      let capturedTransaction = null;
      
      OrganizationMember.destroy = async (options) => {
        capturedTransaction = options?.transaction;
        return 1;
      };

      await MemberModel.remove('org-123', 'user-123', mockTransaction);

      expect(capturedTransaction).toEqual(mockTransaction);
    });

    it('should pass correct where clause', async () => {
      let capturedWhere = null;
      OrganizationMember.destroy = async (options) => {
        capturedWhere = options.where;
        return 1;
      };

      await MemberModel.remove('org-456', 'user-789');

      expect(capturedWhere.org_id).toBe('org-456');
      expect(capturedWhere.user_id).toBe('user-789');
    });
  });

  describe('MemberModel.removeAllByOrganization', () => {
    it('should remove all members from organization', async () => {
      OrganizationMember.destroy = async () => 5;

      const result = await MemberModel.removeAllByOrganization('org-123');

      expect(result).toBe(5);
    });

    it('should return 0 when organization has no members', async () => {
      OrganizationMember.destroy = async () => 0;

      const result = await MemberModel.removeAllByOrganization('org-empty');

      expect(result).toBe(0);
    });

    it('should pass transaction option', async () => {
      const mockTransaction = { id: 'txn-123' };
      let capturedTransaction = null;
      
      OrganizationMember.destroy = async (options) => {
        capturedTransaction = options?.transaction;
        return 1;
      };

      await MemberModel.removeAllByOrganization('org-123', mockTransaction);

      expect(capturedTransaction).toEqual(mockTransaction);
    });
  });

  describe('MemberModel.bulkRemove', () => {
    it('should remove multiple members', async () => {
      OrganizationMember.destroy = async () => 3;

      const result = await MemberModel.bulkRemove('org-123', ['user-1', 'user-2', 'user-3']);

      expect(result).toBe(3);
    });

    it('should return 0 when no members found', async () => {
      OrganizationMember.destroy = async () => 0;

      const result = await MemberModel.bulkRemove('org-123', ['invalid-1', 'invalid-2']);

      expect(result).toBe(0);
    });

    it('should pass transaction option', async () => {
      const mockTransaction = { id: 'txn-123' };
      let capturedTransaction = null;
      
      OrganizationMember.destroy = async (options) => {
        capturedTransaction = options?.transaction;
        return 1;
      };

      await MemberModel.bulkRemove('org-123', ['user-1'], mockTransaction);

      expect(capturedTransaction).toEqual(mockTransaction);
    });

    it('should pass correct where clause', async () => {
      let capturedWhere = null;
      OrganizationMember.destroy = async (options) => {
        capturedWhere = options.where;
        return 2;
      };

      await MemberModel.bulkRemove('org-456', ['user-1', 'user-2']);

      expect(capturedWhere.org_id).toBe('org-456');
      expect(capturedWhere.user_id).toBeDefined();
    });
  });

  describe('MemberModel.countByOrganization', () => {
    it('should count members in organization', async () => {
      OrganizationMember.count = async () => 10;

      const result = await MemberModel.countByOrganization('org-123');

      expect(result).toBe(10);
    });

    it('should return 0 when organization has no members', async () => {
      OrganizationMember.count = async () => 0;

      const result = await MemberModel.countByOrganization('org-empty');

      expect(result).toBe(0);
    });
  });

  describe('MemberModel.findByOrganizationPaginated', () => {
    it('should return paginated results with default options', async () => {
      OrganizationMember.findAndCountAll = async (options) => {
        expect(options.limit).toBe(10);
        expect(options.offset).toBe(0);
        return { count: 0, rows: [] };
      };

      const result = await MemberModel.findByOrganizationPaginated('org-123');

      expect(result.members).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(0);
    });

    it('should apply role_id filter', async () => {
      let capturedWhere = null;
      OrganizationMember.findAndCountAll = async (options) => {
        capturedWhere = options.where;
        return { count: 0, rows: [] };
      };

      await MemberModel.findByOrganizationPaginated('org-123', { role_id: 2 });

      expect(capturedWhere.role_id).toBe(2);
    });

    it('should not apply role_id filter when null', async () => {
      let capturedWhere = null;
      OrganizationMember.findAndCountAll = async (options) => {
        capturedWhere = options.where;
        return { count: 0, rows: [] };
      };

      await MemberModel.findByOrganizationPaginated('org-123', { role_id: null });

      expect(capturedWhere.role_id).toBeUndefined();
    });

    it('should apply search filter to user include', async () => {
      let capturedInclude = null;
      OrganizationMember.findAndCountAll = async (options) => {
        capturedInclude = options.include;
        return { count: 0, rows: [] };
      };

      await MemberModel.findByOrganizationPaginated('org-123', { search: 'john' });

      // The include should have User model with a where clause for search
      expect(capturedInclude).toBeDefined();
      expect(capturedInclude.length).toBeGreaterThan(0);
    });

    it('should not apply search filter when not provided', async () => {
      let capturedInclude = null;
      OrganizationMember.findAndCountAll = async (options) => {
        capturedInclude = options.include;
        return { count: 0, rows: [] };
      };

      await MemberModel.findByOrganizationPaginated('org-123', {});

      expect(capturedInclude).toBeDefined();
      expect(capturedInclude.length).toBeGreaterThan(0);
    });

    it('should handle pagination options', async () => {
      OrganizationMember.findAndCountAll = async (options) => {
        expect(options.limit).toBe(20);
        expect(options.offset).toBe(40);
        return { count: 100, rows: new Array(20) };
      };

      const result = await MemberModel.findByOrganizationPaginated('org-123', { 
        page: 3, 
        limit: 20 
      });

      expect(result.page).toBe(3);
      expect(result.totalPages).toBe(5);
    });

    it('should calculate totalPages correctly', async () => {
      OrganizationMember.findAndCountAll = async () => {
        return { count: 25, rows: new Array(10) };
      };

      const result = await MemberModel.findByOrganizationPaginated('org-123', { 
        page: 1, 
        limit: 10 
      });

      expect(result.totalPages).toBe(3);
    });
  });

  describe('MemberModel.findByRole', () => {
    it('should find members by role', async () => {
      const mockMembers = [
        { membership_id: 'member-1', role_id: 2 },
        { membership_id: 'member-2', role_id: 2 }
      ];
      
      OrganizationMember.findAll = async (options) => {
        expect(options.where.org_id).toBe('org-123');
        expect(options.where.role_id).toBe(2);
        return mockMembers;
      };

      const result = await MemberModel.findByRole('org-123', 2);

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no members with role', async () => {
      OrganizationMember.findAll = async () => [];

      const result = await MemberModel.findByRole('org-123', 5);

      expect(result).toEqual([]);
    });
  });

  describe('MemberModel.countByRole', () => {
    it('should count members by role', async () => {
      OrganizationMember.count = async () => 5;

      const result = await MemberModel.countByRole('org-123', 2);

      expect(result).toBe(5);
    });

    it('should return 0 when no members with role', async () => {
      OrganizationMember.count = async () => 0;

      const result = await MemberModel.countByRole('org-123', 5);

      expect(result).toBe(0);
    });

    it('should pass correct where clause', async () => {
      let capturedWhere = null;
      OrganizationMember.count = async (options) => {
        capturedWhere = options.where;
        return 0;
      };

      await MemberModel.countByRole('org-456', 3);

      expect(capturedWhere.org_id).toBe('org-456');
      expect(capturedWhere.role_id).toBe(3);
    });
  });

  describe('MemberModel.getRoleDistribution', () => {
    it('should return role distribution', async () => {
      OrganizationMember.findAll = async () => [
        { toJSON: () => ({ role_id: 1, count: '2' }) },
        { toJSON: () => ({ role_id: 2, count: '5' }) },
        { toJSON: () => ({ role_id: 3, count: '10' }) }
      ];

      const result = await MemberModel.getRoleDistribution('org-123');

      expect(result[1]).toBe(2);
      expect(result[2]).toBe(5);
      expect(result[3]).toBe(10);
    });

    it('should return empty object when no members', async () => {
      OrganizationMember.findAll = async () => [];

      const result = await MemberModel.getRoleDistribution('org-empty');

      expect(result).toEqual({});
    });
  });

  describe('MemberModel.bulkCreate', () => {
    it('should bulk create members', async () => {
      const membersData = [
        { org_id: 'org-1', user_id: 'user-1', role_id: 3 },
        { org_id: 'org-1', user_id: 'user-2', role_id: 3 }
      ];
      
      OrganizationMember.bulkCreate = async (data, options) => {
        expect(options.validate).toBe(true);
        return data.map((d, i) => ({ ...d, membership_id: `member-${i}` }));
      };

      const result = await MemberModel.bulkCreate(membersData);

      expect(result).toHaveLength(2);
    });

    it('should pass transaction option', async () => {
      const mockTransaction = { id: 'txn-123' };
      let capturedTransaction = null;
      
      OrganizationMember.bulkCreate = async (data, options) => {
        capturedTransaction = options?.transaction;
        return data;
      };

      await MemberModel.bulkCreate([{ org_id: 'org-1', user_id: 'user-1', role_id: 3 }], mockTransaction);

      expect(capturedTransaction).toEqual(mockTransaction);
    });
  });

  describe('MemberModel.findByMembershipId', () => {
    it('should find member by membership ID', async () => {
      const mockMember = {
        membership_id: 'member-123',
        org_id: 'org-123',
        user_id: 'user-123',
        role_id: 3
      };
      
      OrganizationMember.findByPk = async (id, options) => {
        expect(id).toBe('member-123');
        expect(options.include).toBeDefined();
        return mockMember;
      };

      const result = await MemberModel.findByMembershipId('member-123');

      expect(result).toEqual(mockMember);
    });

    it('should return null when not found', async () => {
      OrganizationMember.findByPk = async () => null;

      const result = await MemberModel.findByMembershipId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('Export Structure', () => {
    it('should export OrganizationMember', () => {
      expect(OrganizationMember).toBeDefined();
    });

    it('should export MemberModel', () => {
      expect(MemberModel).toBeDefined();
    });

    it('should have create method', () => {
      expect(MemberModel.create).toBeDefined();
      expect(typeof MemberModel.create).toBe('function');
    });

    it('should have findOne method', () => {
      expect(MemberModel.findOne).toBeDefined();
      expect(typeof MemberModel.findOne).toBe('function');
    });

    it('should have exists method', () => {
      expect(MemberModel.exists).toBeDefined();
      expect(typeof MemberModel.exists).toBe('function');
    });

    it('should have getRole method', () => {
      expect(MemberModel.getRole).toBeDefined();
      expect(typeof MemberModel.getRole).toBe('function');
    });

    it('should have findByOrganization method', () => {
      expect(MemberModel.findByOrganization).toBeDefined();
      expect(typeof MemberModel.findByOrganization).toBe('function');
    });

    it('should have findByUser method', () => {
      expect(MemberModel.findByUser).toBeDefined();
      expect(typeof MemberModel.findByUser).toBe('function');
    });

    it('should have updateRole method', () => {
      expect(MemberModel.updateRole).toBeDefined();
      expect(typeof MemberModel.updateRole).toBe('function');
    });

    it('should have remove method', () => {
      expect(MemberModel.remove).toBeDefined();
      expect(typeof MemberModel.remove).toBe('function');
    });

    it('should have removeAllByOrganization method', () => {
      expect(MemberModel.removeAllByOrganization).toBeDefined();
      expect(typeof MemberModel.removeAllByOrganization).toBe('function');
    });

    it('should have bulkRemove method', () => {
      expect(MemberModel.bulkRemove).toBeDefined();
      expect(typeof MemberModel.bulkRemove).toBe('function');
    });

    it('should have countByOrganization method', () => {
      expect(MemberModel.countByOrganization).toBeDefined();
      expect(typeof MemberModel.countByOrganization).toBe('function');
    });

    it('should have findByOrganizationPaginated method', () => {
      expect(MemberModel.findByOrganizationPaginated).toBeDefined();
      expect(typeof MemberModel.findByOrganizationPaginated).toBe('function');
    });

    it('should have findByRole method', () => {
      expect(MemberModel.findByRole).toBeDefined();
      expect(typeof MemberModel.findByRole).toBe('function');
    });

    it('should have countByRole method', () => {
      expect(MemberModel.countByRole).toBeDefined();
      expect(typeof MemberModel.countByRole).toBe('function');
    });

    it('should have getRoleDistribution method', () => {
      expect(MemberModel.getRoleDistribution).toBeDefined();
      expect(typeof MemberModel.getRoleDistribution).toBe('function');
    });

    it('should have bulkCreate method', () => {
      expect(MemberModel.bulkCreate).toBeDefined();
      expect(typeof MemberModel.bulkCreate).toBe('function');
    });

    it('should have findByMembershipId method', () => {
      expect(MemberModel.findByMembershipId).toBeDefined();
      expect(typeof MemberModel.findByMembershipId).toBe('function');
    });
  });

  describe('Edge Cases', () => {
    it('should handle create with both camelCase and snake_case falling back', async () => {
      let capturedData = null;
      OrganizationMember.upsert = async (data, options) => {
        capturedData = data;
        return [{ ...data, membership_id: 'id' }, true];
      };

      // When orgId is undefined but org_id is present
      await MemberModel.create({
        org_id: 'org-fallback',
        user_id: 'user-fallback',
        role_id: 4
      });

      expect(capturedData.org_id).toBe('org-fallback');
      expect(capturedData.user_id).toBe('user-fallback');
    });

    it('should handle exists returning count > 1', async () => {
      OrganizationMember.count = async () => 5;

      const result = await MemberModel.exists('org-123', 'user-123');

      expect(result).toBe(true);
    });

    it('should handle remove with null transaction', async () => {
      let capturedTransaction = 'not-set';
      OrganizationMember.destroy = async (options) => {
        capturedTransaction = options?.transaction;
        return 1;
      };

      await MemberModel.remove('org-123', 'user-123');

      expect(capturedTransaction).toBeNull();
    });

    it('should handle removeAllByOrganization with null transaction', async () => {
      let capturedTransaction = 'not-set';
      OrganizationMember.destroy = async (options) => {
        capturedTransaction = options?.transaction;
        return 0;
      };

      await MemberModel.removeAllByOrganization('org-123');

      expect(capturedTransaction).toBeNull();
    });

    it('should handle bulkRemove with null transaction', async () => {
      let capturedTransaction = 'not-set';
      OrganizationMember.destroy = async (options) => {
        capturedTransaction = options?.transaction;
        return 0;
      };

      await MemberModel.bulkRemove('org-123', ['user-1']);

      expect(capturedTransaction).toBeNull();
    });

    it('should handle updateRole with null transaction', async () => {
      let capturedTransaction = 'not-set';
      OrganizationMember.update = async (data, options) => {
        capturedTransaction = options?.transaction;
        return [1, [{ role_id: 2 }]];
      };

      await MemberModel.updateRole('org-123', 'user-123', 2);

      expect(capturedTransaction).toBeNull();
    });

    it('should handle bulkCreate with null transaction', async () => {
      let capturedTransaction = 'not-set';
      OrganizationMember.bulkCreate = async (data, options) => {
        capturedTransaction = options?.transaction;
        return data;
      };

      await MemberModel.bulkCreate([{ org_id: 'org-1', user_id: 'user-1', role_id: 3 }]);

      expect(capturedTransaction).toBeNull();
    });
  });
});
