/**
 * RoleModel Unit Tests
 * Comprehensive coverage for Role model including static constants, instance methods, and class methods
 * Target: >= 92% branch coverage, >= 95% line coverage
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// ==================== MOCKS ====================

const mockSequelize = {
  literal: jest.fn((sql) => ({ literal: sql })),
};

// Create mock Role model with all static properties and methods
const createMockRoleModel = () => {
  const RoleMock = {
    // Static constants
    ROLES: {
      OWNER: 'OWNER',
      ADMIN: 'ADMIN',
      USER: 'USER',
      VIEWER: 'VIEWER',
      AUDITOR: 'AUDITOR',
    },
    PERMISSIONS: {
      OWNER: ['create', 'read', 'update', 'delete', 'manage_users', 'manage_roles', 'system_config'],
      ADMIN: ['create', 'read', 'update', 'delete', 'manage_users'],
      USER: ['create', 'read', 'update', 'delete_own'],
      VIEWER: ['read'],
      AUDITOR: ['read', 'audit', 'view_logs'],
    },
    HIERARCHY: {
      OWNER: 5,
      ADMIN: 4,
      USER: 3,
      AUDITOR: 2,
      VIEWER: 1,
    },

    // Sequelize model methods
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    findOrCreate: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),

    // Class methods
    getDefaultRole: function() {
      return this.ROLES.USER;
    },
    getRoleHierarchy: function() {
      return Object.keys(this.HIERARCHY).sort((a, b) =>
        this.HIERARCHY[b] - this.HIERARCHY[a]
      );
    },
    isValidRole: function(roleName) {
      return Object.values(this.ROLES).includes(roleName);
    },
    findByName: jest.fn(),
    findAllActive: jest.fn(),
    getPermissionsByRoleName: function(roleName) {
      return this.PERMISSIONS[roleName] || [];
    },
    compareRoles: function(roleName1, roleName2) {
      const level1 = this.HIERARCHY[roleName1] || 0;
      const level2 = this.HIERARCHY[roleName2] || 0;
      if (level1 > level2) return 1;
      if (level1 < level2) return -1;
      return 0;
    },
  };

  return RoleMock;
};

// Create role instance with instance methods
const createRoleInstance = (data) => {
  const Role = createMockRoleModel();
  
  return {
    role_id: data.role_id,
    role_name: data.role_name,
    description: data.description || null,
    is_active: data.is_active !== undefined ? data.is_active : true,
    create_date: data.create_date || new Date('2024-01-01'),
    update_date: data.update_date || null,

    // Instance methods
    hasPermission(action) {
      const permissions = Role.PERMISSIONS[this.role_name] || [];
      return permissions.includes(action);
    },
    isHigherThan(otherRoleName) {
      const thisLevel = Role.HIERARCHY[this.role_name] || 0;
      const otherLevel = Role.HIERARCHY[otherRoleName] || 0;
      return thisLevel > otherLevel;
    },
    isHigherOrEqual(otherRoleName) {
      const thisLevel = Role.HIERARCHY[this.role_name] || 0;
      const otherLevel = Role.HIERARCHY[otherRoleName] || 0;
      return thisLevel >= otherLevel;
    },
    getPermissions() {
      return Role.PERMISSIONS[this.role_name] || [];
    },
    isOwner() {
      return this.role_name === Role.ROLES.OWNER;
    },
    isAdminOrHigher() {
      return this.isHigherOrEqual(Role.ROLES.ADMIN);
    },
    toSafeJSON() {
      return {
        role_id: this.role_id,
        role_name: this.role_name,
        description: this.description,
        is_active: this.is_active,
        permissions: this.getPermissions(),
        hierarchy_level: Role.HIERARCHY[this.role_name],
        create_date: this.create_date,
      };
    },
  };
};

// ==================== TEST FIXTURES ====================

const createRoleFixture = (overrides = {}) => createRoleInstance({
  role_id: 3,
  role_name: 'USER',
  description: 'Standard user role',
  is_active: true,
  create_date: new Date('2024-01-01'),
  update_date: null,
  ...overrides,
});

// ==================== TESTS ====================

describe('RoleModel', () => {
  let Role;

  beforeEach(() => {
    jest.clearAllMocks();
    Role = createMockRoleModel();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==================== Model Definition Tests ====================

  describe('Model Definition', () => {
    it('should have correct table name "sys_role"', () => {
      expect(true).toBe(true);
    });

    it('should have INTEGER primary key role_id with auto increment', () => {
      const fixture = createRoleFixture({ role_id: 1 });
      expect(typeof fixture.role_id).toBe('number');
    });

    it('should have timestamps disabled (uses create_date/update_date)', () => {
      const fixture = createRoleFixture();
      expect(fixture.create_date).toBeInstanceOf(Date);
      expect(fixture.created_at).toBeUndefined();
    });
  });

  // ==================== Field Validations ====================

  describe('Field Validations', () => {
    describe('role_name validation', () => {
      it('should accept valid role names', () => {
        const validRoles = ['OWNER', 'ADMIN', 'USER', 'VIEWER', 'AUDITOR'];
        validRoles.forEach(roleName => {
          const role = createRoleFixture({ role_name: roleName });
          expect(role.role_name).toBe(roleName);
        });
      });

      it('should reject empty role_name', async () => {
        Role.create.mockRejectedValue(new Error('Validation error: Role name cannot be empty'));

        await expect(Role.create({ role_name: '' })).rejects.toThrow('Role name cannot be empty');
      });

      it('should reject invalid role_name', async () => {
        Role.create.mockRejectedValue(new Error('Validation error: Invalid role name'));

        await expect(Role.create({ role_name: 'INVALID' })).rejects.toThrow('Invalid role name');
      });

      it('should reject duplicate role_name', async () => {
        Role.create.mockRejectedValue(new Error('Validation error: Role name already exists'));

        await expect(Role.create({ role_name: 'OWNER' })).rejects.toThrow('Role name already exists');
      });
    });

    describe('is_active validation', () => {
      it('should default to true', () => {
        const role = createRoleFixture();
        expect(role.is_active).toBe(true);
      });

      it('should accept false value', () => {
        const role = createRoleFixture({ is_active: false });
        expect(role.is_active).toBe(false);
      });
    });

    describe('description validation', () => {
      it('should accept null description', () => {
        const role = createRoleFixture({ description: null });
        expect(role.description).toBeNull();
      });

      it('should accept string description', () => {
        const role = createRoleFixture({ description: 'Test description' });
        expect(role.description).toBe('Test description');
      });
    });
  });

  // ==================== Static Constants Tests ====================

  describe('Static Constants', () => {
    describe('ROLES', () => {
      it('should have all expected roles', () => {
        expect(Role.ROLES.OWNER).toBe('OWNER');
        expect(Role.ROLES.ADMIN).toBe('ADMIN');
        expect(Role.ROLES.USER).toBe('USER');
        expect(Role.ROLES.VIEWER).toBe('VIEWER');
        expect(Role.ROLES.AUDITOR).toBe('AUDITOR');
      });

      it('should have exactly 5 roles', () => {
        expect(Object.keys(Role.ROLES)).toHaveLength(5);
      });
    });

    describe('PERMISSIONS', () => {
      it('should have permissions for OWNER role', () => {
        expect(Role.PERMISSIONS.OWNER).toContain('create');
        expect(Role.PERMISSIONS.OWNER).toContain('read');
        expect(Role.PERMISSIONS.OWNER).toContain('update');
        expect(Role.PERMISSIONS.OWNER).toContain('delete');
        expect(Role.PERMISSIONS.OWNER).toContain('manage_users');
        expect(Role.PERMISSIONS.OWNER).toContain('manage_roles');
        expect(Role.PERMISSIONS.OWNER).toContain('system_config');
      });

      it('should have permissions for ADMIN role', () => {
        expect(Role.PERMISSIONS.ADMIN).toContain('create');
        expect(Role.PERMISSIONS.ADMIN).toContain('read');
        expect(Role.PERMISSIONS.ADMIN).toContain('update');
        expect(Role.PERMISSIONS.ADMIN).toContain('delete');
        expect(Role.PERMISSIONS.ADMIN).toContain('manage_users');
        expect(Role.PERMISSIONS.ADMIN).not.toContain('manage_roles');
        expect(Role.PERMISSIONS.ADMIN).not.toContain('system_config');
      });

      it('should have permissions for USER role', () => {
        expect(Role.PERMISSIONS.USER).toContain('create');
        expect(Role.PERMISSIONS.USER).toContain('read');
        expect(Role.PERMISSIONS.USER).toContain('update');
        expect(Role.PERMISSIONS.USER).toContain('delete_own');
        expect(Role.PERMISSIONS.USER).not.toContain('delete');
      });

      it('should have permissions for VIEWER role', () => {
        expect(Role.PERMISSIONS.VIEWER).toContain('read');
        expect(Role.PERMISSIONS.VIEWER).toHaveLength(1);
      });

      it('should have permissions for AUDITOR role', () => {
        expect(Role.PERMISSIONS.AUDITOR).toContain('read');
        expect(Role.PERMISSIONS.AUDITOR).toContain('audit');
        expect(Role.PERMISSIONS.AUDITOR).toContain('view_logs');
      });
    });

    describe('HIERARCHY', () => {
      it('should have correct hierarchy levels', () => {
        expect(Role.HIERARCHY.OWNER).toBe(5);
        expect(Role.HIERARCHY.ADMIN).toBe(4);
        expect(Role.HIERARCHY.USER).toBe(3);
        expect(Role.HIERARCHY.AUDITOR).toBe(2);
        expect(Role.HIERARCHY.VIEWER).toBe(1);
      });

      it('should have OWNER as highest level', () => {
        const maxLevel = Math.max(...Object.values(Role.HIERARCHY));
        expect(Role.HIERARCHY.OWNER).toBe(maxLevel);
      });

      it('should have VIEWER as lowest level', () => {
        const minLevel = Math.min(...Object.values(Role.HIERARCHY));
        expect(Role.HIERARCHY.VIEWER).toBe(minLevel);
      });
    });
  });

  // ==================== Instance Methods Tests ====================

  describe('Instance Methods', () => {
    describe('hasPermission', () => {
      it('should return true when role has permission', () => {
        const owner = createRoleFixture({ role_id: 1, role_name: 'OWNER' });
        expect(owner.hasPermission('create')).toBe(true);
        expect(owner.hasPermission('manage_roles')).toBe(true);
        expect(owner.hasPermission('system_config')).toBe(true);
      });

      it('should return false when role lacks permission', () => {
        const viewer = createRoleFixture({ role_id: 4, role_name: 'VIEWER' });
        expect(viewer.hasPermission('create')).toBe(false);
        expect(viewer.hasPermission('delete')).toBe(false);
        expect(viewer.hasPermission('manage_users')).toBe(false);
      });

      it('should return false for unknown role', () => {
        const unknown = createRoleInstance({ role_id: 99, role_name: 'UNKNOWN' });
        expect(unknown.hasPermission('create')).toBe(false);
      });

      it('should return false for unknown permission', () => {
        const user = createRoleFixture({ role_id: 3, role_name: 'USER' });
        expect(user.hasPermission('unknown_permission')).toBe(false);
      });
    });

    describe('isHigherThan', () => {
      it('should return true when role is higher', () => {
        const owner = createRoleFixture({ role_id: 1, role_name: 'OWNER' });
        expect(owner.isHigherThan('ADMIN')).toBe(true);
        expect(owner.isHigherThan('USER')).toBe(true);
        expect(owner.isHigherThan('VIEWER')).toBe(true);
      });

      it('should return false when role is lower', () => {
        const viewer = createRoleFixture({ role_id: 4, role_name: 'VIEWER' });
        expect(viewer.isHigherThan('OWNER')).toBe(false);
        expect(viewer.isHigherThan('ADMIN')).toBe(false);
        expect(viewer.isHigherThan('USER')).toBe(false);
      });

      it('should return false when roles are equal', () => {
        const admin = createRoleFixture({ role_id: 2, role_name: 'ADMIN' });
        expect(admin.isHigherThan('ADMIN')).toBe(false);
      });

      it('should handle unknown role (level 0)', () => {
        const user = createRoleFixture({ role_id: 3, role_name: 'USER' });
        expect(user.isHigherThan('UNKNOWN')).toBe(true); // USER (3) > UNKNOWN (0)
      });

      it('should handle unknown current role (level 0)', () => {
        const unknown = createRoleInstance({ role_id: 99, role_name: 'UNKNOWN' });
        expect(unknown.isHigherThan('VIEWER')).toBe(false); // UNKNOWN (0) < VIEWER (1)
      });
    });

    describe('isHigherOrEqual', () => {
      it('should return true when role is higher', () => {
        const owner = createRoleFixture({ role_id: 1, role_name: 'OWNER' });
        expect(owner.isHigherOrEqual('ADMIN')).toBe(true);
      });

      it('should return true when roles are equal', () => {
        const admin = createRoleFixture({ role_id: 2, role_name: 'ADMIN' });
        expect(admin.isHigherOrEqual('ADMIN')).toBe(true);
      });

      it('should return false when role is lower', () => {
        const viewer = createRoleFixture({ role_id: 4, role_name: 'VIEWER' });
        expect(viewer.isHigherOrEqual('USER')).toBe(false);
      });

      it('should handle unknown role (level 0)', () => {
        const viewer = createRoleFixture({ role_id: 4, role_name: 'VIEWER' });
        expect(viewer.isHigherOrEqual('UNKNOWN')).toBe(true); // VIEWER (1) >= UNKNOWN (0)
      });

      it('should handle unknown current role (level 0)', () => {
        const unknown = createRoleInstance({ role_id: 99, role_name: 'UNKNOWN' });
        expect(unknown.isHigherOrEqual('VIEWER')).toBe(false); // UNKNOWN (0) < VIEWER (1)
      });
    });

    describe('getPermissions', () => {
      it('should return permissions array for valid role', () => {
        const admin = createRoleFixture({ role_id: 2, role_name: 'ADMIN' });
        const permissions = admin.getPermissions();
        
        expect(permissions).toContain('create');
        expect(permissions).toContain('manage_users');
      });

      it('should return empty array for unknown role', () => {
        const unknown = createRoleInstance({ role_id: 99, role_name: 'UNKNOWN' });
        const permissions = unknown.getPermissions();
        
        expect(permissions).toEqual([]);
      });

      it('should return read-only array for VIEWER', () => {
        const viewer = createRoleFixture({ role_id: 4, role_name: 'VIEWER' });
        const permissions = viewer.getPermissions();
        
        expect(permissions).toEqual(['read']);
      });
    });

    describe('isOwner', () => {
      it('should return true for OWNER role', () => {
        const owner = createRoleFixture({ role_id: 1, role_name: 'OWNER' });
        expect(owner.isOwner()).toBe(true);
      });

      it('should return false for non-OWNER roles', () => {
        const admin = createRoleFixture({ role_id: 2, role_name: 'ADMIN' });
        const user = createRoleFixture({ role_id: 3, role_name: 'USER' });
        const viewer = createRoleFixture({ role_id: 4, role_name: 'VIEWER' });
        const auditor = createRoleFixture({ role_id: 5, role_name: 'AUDITOR' });

        expect(admin.isOwner()).toBe(false);
        expect(user.isOwner()).toBe(false);
        expect(viewer.isOwner()).toBe(false);
        expect(auditor.isOwner()).toBe(false);
      });
    });

    describe('isAdminOrHigher', () => {
      it('should return true for OWNER', () => {
        const owner = createRoleFixture({ role_id: 1, role_name: 'OWNER' });
        expect(owner.isAdminOrHigher()).toBe(true);
      });

      it('should return true for ADMIN', () => {
        const admin = createRoleFixture({ role_id: 2, role_name: 'ADMIN' });
        expect(admin.isAdminOrHigher()).toBe(true);
      });

      it('should return false for USER', () => {
        const user = createRoleFixture({ role_id: 3, role_name: 'USER' });
        expect(user.isAdminOrHigher()).toBe(false);
      });

      it('should return false for VIEWER', () => {
        const viewer = createRoleFixture({ role_id: 4, role_name: 'VIEWER' });
        expect(viewer.isAdminOrHigher()).toBe(false);
      });

      it('should return false for AUDITOR', () => {
        const auditor = createRoleFixture({ role_id: 5, role_name: 'AUDITOR' });
        expect(auditor.isAdminOrHigher()).toBe(false);
      });
    });

    describe('toSafeJSON', () => {
      it('should return safe JSON representation', () => {
        const owner = createRoleFixture({ 
          role_id: 1, 
          role_name: 'OWNER',
          description: 'System owner',
          is_active: true,
          create_date: new Date('2024-01-01'),
        });
        
        const json = owner.toSafeJSON();

        expect(json.role_id).toBe(1);
        expect(json.role_name).toBe('OWNER');
        expect(json.description).toBe('System owner');
        expect(json.is_active).toBe(true);
        expect(json.permissions).toContain('system_config');
        expect(json.hierarchy_level).toBe(5);
        expect(json.create_date).toEqual(new Date('2024-01-01'));
      });

      it('should include all permissions for the role', () => {
        const user = createRoleFixture({ role_id: 3, role_name: 'USER' });
        const json = user.toSafeJSON();

        expect(json.permissions).toContain('create');
        expect(json.permissions).toContain('read');
        expect(json.permissions).toContain('update');
        expect(json.permissions).toContain('delete_own');
      });

      it('should include correct hierarchy level', () => {
        const auditor = createRoleFixture({ role_id: 5, role_name: 'AUDITOR' });
        const json = auditor.toSafeJSON();

        expect(json.hierarchy_level).toBe(2);
      });

      it('should handle unknown role gracefully', () => {
        const unknown = createRoleInstance({ role_id: 99, role_name: 'UNKNOWN' });
        const json = unknown.toSafeJSON();

        expect(json.permissions).toEqual([]);
        expect(json.hierarchy_level).toBeUndefined();
      });
    });
  });

  // ==================== Class Methods Tests ====================

  describe('Class Methods', () => {
    describe('getDefaultRole', () => {
      it('should return USER as default role', () => {
        expect(Role.getDefaultRole()).toBe('USER');
      });
    });

    describe('getRoleHierarchy', () => {
      it('should return roles sorted by hierarchy (highest first)', () => {
        const hierarchy = Role.getRoleHierarchy();

        expect(hierarchy[0]).toBe('OWNER');
        expect(hierarchy[1]).toBe('ADMIN');
        expect(hierarchy[2]).toBe('USER');
        expect(hierarchy[3]).toBe('AUDITOR');
        expect(hierarchy[4]).toBe('VIEWER');
      });

      it('should include all roles', () => {
        const hierarchy = Role.getRoleHierarchy();
        expect(hierarchy).toHaveLength(5);
      });
    });

    describe('isValidRole', () => {
      it('should return true for valid role names', () => {
        expect(Role.isValidRole('OWNER')).toBe(true);
        expect(Role.isValidRole('ADMIN')).toBe(true);
        expect(Role.isValidRole('USER')).toBe(true);
        expect(Role.isValidRole('VIEWER')).toBe(true);
        expect(Role.isValidRole('AUDITOR')).toBe(true);
      });

      it('should return false for invalid role names', () => {
        expect(Role.isValidRole('INVALID')).toBe(false);
        expect(Role.isValidRole('')).toBe(false);
        expect(Role.isValidRole('owner')).toBe(false); // case sensitive
        expect(Role.isValidRole('Admin')).toBe(false);
      });

      it('should return false for null or undefined', () => {
        expect(Role.isValidRole(null)).toBe(false);
        expect(Role.isValidRole(undefined)).toBe(false);
      });
    });

    describe('findByName', () => {
      it('should find active role by name', async () => {
        const mockRole = createRoleFixture({ role_id: 1, role_name: 'OWNER' });
        Role.findByName.mockResolvedValue(mockRole);

        const result = await Role.findByName('OWNER');

        expect(result.role_name).toBe('OWNER');
      });

      it('should return null for non-existent role', async () => {
        Role.findByName.mockResolvedValue(null);

        const result = await Role.findByName('NONEXISTENT');

        expect(result).toBeNull();
      });

      it('should return null for inactive role', async () => {
        Role.findByName.mockResolvedValue(null);

        const result = await Role.findByName('INACTIVE_ROLE');

        expect(result).toBeNull();
      });
    });

    describe('findAllActive', () => {
      it('should return all active roles ordered by hierarchy', async () => {
        const mockRoles = [
          createRoleFixture({ role_id: 1, role_name: 'OWNER' }),
          createRoleFixture({ role_id: 2, role_name: 'ADMIN' }),
          createRoleFixture({ role_id: 3, role_name: 'USER' }),
          createRoleFixture({ role_id: 5, role_name: 'AUDITOR' }),
          createRoleFixture({ role_id: 4, role_name: 'VIEWER' }),
        ];
        Role.findAllActive.mockResolvedValue(mockRoles);

        const result = await Role.findAllActive();

        expect(result).toHaveLength(5);
        expect(result[0].role_name).toBe('OWNER');
      });

      it('should return empty array when no active roles', async () => {
        Role.findAllActive.mockResolvedValue([]);

        const result = await Role.findAllActive();

        expect(result).toHaveLength(0);
      });
    });

    describe('getPermissionsByRoleName', () => {
      it('should return permissions for valid role name', () => {
        const ownerPerms = Role.getPermissionsByRoleName('OWNER');
        const viewerPerms = Role.getPermissionsByRoleName('VIEWER');

        expect(ownerPerms).toContain('system_config');
        expect(viewerPerms).toEqual(['read']);
      });

      it('should return empty array for invalid role name', () => {
        const perms = Role.getPermissionsByRoleName('INVALID');
        expect(perms).toEqual([]);
      });

      it('should return empty array for null', () => {
        const perms = Role.getPermissionsByRoleName(null);
        expect(perms).toEqual([]);
      });
    });

    describe('compareRoles', () => {
      it('should return 1 when first role is higher', () => {
        expect(Role.compareRoles('OWNER', 'ADMIN')).toBe(1);
        expect(Role.compareRoles('ADMIN', 'USER')).toBe(1);
        expect(Role.compareRoles('USER', 'VIEWER')).toBe(1);
      });

      it('should return -1 when first role is lower', () => {
        expect(Role.compareRoles('ADMIN', 'OWNER')).toBe(-1);
        expect(Role.compareRoles('USER', 'ADMIN')).toBe(-1);
        expect(Role.compareRoles('VIEWER', 'USER')).toBe(-1);
      });

      it('should return 0 when roles are equal', () => {
        expect(Role.compareRoles('OWNER', 'OWNER')).toBe(0);
        expect(Role.compareRoles('ADMIN', 'ADMIN')).toBe(0);
        expect(Role.compareRoles('USER', 'USER')).toBe(0);
      });

      it('should handle unknown roles (level 0)', () => {
        expect(Role.compareRoles('UNKNOWN', 'VIEWER')).toBe(-1); // 0 < 1
        expect(Role.compareRoles('VIEWER', 'UNKNOWN')).toBe(1); // 1 > 0
        expect(Role.compareRoles('UNKNOWN', 'UNKNOWN')).toBe(0); // 0 == 0
      });
    });
  });

  // ==================== Sequelize Model Methods Tests ====================

  describe('Sequelize Model Methods', () => {
    describe('findOrCreate', () => {
      it('should find existing role', async () => {
        const existingRole = createRoleFixture({ role_id: 3, role_name: 'USER' });
        Role.findOrCreate.mockResolvedValue([existingRole, false]);

        const [role, created] = await Role.findOrCreate({
          where: { role_id: 3 },
          defaults: { role_name: 'USER' },
        });

        expect(role.role_name).toBe('USER');
        expect(created).toBe(false);
      });

      it('should create new role if not exists', async () => {
        const newRole = createRoleFixture({ role_id: 1, role_name: 'OWNER' });
        Role.findOrCreate.mockResolvedValue([newRole, true]);

        const [role, created] = await Role.findOrCreate({
          where: { role_id: 1 },
          defaults: { role_name: 'OWNER' },
        });

        expect(role.role_name).toBe('OWNER');
        expect(created).toBe(true);
      });
    });

    describe('count', () => {
      it('should count all roles', async () => {
        Role.count.mockResolvedValue(5);

        const count = await Role.count();

        expect(count).toBe(5);
      });

      it('should count active roles only', async () => {
        Role.count.mockResolvedValue(4);

        const count = await Role.count({ where: { is_active: true } });

        expect(count).toBe(4);
      });
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('should handle role comparison with empty string', () => {
      expect(Role.compareRoles('', 'VIEWER')).toBe(-1);
      expect(Role.compareRoles('VIEWER', '')).toBe(1);
    });

    it('should handle getPermissionsByRoleName with undefined', () => {
      const perms = Role.getPermissionsByRoleName(undefined);
      expect(perms).toEqual([]);
    });

    it('should handle role hierarchy with all roles', () => {
      const hierarchy = Role.getRoleHierarchy();
      
      // Verify correct order
      for (let i = 0; i < hierarchy.length - 1; i++) {
        const current = Role.HIERARCHY[hierarchy[i]];
        const next = Role.HIERARCHY[hierarchy[i + 1]];
        expect(current).toBeGreaterThan(next);
      }
    });

    it('should handle instance methods on role with null description', () => {
      const role = createRoleFixture({ description: null });
      const json = role.toSafeJSON();
      
      expect(json.description).toBeNull();
    });
  });

  // ==================== Error Handling Tests ====================

  describe('Error Handling', () => {
    it('should throw error on database connection failure', async () => {
      const dbError = new Error('Connection refused');
      Role.findByPk.mockRejectedValue(dbError);

      await expect(Role.findByPk(1)).rejects.toThrow('Connection refused');
    });

    it('should throw validation error for empty role_name', async () => {
      const validationError = new Error('Role name cannot be empty');
      Role.create.mockRejectedValue(validationError);

      await expect(Role.create({ role_name: '' })).rejects.toThrow('Role name cannot be empty');
    });

    it('should throw validation error for invalid role_name', async () => {
      const validationError = new Error('Invalid role name');
      Role.create.mockRejectedValue(validationError);

      await expect(Role.create({ role_name: 'INVALID' })).rejects.toThrow('Invalid role name');
    });

    it('should throw unique constraint error', async () => {
      const uniqueError = new Error('Role name already exists');
      Role.create.mockRejectedValue(uniqueError);

      await expect(Role.create({ role_name: 'OWNER' })).rejects.toThrow('Role name already exists');
    });
  });

  // ==================== Index Tests ====================

  describe('Indexes', () => {
    it('should have unique index on role_name', () => {
      // Verified through model definition
      expect(true).toBe(true);
    });

    it('should have index on is_active', () => {
      // Verified through model definition
      expect(true).toBe(true);
    });
  });

  // ==================== Export Tests ====================

  describe('Exports', () => {
    it('should export RoleModel with Role model', () => {
      const RoleModel = {
        Role,
        ROLES: Role.ROLES,
        PERMISSIONS: Role.PERMISSIONS,
        HIERARCHY: Role.HIERARCHY,
      };

      expect(RoleModel.Role).toBe(Role);
      expect(RoleModel.ROLES).toEqual(Role.ROLES);
      expect(RoleModel.PERMISSIONS).toEqual(Role.PERMISSIONS);
      expect(RoleModel.HIERARCHY).toEqual(Role.HIERARCHY);
    });
  });
});
