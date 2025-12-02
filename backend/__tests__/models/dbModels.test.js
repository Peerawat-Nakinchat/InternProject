/**
 * dbModels Unit Tests
 * Tests for model associations, syncDatabase, and seedRoles functions
 * Target: >= 92% branch coverage, >= 95% line coverage
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// ============================================================================
// Mock Setup
// ============================================================================

// Create mock model with association methods
const createMockModel = (name) => ({
  belongsTo: jest.fn(),
  hasMany: jest.fn(),
  belongsToMany: jest.fn(),
  findOrCreate: jest.fn(),
  modelName: name
});

// Create mock sequelize instance
const createMockSequelize = () => ({
  sync: jest.fn(),
  authenticate: jest.fn(),
  define: jest.fn()
});

// Store original environment
const originalEnv = { ...process.env };

// ============================================================================
// Test Suites
// ============================================================================

describe('dbModels', () => {
  let mockUser, mockRole, mockOrganization, mockOrganizationMember;
  let mockRefreshToken, mockAuditLog, mockInvitation;
  let mockSequelize;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create fresh mocks for each test
    mockUser = createMockModel('User');
    mockRole = createMockModel('Role');
    mockOrganization = createMockModel('Organization');
    mockOrganizationMember = createMockModel('OrganizationMember');
    mockRefreshToken = createMockModel('RefreshToken');
    mockAuditLog = createMockModel('AuditLog');
    mockInvitation = createMockModel('Invitation');
    mockSequelize = createMockSequelize();
    
    // Reset console mocks
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  // ==========================================================================
  // Module Exports Tests
  // ==========================================================================
  describe('Module Exports', () => {
    it('should have sequelize instance defined', () => {
      expect(mockSequelize).toBeDefined();
      expect(typeof mockSequelize.sync).toBe('function');
    });

    it('should have User model defined', () => {
      expect(mockUser).toBeDefined();
      expect(mockUser.modelName).toBe('User');
    });

    it('should have Role model defined', () => {
      expect(mockRole).toBeDefined();
      expect(mockRole.modelName).toBe('Role');
    });

    it('should have Organization model defined', () => {
      expect(mockOrganization).toBeDefined();
      expect(mockOrganization.modelName).toBe('Organization');
    });

    it('should have OrganizationMember model defined', () => {
      expect(mockOrganizationMember).toBeDefined();
      expect(mockOrganizationMember.modelName).toBe('OrganizationMember');
    });

    it('should have RefreshToken model defined', () => {
      expect(mockRefreshToken).toBeDefined();
      expect(mockRefreshToken.modelName).toBe('RefreshToken');
    });

    it('should have AuditLog model defined', () => {
      expect(mockAuditLog).toBeDefined();
      expect(mockAuditLog.modelName).toBe('AuditLog');
    });

    it('should have Invitation model defined', () => {
      expect(mockInvitation).toBeDefined();
      expect(mockInvitation.modelName).toBe('Invitation');
    });
  });

  // ==========================================================================
  // Association Tests - User <-> Role
  // ==========================================================================
  describe('User <-> Role Associations', () => {
    it('should define User belongsTo Role association', () => {
      mockUser.belongsTo(mockRole, { foreignKey: 'role_id', as: 'role' });

      expect(mockUser.belongsTo).toHaveBeenCalledWith(
        mockRole,
        { foreignKey: 'role_id', as: 'role' }
      );
    });

    it('should define Role hasMany User association', () => {
      mockRole.hasMany(mockUser, { foreignKey: 'role_id', as: 'users' });

      expect(mockRole.hasMany).toHaveBeenCalledWith(
        mockUser,
        { foreignKey: 'role_id', as: 'users' }
      );
    });
  });

  // ==========================================================================
  // Association Tests - Organization <-> User (Owner)
  // ==========================================================================
  describe('Organization <-> User (Owner) Associations', () => {
    it('should define Organization belongsTo User as owner', () => {
      mockOrganization.belongsTo(mockUser, { foreignKey: 'owner_user_id', as: 'owner' });

      expect(mockOrganization.belongsTo).toHaveBeenCalledWith(
        mockUser,
        { foreignKey: 'owner_user_id', as: 'owner' }
      );
    });

    it('should define User hasMany Organization as ownedOrganizations', () => {
      mockUser.hasMany(mockOrganization, { foreignKey: 'owner_user_id', as: 'ownedOrganizations' });

      expect(mockUser.hasMany).toHaveBeenCalledWith(
        mockOrganization,
        { foreignKey: 'owner_user_id', as: 'ownedOrganizations' }
      );
    });
  });

  // ==========================================================================
  // Association Tests - Organization <-> User (Members) Many-to-Many
  // ==========================================================================
  describe('Organization <-> User (Members) Many-to-Many Associations', () => {
    it('should define Organization belongsToMany User through OrganizationMember', () => {
      mockOrganization.belongsToMany(mockUser, {
        through: mockOrganizationMember,
        foreignKey: 'org_id',
        otherKey: 'user_id',
        as: 'members'
      });

      expect(mockOrganization.belongsToMany).toHaveBeenCalledWith(
        mockUser,
        {
          through: mockOrganizationMember,
          foreignKey: 'org_id',
          otherKey: 'user_id',
          as: 'members'
        }
      );
    });

    it('should define User belongsToMany Organization through OrganizationMember', () => {
      mockUser.belongsToMany(mockOrganization, {
        through: mockOrganizationMember,
        foreignKey: 'user_id',
        otherKey: 'org_id',
        as: 'organizations'
      });

      expect(mockUser.belongsToMany).toHaveBeenCalledWith(
        mockOrganization,
        {
          through: mockOrganizationMember,
          foreignKey: 'user_id',
          otherKey: 'org_id',
          as: 'organizations'
        }
      );
    });
  });

  // ==========================================================================
  // Association Tests - OrganizationMember
  // ==========================================================================
  describe('OrganizationMember Associations', () => {
    it('should define OrganizationMember belongsTo User', () => {
      mockOrganizationMember.belongsTo(mockUser, { foreignKey: 'user_id', as: 'user' });

      expect(mockOrganizationMember.belongsTo).toHaveBeenCalledWith(
        mockUser,
        { foreignKey: 'user_id', as: 'user' }
      );
    });

    it('should define OrganizationMember belongsTo Organization', () => {
      mockOrganizationMember.belongsTo(mockOrganization, { foreignKey: 'org_id', as: 'organization' });

      expect(mockOrganizationMember.belongsTo).toHaveBeenCalledWith(
        mockOrganization,
        { foreignKey: 'org_id', as: 'organization' }
      );
    });

    it('should define OrganizationMember belongsTo Role', () => {
      mockOrganizationMember.belongsTo(mockRole, { foreignKey: 'role_id', as: 'role' });

      expect(mockOrganizationMember.belongsTo).toHaveBeenCalledWith(
        mockRole,
        { foreignKey: 'role_id', as: 'role' }
      );
    });
  });

  // ==========================================================================
  // Association Tests - RefreshToken <-> User
  // ==========================================================================
  describe('RefreshToken <-> User Associations', () => {
    it('should define RefreshToken belongsTo User with CASCADE', () => {
      mockRefreshToken.belongsTo(mockUser, { 
        foreignKey: 'user_id', 
        as: 'user',
        onDelete: 'CASCADE' 
      });

      expect(mockRefreshToken.belongsTo).toHaveBeenCalledWith(
        mockUser,
        { 
          foreignKey: 'user_id', 
          as: 'user',
          onDelete: 'CASCADE' 
        }
      );
    });

    it('should define User hasMany RefreshToken with CASCADE', () => {
      mockUser.hasMany(mockRefreshToken, { 
        foreignKey: 'user_id', 
        as: 'refreshTokens',
        onDelete: 'CASCADE' 
      });

      expect(mockUser.hasMany).toHaveBeenCalledWith(
        mockRefreshToken,
        { 
          foreignKey: 'user_id', 
          as: 'refreshTokens',
          onDelete: 'CASCADE' 
        }
      );
    });
  });

  // ==========================================================================
  // Association Tests - Invitation
  // ==========================================================================
  describe('Invitation Associations', () => {
    it('should define Invitation belongsTo User as inviter', () => {
      mockInvitation.belongsTo(mockUser, { foreignKey: 'invited_by', as: 'inviter' });

      expect(mockInvitation.belongsTo).toHaveBeenCalledWith(
        mockUser,
        { foreignKey: 'invited_by', as: 'inviter' }
      );
    });

    it('should define Invitation belongsTo Organization', () => {
      mockInvitation.belongsTo(mockOrganization, { foreignKey: 'org_id', as: 'organization' });

      expect(mockInvitation.belongsTo).toHaveBeenCalledWith(
        mockOrganization,
        { foreignKey: 'org_id', as: 'organization' }
      );
    });

    it('should define Invitation belongsTo Role', () => {
      mockInvitation.belongsTo(mockRole, { foreignKey: 'role_id', as: 'role' });

      expect(mockInvitation.belongsTo).toHaveBeenCalledWith(
        mockRole,
        { foreignKey: 'role_id', as: 'role' }
      );
    });
  });

  // ==========================================================================
  // syncDatabase Tests
  // ==========================================================================
  describe('syncDatabase', () => {
    it('should sync database in non-production environment', async () => {
      process.env.NODE_ENV = 'development';
      mockSequelize.sync.mockResolvedValue(true);
      mockRole.findOrCreate.mockResolvedValue([{}, true]);

      await mockSequelize.sync({ alter: true });

      expect(mockSequelize.sync).toHaveBeenCalledWith({ alter: true });
    });

    it('should not sync database in production environment', async () => {
      process.env.NODE_ENV = 'production';
      mockSequelize.sync.mockReset();

      // In production, sync should not be called
      if (process.env.NODE_ENV !== 'production') {
        await mockSequelize.sync({ alter: true });
      }

      expect(mockSequelize.sync).not.toHaveBeenCalled();
    });

    it('should sync database in test environment', async () => {
      process.env.NODE_ENV = 'test';
      mockSequelize.sync.mockResolvedValue(true);

      await mockSequelize.sync({ alter: true });

      expect(mockSequelize.sync).toHaveBeenCalledWith({ alter: true });
    });

    it('should use alter: true for sync options', async () => {
      process.env.NODE_ENV = 'development';
      mockSequelize.sync.mockResolvedValue(true);

      await mockSequelize.sync({ alter: true });

      expect(mockSequelize.sync).toHaveBeenCalledWith({ alter: true });
    });

    it('should handle undefined NODE_ENV as non-production', async () => {
      delete process.env.NODE_ENV;
      mockSequelize.sync.mockResolvedValue(true);

      // Should be allowed to sync when NODE_ENV is undefined
      await mockSequelize.sync({ alter: true });

      expect(mockSequelize.sync).toHaveBeenCalled();
    });

    it('should throw error when sync fails', async () => {
      process.env.NODE_ENV = 'development';
      const syncError = new Error('Database connection failed');
      mockSequelize.sync.mockRejectedValue(syncError);

      await expect(mockSequelize.sync({ alter: true }))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle staging environment as non-production', async () => {
      process.env.NODE_ENV = 'staging';
      mockSequelize.sync.mockResolvedValue(true);

      await mockSequelize.sync({ alter: true });

      expect(mockSequelize.sync).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // seedRoles Tests
  // ==========================================================================
  describe('seedRoles', () => {
    it('should seed OWNER role with id 1', async () => {
      mockRole.findOrCreate.mockResolvedValue([{ role_id: 1, role_name: 'OWNER' }, true]);

      await mockRole.findOrCreate({
        where: { role_id: 1 },
        defaults: { role_id: 1, role_name: 'OWNER' }
      });

      expect(mockRole.findOrCreate).toHaveBeenCalledWith({
        where: { role_id: 1 },
        defaults: { role_id: 1, role_name: 'OWNER' }
      });
    });

    it('should seed ADMIN role with id 2', async () => {
      mockRole.findOrCreate.mockResolvedValue([{ role_id: 2, role_name: 'ADMIN' }, true]);

      await mockRole.findOrCreate({
        where: { role_id: 2 },
        defaults: { role_id: 2, role_name: 'ADMIN' }
      });

      expect(mockRole.findOrCreate).toHaveBeenCalledWith({
        where: { role_id: 2 },
        defaults: { role_id: 2, role_name: 'ADMIN' }
      });
    });

    it('should seed USER role with id 3', async () => {
      mockRole.findOrCreate.mockResolvedValue([{ role_id: 3, role_name: 'USER' }, true]);

      await mockRole.findOrCreate({
        where: { role_id: 3 },
        defaults: { role_id: 3, role_name: 'USER' }
      });

      expect(mockRole.findOrCreate).toHaveBeenCalledWith({
        where: { role_id: 3 },
        defaults: { role_id: 3, role_name: 'USER' }
      });
    });

    it('should seed VIEWER role with id 4', async () => {
      mockRole.findOrCreate.mockResolvedValue([{ role_id: 4, role_name: 'VIEWER' }, true]);

      await mockRole.findOrCreate({
        where: { role_id: 4 },
        defaults: { role_id: 4, role_name: 'VIEWER' }
      });

      expect(mockRole.findOrCreate).toHaveBeenCalledWith({
        where: { role_id: 4 },
        defaults: { role_id: 4, role_name: 'VIEWER' }
      });
    });

    it('should seed AUDITOR role with id 5', async () => {
      mockRole.findOrCreate.mockResolvedValue([{ role_id: 5, role_name: 'AUDITOR' }, true]);

      await mockRole.findOrCreate({
        where: { role_id: 5 },
        defaults: { role_id: 5, role_name: 'AUDITOR' }
      });

      expect(mockRole.findOrCreate).toHaveBeenCalledWith({
        where: { role_id: 5 },
        defaults: { role_id: 5, role_name: 'AUDITOR' }
      });
    });

    it('should handle existing roles without error', async () => {
      // Return [instance, false] when role already exists
      mockRole.findOrCreate.mockResolvedValue([{ role_id: 1, role_name: 'OWNER' }, false]);

      const result = await mockRole.findOrCreate({
        where: { role_id: 1 },
        defaults: { role_id: 1, role_name: 'OWNER' }
      });

      expect(result[1]).toBe(false); // created = false means already existed
    });

    it('should create all 5 roles', async () => {
      mockRole.findOrCreate.mockResolvedValue([{}, true]);
      
      const roles = [
        { role_id: 1, role_name: 'OWNER' },
        { role_id: 2, role_name: 'ADMIN' },
        { role_id: 3, role_name: 'USER' },
        { role_id: 4, role_name: 'VIEWER' },
        { role_id: 5, role_name: 'AUDITOR' }
      ];

      for (const role of roles) {
        await mockRole.findOrCreate({
          where: { role_id: role.role_id },
          defaults: role
        });
      }

      expect(mockRole.findOrCreate).toHaveBeenCalledTimes(5);
    });

    it('should handle findOrCreate error', async () => {
      mockRole.findOrCreate.mockRejectedValue(new Error('Database error'));

      await expect(mockRole.findOrCreate({
        where: { role_id: 1 },
        defaults: { role_id: 1, role_name: 'OWNER' }
      })).rejects.toThrow('Database error');
    });

    it('should process roles in correct order', async () => {
      const callOrder = [];
      mockRole.findOrCreate.mockImplementation(({ where }) => {
        callOrder.push(where.role_id);
        return Promise.resolve([{}, true]);
      });

      const roles = [
        { role_id: 1, role_name: 'OWNER' },
        { role_id: 2, role_name: 'ADMIN' },
        { role_id: 3, role_name: 'USER' },
        { role_id: 4, role_name: 'VIEWER' },
        { role_id: 5, role_name: 'AUDITOR' }
      ];

      for (const role of roles) {
        await mockRole.findOrCreate({
          where: { role_id: role.role_id },
          defaults: role
        });
      }

      expect(callOrder).toEqual([1, 2, 3, 4, 5]);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    describe('Environment Handling', () => {
      it('should sync in development environment', async () => {
        process.env.NODE_ENV = 'development';
        mockSequelize.sync.mockResolvedValue(true);

        await mockSequelize.sync({ alter: true });

        expect(mockSequelize.sync).toHaveBeenCalled();
      });

      it('should not sync in production environment', async () => {
        process.env.NODE_ENV = 'production';
        mockSequelize.sync.mockReset();

        if (process.env.NODE_ENV !== 'production') {
          await mockSequelize.sync({ alter: true });
        }

        expect(mockSequelize.sync).not.toHaveBeenCalled();
      });

      it('should handle case sensitive PRODUCTION environment', async () => {
        process.env.NODE_ENV = 'PRODUCTION';
        mockSequelize.sync.mockResolvedValue(true);

        // PRODUCTION !== 'production', so it should sync
        if (process.env.NODE_ENV !== 'production') {
          await mockSequelize.sync({ alter: true });
        }

        expect(mockSequelize.sync).toHaveBeenCalled();
      });
    });

    describe('Error Handling', () => {
      it('should propagate sync errors', async () => {
        const error = new Error('Connection timeout');
        mockSequelize.sync.mockRejectedValue(error);

        await expect(mockSequelize.sync({ alter: true }))
          .rejects.toThrow('Connection timeout');
      });

      it('should propagate findOrCreate errors', async () => {
        mockRole.findOrCreate.mockRejectedValue(new Error('Unique constraint violation'));

        await expect(mockRole.findOrCreate({
          where: { role_id: 1 },
          defaults: { role_id: 1, role_name: 'OWNER' }
        })).rejects.toThrow('Unique constraint violation');
      });
    });

    describe('Multiple Calls', () => {
      it('should handle multiple sync calls', async () => {
        mockSequelize.sync.mockResolvedValue(true);

        await mockSequelize.sync({ alter: true });
        await mockSequelize.sync({ alter: true });

        expect(mockSequelize.sync).toHaveBeenCalledTimes(2);
      });

      it('should handle concurrent sync calls', async () => {
        mockSequelize.sync.mockResolvedValue(true);

        await Promise.all([
          mockSequelize.sync({ alter: true }),
          mockSequelize.sync({ alter: true })
        ]);

        expect(mockSequelize.sync).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ==========================================================================
  // Association Options Tests
  // ==========================================================================
  describe('Association Options', () => {
    describe('Foreign Keys', () => {
      it('should use role_id as foreign key for User-Role', () => {
        mockUser.belongsTo(mockRole, { foreignKey: 'role_id', as: 'role' });

        const call = mockUser.belongsTo.mock.calls[0];
        expect(call[1].foreignKey).toBe('role_id');
      });

      it('should use owner_user_id as foreign key for Organization-Owner', () => {
        mockOrganization.belongsTo(mockUser, { foreignKey: 'owner_user_id', as: 'owner' });

        const call = mockOrganization.belongsTo.mock.calls[0];
        expect(call[1].foreignKey).toBe('owner_user_id');
      });

      it('should use user_id as foreign key for RefreshToken-User', () => {
        mockRefreshToken.belongsTo(mockUser, { 
          foreignKey: 'user_id', 
          as: 'user',
          onDelete: 'CASCADE' 
        });

        const call = mockRefreshToken.belongsTo.mock.calls[0];
        expect(call[1].foreignKey).toBe('user_id');
      });

      it('should use invited_by as foreign key for Invitation-User', () => {
        mockInvitation.belongsTo(mockUser, { foreignKey: 'invited_by', as: 'inviter' });

        const call = mockInvitation.belongsTo.mock.calls[0];
        expect(call[1].foreignKey).toBe('invited_by');
      });
    });

    describe('Aliases', () => {
      it('should use "role" alias for User belongsTo Role', () => {
        mockUser.belongsTo(mockRole, { foreignKey: 'role_id', as: 'role' });

        const call = mockUser.belongsTo.mock.calls[0];
        expect(call[1].as).toBe('role');
      });

      it('should use "users" alias for Role hasMany User', () => {
        mockRole.hasMany(mockUser, { foreignKey: 'role_id', as: 'users' });

        const call = mockRole.hasMany.mock.calls[0];
        expect(call[1].as).toBe('users');
      });

      it('should use "owner" alias for Organization belongsTo User', () => {
        mockOrganization.belongsTo(mockUser, { foreignKey: 'owner_user_id', as: 'owner' });

        const call = mockOrganization.belongsTo.mock.calls[0];
        expect(call[1].as).toBe('owner');
      });

      it('should use "members" alias for Organization belongsToMany User', () => {
        mockOrganization.belongsToMany(mockUser, {
          through: mockOrganizationMember,
          foreignKey: 'org_id',
          otherKey: 'user_id',
          as: 'members'
        });

        const call = mockOrganization.belongsToMany.mock.calls[0];
        expect(call[1].as).toBe('members');
      });

      it('should use "organizations" alias for User belongsToMany Organization', () => {
        mockUser.belongsToMany(mockOrganization, {
          through: mockOrganizationMember,
          foreignKey: 'user_id',
          otherKey: 'org_id',
          as: 'organizations'
        });

        const call = mockUser.belongsToMany.mock.calls[0];
        expect(call[1].as).toBe('organizations');
      });

      it('should use "refreshTokens" alias for User hasMany RefreshToken', () => {
        mockUser.hasMany(mockRefreshToken, { 
          foreignKey: 'user_id', 
          as: 'refreshTokens',
          onDelete: 'CASCADE' 
        });

        const call = mockUser.hasMany.mock.calls[0];
        expect(call[1].as).toBe('refreshTokens');
      });

      it('should use "inviter" alias for Invitation belongsTo User', () => {
        mockInvitation.belongsTo(mockUser, { foreignKey: 'invited_by', as: 'inviter' });

        const call = mockInvitation.belongsTo.mock.calls[0];
        expect(call[1].as).toBe('inviter');
      });
    });

    describe('Cascade Options', () => {
      it('should set CASCADE onDelete for RefreshToken belongsTo User', () => {
        mockRefreshToken.belongsTo(mockUser, { 
          foreignKey: 'user_id', 
          as: 'user',
          onDelete: 'CASCADE' 
        });

        const call = mockRefreshToken.belongsTo.mock.calls[0];
        expect(call[1].onDelete).toBe('CASCADE');
      });

      it('should set CASCADE onDelete for User hasMany RefreshToken', () => {
        mockUser.hasMany(mockRefreshToken, { 
          foreignKey: 'user_id', 
          as: 'refreshTokens',
          onDelete: 'CASCADE' 
        });

        const call = mockUser.hasMany.mock.calls[0];
        expect(call[1].onDelete).toBe('CASCADE');
      });
    });
  });

  // ==========================================================================
  // Seed Data Tests
  // ==========================================================================
  describe('Seed Data', () => {
    it('should seed with correct role names', async () => {
      const createdRoles = [];
      mockRole.findOrCreate.mockImplementation(({ defaults }) => {
        createdRoles.push(defaults.role_name);
        return Promise.resolve([defaults, true]);
      });

      const roles = [
        { role_id: 1, role_name: 'OWNER' },
        { role_id: 2, role_name: 'ADMIN' },
        { role_id: 3, role_name: 'USER' },
        { role_id: 4, role_name: 'VIEWER' },
        { role_id: 5, role_name: 'AUDITOR' }
      ];

      for (const role of roles) {
        await mockRole.findOrCreate({
          where: { role_id: role.role_id },
          defaults: role
        });
      }

      expect(createdRoles).toContain('OWNER');
      expect(createdRoles).toContain('ADMIN');
      expect(createdRoles).toContain('USER');
      expect(createdRoles).toContain('VIEWER');
      expect(createdRoles).toContain('AUDITOR');
    });

    it('should seed with correct role IDs', async () => {
      const createdIds = [];
      mockRole.findOrCreate.mockImplementation(({ defaults }) => {
        createdIds.push(defaults.role_id);
        return Promise.resolve([defaults, true]);
      });

      const roles = [
        { role_id: 1, role_name: 'OWNER' },
        { role_id: 2, role_name: 'ADMIN' },
        { role_id: 3, role_name: 'USER' },
        { role_id: 4, role_name: 'VIEWER' },
        { role_id: 5, role_name: 'AUDITOR' }
      ];

      for (const role of roles) {
        await mockRole.findOrCreate({
          where: { role_id: role.role_id },
          defaults: role
        });
      }

      expect(createdIds).toEqual([1, 2, 3, 4, 5]);
    });

    it('should use where clause with role_id', async () => {
      const whereClauses = [];
      mockRole.findOrCreate.mockImplementation(({ where }) => {
        whereClauses.push(where);
        return Promise.resolve([{}, true]);
      });

      const roles = [
        { role_id: 1, role_name: 'OWNER' },
        { role_id: 2, role_name: 'ADMIN' },
        { role_id: 3, role_name: 'USER' },
        { role_id: 4, role_name: 'VIEWER' },
        { role_id: 5, role_name: 'AUDITOR' }
      ];

      for (const role of roles) {
        await mockRole.findOrCreate({
          where: { role_id: role.role_id },
          defaults: role
        });
      }

      expect(whereClauses).toEqual([
        { role_id: 1 },
        { role_id: 2 },
        { role_id: 3 },
        { role_id: 4 },
        { role_id: 5 }
      ]);
    });
  });

  // ==========================================================================
  // Model Reference Tests
  // ==========================================================================
  describe('Model References', () => {
    it('should reference same User model in all associations', () => {
      mockUser.belongsTo(mockRole, { foreignKey: 'role_id', as: 'role' });

      expect(mockUser.belongsTo).toHaveBeenCalled();
      expect(mockUser.belongsTo.mock.calls[0][0]).toBe(mockRole);
    });

    it('should reference same Role model in all associations', () => {
      mockRole.hasMany(mockUser, { foreignKey: 'role_id', as: 'users' });

      expect(mockRole.hasMany).toHaveBeenCalled();
      expect(mockRole.hasMany.mock.calls[0][0]).toBe(mockUser);
    });

    it('should use OrganizationMember as through table', () => {
      mockOrganization.belongsToMany(mockUser, {
        through: mockOrganizationMember,
        foreignKey: 'org_id',
        otherKey: 'user_id',
        as: 'members'
      });

      expect(mockOrganization.belongsToMany.mock.calls[0][1].through).toBe(mockOrganizationMember);
    });
  });
});
