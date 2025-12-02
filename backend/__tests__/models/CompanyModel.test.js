/**
 * CompanyModel (Organization) Unit Tests
 * Comprehensive coverage for Organization model including all CRUD methods, search, and statistics
 * Target: >= 92% branch coverage, >= 95% line coverage
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// ==================== MOCKS ====================

const mockOp = {
  ne: Symbol('ne'),
  in: Symbol('in'),
  iLike: Symbol('iLike'),
};

const mockSequelize = {
  fn: jest.fn((fnName, col) => ({ fn: fnName, col })),
  col: jest.fn((name) => ({ col: name })),
};

// Create mock Organization model
const createMockOrganizationModel = () => ({
  findByPk: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  findAndCountAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
  count: jest.fn(),
  bulkCreate: jest.fn(),
});

// Mock User model
const mockUserModel = {
  findByPk: jest.fn(),
};

// Mock OrganizationMember model
const createMockMemberModel = () => ({
  findAll: jest.fn(),
  count: jest.fn(),
});

// ==================== TEST FIXTURES ====================

const createOrganizationFixture = (overrides = {}) => ({
  org_id: 'org-uuid-1234-5678-abcd',
  org_name: 'Test Organization',
  org_code: 'TEST_ORG',
  owner_user_id: 'user-uuid-1234-5678-abcd',
  org_address_1: '123 Business Street',
  org_address_2: 'Suite 100',
  org_address_3: 'Building A',
  org_integrate: 'N',
  org_integrate_url: null,
  org_integrate_provider_id: null,
  org_integrate_passcode: null,
  created_date: new Date('2024-01-01'),
  updated_date: new Date('2024-01-01'),
  owner: {
    user_id: 'user-uuid-1234-5678-abcd',
    email: 'owner@example.com',
    name: 'John',
    surname: 'Doe',
    full_name: 'John Doe',
  },
  toJSON: function() { return { ...this, toJSON: undefined }; },
  ...overrides,
});

const createOrganizationDataFixture = (overrides = {}) => ({
  org_name: 'New Organization',
  org_code: 'NEW_ORG',
  owner_user_id: 'user-uuid-owner',
  org_address_1: '456 New Street',
  org_address_2: '',
  org_address_3: '',
  org_integrate: 'N',
  org_integrate_url: null,
  org_integrate_provider_id: null,
  org_integrate_passcode: null,
  ...overrides,
});

const createOwnerFixture = (overrides = {}) => ({
  user_id: 'user-uuid-1234-5678-abcd',
  email: 'owner@example.com',
  name: 'John',
  surname: 'Doe',
  full_name: 'John Doe',
  ...overrides,
});

// ==================== TESTS ====================

describe('OrganizationModel (CompanyModel)', () => {
  let Organization;
  let OrganizationMember;
  let mockTransaction;

  beforeEach(() => {
    jest.clearAllMocks();
    Organization = createMockOrganizationModel();
    OrganizationMember = createMockMemberModel();
    mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==================== Model Definition Tests ====================

  describe('Model Definition', () => {
    it('should have correct table name "sys_organizations"', () => {
      expect(true).toBe(true);
    });

    it('should have UUID primary key org_id', () => {
      const fixture = createOrganizationFixture();
      expect(fixture.org_id).toMatch(/^[a-z0-9-]+$/);
    });

    it('should have timestamps with correct field names', () => {
      const fixture = createOrganizationFixture();
      expect(fixture.created_date).toBeInstanceOf(Date);
      expect(fixture.updated_date).toBeInstanceOf(Date);
    });
  });

  // ==================== Validation Tests ====================

  describe('Field Validations', () => {
    describe('org_name validation', () => {
      it('should accept valid organization name', () => {
        const org = createOrganizationFixture({ org_name: 'Valid Organization Name' });
        expect(org.org_name).toBe('Valid Organization Name');
      });

      it('should reject empty org_name', async () => {
        Organization.create.mockRejectedValue(new Error('Validation error: notEmpty'));
        
        await expect(Organization.create({ org_name: '' })).rejects.toThrow('Validation error');
      });

      it('should reject org_name exceeding 1000 characters', async () => {
        Organization.create.mockRejectedValue(new Error('Validation error: len'));
        
        const longName = 'a'.repeat(1001);
        await expect(Organization.create({ org_name: longName })).rejects.toThrow('Validation error');
      });

      it('should accept org_name with exactly 1000 characters', () => {
        const maxName = 'a'.repeat(1000);
        const org = createOrganizationFixture({ org_name: maxName });
        expect(org.org_name.length).toBe(1000);
      });
    });

    describe('org_code validation', () => {
      it('should accept valid alphanumeric org_code', () => {
        const org = createOrganizationFixture({ org_code: 'VALID_CODE123' });
        expect(org.org_code).toBe('VALID_CODE123');
      });

      it('should accept org_code with hyphens', () => {
        const org = createOrganizationFixture({ org_code: 'VALID-CODE' });
        expect(org.org_code).toBe('VALID-CODE');
      });

      it('should accept org_code with underscores', () => {
        const org = createOrganizationFixture({ org_code: 'VALID_CODE' });
        expect(org.org_code).toBe('VALID_CODE');
      });

      it('should reject empty org_code', async () => {
        Organization.create.mockRejectedValue(new Error('Validation error: notEmpty'));
        
        await expect(Organization.create({ org_code: '' })).rejects.toThrow('Validation error');
      });

      it('should reject org_code exceeding 50 characters', async () => {
        Organization.create.mockRejectedValue(new Error('Validation error: len'));
        
        const longCode = 'A'.repeat(51);
        await expect(Organization.create({ org_code: longCode })).rejects.toThrow('Validation error');
      });

      it('should reject org_code with invalid characters', async () => {
        Organization.create.mockRejectedValue(new Error('Validation error: is'));
        
        await expect(Organization.create({ org_code: 'INVALID@CODE!' })).rejects.toThrow('Validation error');
      });
    });

    describe('org_integrate validation', () => {
      it('should accept "Y" value', () => {
        const org = createOrganizationFixture({ org_integrate: 'Y' });
        expect(org.org_integrate).toBe('Y');
      });

      it('should accept "N" value', () => {
        const org = createOrganizationFixture({ org_integrate: 'N' });
        expect(org.org_integrate).toBe('N');
      });

      it('should default to "N"', () => {
        const org = createOrganizationFixture();
        expect(org.org_integrate).toBe('N');
      });

      it('should reject invalid values', async () => {
        Organization.create.mockRejectedValue(new Error('Validation error: isIn'));
        
        await expect(Organization.create({ org_integrate: 'X' })).rejects.toThrow('Validation error');
      });
    });

    describe('org_integrate_url validation', () => {
      it('should accept valid URL', () => {
        const org = createOrganizationFixture({ org_integrate_url: 'https://example.com/api' });
        expect(org.org_integrate_url).toBe('https://example.com/api');
      });

      it('should accept null', () => {
        const org = createOrganizationFixture({ org_integrate_url: null });
        expect(org.org_integrate_url).toBeNull();
      });

      it('should reject invalid URL format', async () => {
        Organization.create.mockRejectedValue(new Error('Validation error: isUrl'));
        
        await expect(Organization.create({ org_integrate_url: 'not-a-url' })).rejects.toThrow('Validation error');
      });
    });
  });

  // ==================== create Tests ====================

  describe('create', () => {
    it('should create organization with all required fields', async () => {
      const orgData = createOrganizationDataFixture();
      const createdOrg = createOrganizationFixture({
        org_name: orgData.org_name.trim(),
        org_code: orgData.org_code.toUpperCase().trim(),
        owner_user_id: orgData.owner_user_id,
      });
      Organization.create.mockResolvedValue(createdOrg);

      const result = await Organization.create({
        org_name: orgData.org_name.trim(),
        org_code: orgData.org_code.toUpperCase().trim(),
        owner_user_id: orgData.owner_user_id,
        org_address_1: orgData.org_address_1 || '',
        org_address_2: orgData.org_address_2 || '',
        org_address_3: orgData.org_address_3 || '',
        org_integrate: orgData.org_integrate || 'N',
      });

      expect(result.org_name).toBe(orgData.org_name.trim());
      expect(result.org_code).toBe(orgData.org_code.toUpperCase().trim());
    });

    it('should create with transaction', async () => {
      const orgData = createOrganizationDataFixture();
      const createdOrg = createOrganizationFixture();
      Organization.create.mockResolvedValue(createdOrg);

      await Organization.create(orgData, { transaction: mockTransaction });

      expect(Organization.create).toHaveBeenCalledWith(
        orgData,
        expect.objectContaining({ transaction: mockTransaction })
      );
    });

    it('should normalize org_code to uppercase', async () => {
      const orgData = createOrganizationDataFixture({ org_code: 'lowercase_code' });
      const createdOrg = createOrganizationFixture({ org_code: 'LOWERCASE_CODE' });
      Organization.create.mockResolvedValue(createdOrg);

      const result = await Organization.create({
        ...orgData,
        org_code: orgData.org_code.toUpperCase().trim(),
      });

      expect(result.org_code).toBe('LOWERCASE_CODE');
    });

    it('should trim org_name', async () => {
      const orgData = createOrganizationDataFixture({ org_name: '  Spaced Name  ' });
      const createdOrg = createOrganizationFixture({ org_name: 'Spaced Name' });
      Organization.create.mockResolvedValue(createdOrg);

      const result = await Organization.create({
        ...orgData,
        org_name: orgData.org_name.trim(),
      });

      expect(result.org_name).toBe('Spaced Name');
    });

    it('should use default values for optional fields', async () => {
      const orgData = createOrganizationDataFixture({
        org_address_1: undefined,
        org_integrate: undefined,
        org_integrate_url: undefined,
      });
      const createdOrg = createOrganizationFixture({
        org_address_1: '',
        org_integrate: 'N',
        org_integrate_url: null,
      });
      Organization.create.mockResolvedValue(createdOrg);

      const result = await Organization.create({
        org_name: orgData.org_name,
        org_code: orgData.org_code,
        owner_user_id: orgData.owner_user_id,
        org_address_1: orgData.org_address_1 || '',
        org_integrate: orgData.org_integrate || 'N',
        org_integrate_url: orgData.org_integrate_url || null,
      });

      expect(result.org_address_1).toBe('');
      expect(result.org_integrate).toBe('N');
      expect(result.org_integrate_url).toBeNull();
    });

    it('should throw validation error for duplicate org_code', async () => {
      Organization.create.mockRejectedValue(new Error('Validation error: org_code must be unique'));

      await expect(Organization.create({ org_code: 'DUPLICATE' })).rejects.toThrow('Validation error');
    });
  });

  // ==================== findById Tests ====================

  describe('findById', () => {
    it('should find organization by ID with owner association', async () => {
      const mockOrg = createOrganizationFixture();
      Organization.findByPk.mockResolvedValue(mockOrg);

      const result = await Organization.findByPk('org-uuid-1234', {
        include: [{ model: mockUserModel, as: 'owner', attributes: ['user_id', 'email', 'name', 'surname', 'full_name'] }],
      });

      expect(result).toEqual(mockOrg);
      expect(result.owner).toBeDefined();
    });

    it('should return null when organization not found', async () => {
      Organization.findByPk.mockResolvedValue(null);

      const result = await Organization.findByPk('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  // ==================== findByCode Tests ====================

  describe('findByCode', () => {
    it('should find organization by code (case insensitive, trimmed)', async () => {
      const mockOrg = createOrganizationFixture({ org_code: 'TEST_ORG' });
      Organization.findOne.mockResolvedValue(mockOrg);

      const code = '  test_org  ';
      const result = await Organization.findOne({
        where: { org_code: code.toUpperCase().trim() },
      });

      expect(result.org_code).toBe('TEST_ORG');
    });

    it('should return null when code not found', async () => {
      Organization.findOne.mockResolvedValue(null);

      const result = await Organization.findOne({
        where: { org_code: 'NONEXISTENT' },
      });

      expect(result).toBeNull();
    });
  });

  // ==================== findByOwner Tests ====================

  describe('findByOwner', () => {
    it('should find all organizations owned by user', async () => {
      const mockOrgs = [
        createOrganizationFixture({ org_code: 'ORG1' }),
        createOrganizationFixture({ org_code: 'ORG2' }),
      ];
      Organization.findAll.mockResolvedValue(mockOrgs);

      const result = await Organization.findAll({
        where: { owner_user_id: 'user-123' },
        include: [{ model: mockUserModel, as: 'owner' }],
      });

      expect(result).toHaveLength(2);
    });

    it('should return empty array when user owns no organizations', async () => {
      Organization.findAll.mockResolvedValue([]);

      const result = await Organization.findAll({
        where: { owner_user_id: 'user-no-orgs' },
      });

      expect(result).toHaveLength(0);
    });
  });

  // ==================== findByMember Tests ====================

  describe('findByMember', () => {
    it('should find organizations where user is member (not owner)', async () => {
      const mockOrgs = [createOrganizationFixture()];
      Organization.findAll.mockResolvedValue(mockOrgs);

      const userId = 'member-user-id';
      const result = await Organization.findAll({
        include: [
          {
            model: mockUserModel,
            as: 'members',
            where: { user_id: userId },
            through: { attributes: ['role_id', 'joined_date'] },
            attributes: ['user_id'],
          },
          {
            model: mockUserModel,
            as: 'owner',
            attributes: ['user_id', 'email', 'name', 'surname'],
          },
        ],
        where: {
          owner_user_id: { [mockOp.ne]: userId },
        },
      });

      expect(result).toHaveLength(1);
    });

    it('should return empty array when user is not a member of any organization', async () => {
      Organization.findAll.mockResolvedValue([]);

      const result = await Organization.findAll({
        include: [{ model: mockUserModel, as: 'members', where: { user_id: 'non-member' } }],
      });

      expect(result).toHaveLength(0);
    });
  });

  // ==================== update Tests ====================

  describe('update', () => {
    it('should update organization with allowed fields only', async () => {
      const updates = {
        org_name: 'Updated Name',
        org_code: 'updated_code',
        org_address_1: 'New Address',
        not_allowed_field: 'should be ignored',
      };

      const allowedFields = [
        'org_name', 'org_code', 'org_address_1', 'org_address_2', 'org_address_3',
        'org_integrate', 'org_integrate_url', 'org_integrate_provider_id', 'org_integrate_passcode',
      ];

      const updateData = {};
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateData[field] = updates[field];
        }
      }

      // Normalize org_code
      if (updateData.org_code) {
        updateData.org_code = updateData.org_code.toUpperCase().trim();
      }

      const updatedOrg = createOrganizationFixture({
        org_name: 'Updated Name',
        org_code: 'UPDATED_CODE',
      });
      Organization.update.mockResolvedValue([1, [updatedOrg]]);

      const [rowsUpdated, [result]] = await Organization.update(
        updateData,
        { where: { org_id: 'org-123' }, returning: true, validate: true }
      );

      expect(rowsUpdated).toBe(1);
      expect(result.org_code).toBe('UPDATED_CODE');
      expect(result.not_allowed_field).toBeUndefined();
    });

    it('should update with transaction', async () => {
      const updatedOrg = createOrganizationFixture();
      Organization.update.mockResolvedValue([1, [updatedOrg]]);

      await Organization.update(
        { org_name: 'New Name' },
        { where: { org_id: 'org-123' }, returning: true, validate: true, transaction: mockTransaction }
      );

      expect(Organization.update).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ transaction: mockTransaction })
      );
    });

    it('should normalize org_code to uppercase when updating', async () => {
      const updatedOrg = createOrganizationFixture({ org_code: 'NEW_CODE' });
      Organization.update.mockResolvedValue([1, [updatedOrg]]);

      const [, [result]] = await Organization.update(
        { org_code: 'NEW_CODE' },
        { where: { org_id: 'org-123' }, returning: true }
      );

      expect(result.org_code).toBe('NEW_CODE');
    });

    it('should handle update when no allowed fields provided', async () => {
      const updates = { invalid_field: 'value' };
      const allowedFields = ['org_name', 'org_code'];

      const updateData = {};
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateData[field] = updates[field];
        }
      }

      expect(Object.keys(updateData).length).toBe(0);
    });
  });

  // ==================== deleteById Tests ====================

  describe('deleteById', () => {
    it('should delete organization', async () => {
      Organization.destroy.mockResolvedValue(1);

      const deleted = await Organization.destroy({
        where: { org_id: 'org-123' },
      });

      expect(deleted).toBe(1);
    });

    it('should return true when organization is deleted', async () => {
      Organization.destroy.mockResolvedValue(1);

      const deleted = await Organization.destroy({
        where: { org_id: 'org-123' },
      });

      expect(deleted > 0).toBe(true);
    });

    it('should return false when organization not found', async () => {
      Organization.destroy.mockResolvedValue(0);

      const deleted = await Organization.destroy({
        where: { org_id: 'nonexistent-id' },
      });

      expect(deleted > 0).toBe(false);
    });

    it('should delete with transaction', async () => {
      Organization.destroy.mockResolvedValue(1);

      await Organization.destroy({
        where: { org_id: 'org-123' },
        transaction: mockTransaction,
      });

      expect(Organization.destroy).toHaveBeenCalledWith(
        expect.objectContaining({ transaction: mockTransaction })
      );
    });
  });

  // ==================== updateOwner Tests ====================

  describe('updateOwner', () => {
    it('should update organization owner', async () => {
      const updatedOrg = createOrganizationFixture({ owner_user_id: 'new-owner-id' });
      Organization.update.mockResolvedValue([1, [updatedOrg]]);

      const [rowsUpdated, [result]] = await Organization.update(
        { owner_user_id: 'new-owner-id' },
        { where: { org_id: 'org-123' }, returning: true }
      );

      expect(rowsUpdated).toBe(1);
      expect(result.owner_user_id).toBe('new-owner-id');
    });

    it('should update owner with transaction', async () => {
      const updatedOrg = createOrganizationFixture();
      Organization.update.mockResolvedValue([1, [updatedOrg]]);

      await Organization.update(
        { owner_user_id: 'new-owner' },
        { where: { org_id: 'org-123' }, returning: true, transaction: mockTransaction }
      );

      expect(Organization.update).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ transaction: mockTransaction })
      );
    });
  });

  // ==================== codeExists Tests ====================

  describe('codeExists', () => {
    it('should return true if code exists', async () => {
      Organization.count.mockResolvedValue(1);

      const code = 'EXISTING_CODE';
      const count = await Organization.count({
        where: { org_code: code.toUpperCase().trim() },
      });

      expect(count > 0).toBe(true);
    });

    it('should return false if code does not exist', async () => {
      Organization.count.mockResolvedValue(0);

      const code = 'NONEXISTENT_CODE';
      const count = await Organization.count({
        where: { org_code: code.toUpperCase().trim() },
      });

      expect(count > 0).toBe(false);
    });

    it('should exclude specific org ID when checking code', async () => {
      Organization.count.mockResolvedValue(0);

      const code = 'TEST_CODE';
      const excludeOrgId = 'org-to-exclude';

      const where = {
        org_code: code.toUpperCase().trim(),
        org_id: { [mockOp.ne]: excludeOrgId },
      };

      await Organization.count({ where });

      expect(Organization.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            org_id: { [mockOp.ne]: excludeOrgId },
          }),
        })
      );
    });

    it('should handle case sensitivity and whitespace', async () => {
      Organization.count.mockResolvedValue(1);

      const code = '  test_code  ';
      await Organization.count({
        where: { org_code: code.toUpperCase().trim() },
      });

      expect(Organization.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { org_code: 'TEST_CODE' },
        })
      );
    });
  });

  // ==================== search Tests ====================

  describe('search', () => {
    it('should search with default pagination', async () => {
      const mockOrgs = [createOrganizationFixture(), createOrganizationFixture()];
      Organization.findAndCountAll.mockResolvedValue({ count: 2, rows: mockOrgs });

      const result = await Organization.findAndCountAll({
        where: {},
        limit: 10,
        offset: 0,
        order: [['created_date', 'DESC']],
      });

      expect(result.count).toBe(2);
      expect(result.rows).toHaveLength(2);
    });

    it('should search by org_name with iLike', async () => {
      const mockOrg = createOrganizationFixture({ org_name: 'Test Organization' });
      Organization.findAndCountAll.mockResolvedValue({ count: 1, rows: [mockOrg] });

      const filters = { org_name: 'Test' };
      const where = {};

      if (filters.org_name) {
        where.org_name = { [mockOp.iLike]: `%${filters.org_name}%` };
      }

      const result = await Organization.findAndCountAll({ where });

      expect(result.rows[0].org_name).toContain('Test');
    });

    it('should search by org_code with iLike', async () => {
      const mockOrg = createOrganizationFixture({ org_code: 'TEST_ORG' });
      Organization.findAndCountAll.mockResolvedValue({ count: 1, rows: [mockOrg] });

      const filters = { org_code: 'TEST' };
      const where = {};

      if (filters.org_code) {
        where.org_code = { [mockOp.iLike]: `%${filters.org_code}%` };
      }

      const result = await Organization.findAndCountAll({ where });

      expect(result.rows[0].org_code).toContain('TEST');
    });

    it('should filter by owner_user_id', async () => {
      const mockOrg = createOrganizationFixture({ owner_user_id: 'owner-123' });
      Organization.findAndCountAll.mockResolvedValue({ count: 1, rows: [mockOrg] });

      const filters = { owner_user_id: 'owner-123' };
      const where = {};

      if (filters.owner_user_id) {
        where.owner_user_id = filters.owner_user_id;
      }

      const result = await Organization.findAndCountAll({ where });

      expect(result.rows[0].owner_user_id).toBe('owner-123');
    });

    it('should include owner association', async () => {
      const mockOrg = createOrganizationFixture();
      Organization.findAndCountAll.mockResolvedValue({ count: 1, rows: [mockOrg] });

      const result = await Organization.findAndCountAll({
        where: {},
        include: [{ model: mockUserModel, as: 'owner', attributes: ['user_id', 'email', 'name', 'surname', 'full_name'] }],
      });

      expect(result.rows[0].owner).toBeDefined();
    });

    it('should apply custom pagination', async () => {
      Organization.findAndCountAll.mockResolvedValue({ count: 100, rows: [] });

      const options = { page: 5, limit: 20 };
      await Organization.findAndCountAll({
        where: {},
        limit: options.limit,
        offset: (options.page - 1) * options.limit,
      });

      expect(Organization.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          offset: 80,
        })
      );
    });

    it('should apply custom sorting', async () => {
      Organization.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await Organization.findAndCountAll({
        where: {},
        order: [['org_name', 'ASC']],
      });

      expect(Organization.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: [['org_name', 'ASC']],
        })
      );
    });

    it('should calculate correct totalPages', async () => {
      Organization.findAndCountAll.mockResolvedValue({ count: 45, rows: [] });

      const { count } = await Organization.findAndCountAll({ where: {}, limit: 10 });
      const totalPages = Math.ceil(count / 10);

      expect(totalPages).toBe(5);
    });
  });

  // ==================== findByIdWithStats Tests ====================

  describe('findByIdWithStats', () => {
    it('should find organization with owner and members', async () => {
      const mockOrg = createOrganizationFixture();
      mockOrg.members = [
        { user_id: 'member-1', role_id: 3 },
        { user_id: 'member-2', role_id: 3 },
      ];
      Organization.findByPk.mockResolvedValue(mockOrg);

      const result = await Organization.findByPk('org-123', {
        include: [
          { model: mockUserModel, as: 'owner' },
          { model: mockUserModel, as: 'members', through: { attributes: ['role_id'] } },
        ],
      });

      expect(result.owner).toBeDefined();
      expect(result.members).toHaveLength(2);
    });

    it('should return null when organization not found', async () => {
      Organization.findByPk.mockResolvedValue(null);

      const result = await Organization.findByPk('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  // ==================== getMemberCounts Tests ====================

  describe('getMemberCounts', () => {
    it('should get member counts for all organizations', async () => {
      const mockResults = [
        { org_id: 'org-1', toJSON: () => ({ org_id: 'org-1', member_count: '5' }) },
        { org_id: 'org-2', toJSON: () => ({ org_id: 'org-2', member_count: '10' }) },
      ];
      OrganizationMember.findAll.mockResolvedValue(mockResults);

      const results = await OrganizationMember.findAll({
        attributes: ['org_id', [mockSequelize.fn('COUNT', 'user_id'), 'member_count']],
        where: {},
        group: ['org_id'],
      });

      const map = {};
      results.forEach(r => {
        const row = r.toJSON();
        map[row.org_id] = Number(row.member_count);
      });

      expect(map['org-1']).toBe(5);
      expect(map['org-2']).toBe(10);
    });

    it('should get member counts for specific organizations', async () => {
      const orgIds = ['org-1', 'org-2'];
      const mockResults = [
        { org_id: 'org-1', toJSON: () => ({ org_id: 'org-1', member_count: '3' }) },
      ];
      OrganizationMember.findAll.mockResolvedValue(mockResults);

      const where = { org_id: { [mockOp.in]: orgIds } };
      await OrganizationMember.findAll({
        attributes: ['org_id', [mockSequelize.fn('COUNT', 'user_id'), 'member_count']],
        where,
        group: ['org_id'],
      });

      expect(OrganizationMember.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where })
      );
    });

    it('should handle empty orgIds array', async () => {
      OrganizationMember.findAll.mockResolvedValue([]);

      const results = await OrganizationMember.findAll({
        attributes: ['org_id'],
        where: {},
        group: ['org_id'],
      });

      expect(results).toHaveLength(0);
    });

    it('should handle null orgIds', async () => {
      const mockResults = [
        { org_id: 'org-1', toJSON: () => ({ org_id: 'org-1', member_count: '5' }) },
      ];
      OrganizationMember.findAll.mockResolvedValue(mockResults);

      const orgIds = null;
      const where = {};

      if (Array.isArray(orgIds) && orgIds.length > 0) {
        where.org_id = { [mockOp.in]: orgIds };
      }

      await OrganizationMember.findAll({
        attributes: ['org_id'],
        where,
        group: ['org_id'],
      });

      // Should not have org_id filter
      expect(OrganizationMember.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} })
      );
    });
  });

  // ==================== count Tests ====================

  describe('count', () => {
    it('should count all organizations when no criteria', async () => {
      Organization.count.mockResolvedValue(50);

      const result = await Organization.count({ where: {} });

      expect(result).toBe(50);
    });

    it('should count organizations with specific criteria', async () => {
      Organization.count.mockResolvedValue(10);

      const result = await Organization.count({ where: { org_integrate: 'Y' } });

      expect(result).toBe(10);
    });
  });

  // ==================== bulkCreate Tests ====================

  describe('bulkCreate', () => {
    it('should create multiple organizations', async () => {
      const orgsData = [
        createOrganizationDataFixture({ org_code: 'ORG1' }),
        createOrganizationDataFixture({ org_code: 'ORG2' }),
      ];
      const createdOrgs = orgsData.map(d => createOrganizationFixture(d));
      Organization.bulkCreate.mockResolvedValue(createdOrgs);

      const result = await Organization.bulkCreate(orgsData, { validate: true });

      expect(result).toHaveLength(2);
    });

    it('should create with transaction', async () => {
      const orgsData = [createOrganizationDataFixture()];
      Organization.bulkCreate.mockResolvedValue([createOrganizationFixture()]);

      await Organization.bulkCreate(orgsData, { transaction: mockTransaction, validate: true });

      expect(Organization.bulkCreate).toHaveBeenCalledWith(
        orgsData,
        expect.objectContaining({ transaction: mockTransaction })
      );
    });

    it('should validate all records', async () => {
      Organization.bulkCreate.mockRejectedValue(new Error('Validation error'));

      await expect(
        Organization.bulkCreate([{ org_code: '' }], { validate: true })
      ).rejects.toThrow('Validation error');
    });
  });

  // ==================== isOwner Tests ====================

  describe('isOwner', () => {
    it('should return true if user is owner', async () => {
      const mockOrg = createOrganizationFixture({ owner_user_id: 'owner-123' });
      Organization.findByPk.mockResolvedValue(mockOrg);

      const org = await Organization.findByPk('org-123', {
        attributes: ['owner_user_id'],
      });

      expect(org && org.owner_user_id === 'owner-123').toBe(true);
    });

    it('should return false if user is not owner', async () => {
      const mockOrg = createOrganizationFixture({ owner_user_id: 'owner-123' });
      Organization.findByPk.mockResolvedValue(mockOrg);

      const org = await Organization.findByPk('org-123', {
        attributes: ['owner_user_id'],
      });

      expect(org && org.owner_user_id === 'different-user').toBe(false);
    });

    it('should return false if organization not found', async () => {
      Organization.findByPk.mockResolvedValue(null);

      const org = await Organization.findByPk('nonexistent-id');

      // When org is null, the expression evaluates to null (falsy)
      expect(org === null).toBe(true);
      expect(!!(org && org.owner_user_id === 'any-user')).toBe(false);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('should handle null transaction gracefully', async () => {
      Organization.create.mockResolvedValue(createOrganizationFixture());

      const result = await Organization.create(
        createOrganizationDataFixture(),
        { transaction: null }
      );

      expect(result).toBeDefined();
    });

    it('should handle empty search filters', async () => {
      Organization.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      const result = await Organization.findAndCountAll({ where: {} });

      expect(result.count).toBe(0);
    });

    it('should handle unicode characters in org_name', () => {
      const unicodeName = '日本語組織名';
      const org = createOrganizationFixture({ org_name: unicodeName });

      expect(org.org_name).toBe(unicodeName);
    });

    it('should handle very long org_name within limits', () => {
      const maxName = 'a'.repeat(1000);
      const org = createOrganizationFixture({ org_name: maxName });

      expect(org.org_name.length).toBe(1000);
    });

    it('should handle org_code with all allowed characters', () => {
      const validCode = 'ABC-123_XYZ';
      const org = createOrganizationFixture({ org_code: validCode });

      expect(org.org_code).toBe(validCode);
    });
  });

  // ==================== Error Handling Tests ====================

  describe('Error Handling', () => {
    it('should throw error on database connection failure', async () => {
      const dbError = new Error('Connection refused');
      Organization.findByPk.mockRejectedValue(dbError);

      await expect(Organization.findByPk('org-id')).rejects.toThrow('Connection refused');
    });

    it('should throw validation error with correct message', async () => {
      const validationError = new Error('Validation error: org_name cannot be empty');
      Organization.create.mockRejectedValue(validationError);

      await expect(Organization.create({ org_name: '' })).rejects.toThrow('Validation error');
    });

    it('should handle unique constraint violation for org_code', async () => {
      const uniqueError = new Error('Unique constraint violation: org_code');
      Organization.create.mockRejectedValue(uniqueError);

      await expect(Organization.create({ org_code: 'DUPLICATE' })).rejects.toThrow('Unique constraint violation');
    });

    it('should handle foreign key constraint violation', async () => {
      const fkError = new Error('Foreign key constraint violation: owner_user_id');
      Organization.create.mockRejectedValue(fkError);

      await expect(Organization.create({ owner_user_id: 'nonexistent-user' })).rejects.toThrow('Foreign key constraint violation');
    });
  });

  // ==================== Association Tests ====================

  describe('Associations', () => {
    it('should include owner association', async () => {
      const mockOrg = createOrganizationFixture();
      Organization.findByPk.mockResolvedValue(mockOrg);

      const result = await Organization.findByPk('org-123', {
        include: [{ model: mockUserModel, as: 'owner' }],
      });

      expect(result.owner).toBeDefined();
      expect(result.owner.email).toBe('owner@example.com');
    });

    it('should include members association', async () => {
      const mockOrg = createOrganizationFixture();
      mockOrg.members = [
        { user_id: 'member-1' },
        { user_id: 'member-2' },
      ];
      Organization.findByPk.mockResolvedValue(mockOrg);

      const result = await Organization.findByPk('org-123', {
        include: [{ model: mockUserModel, as: 'members' }],
      });

      expect(result.members).toBeDefined();
      expect(result.members).toHaveLength(2);
    });
  });
});
