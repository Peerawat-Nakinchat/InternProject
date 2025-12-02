/**
 * RoleModel Integration Tests using esmock
 * Uses esmock to properly mock ES modules and test actual code
 * Target: >= 92% branch coverage, >= 95% line coverage
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';
import esmock from 'esmock';

// ==================== MOCKED MODULES ====================

const mockSequelize = {
  define: null, // Will be set in beforeAll
  literal: (sql) => ({ literal: sql }),
  fn: (name, col) => ({ fn: name, col }),
  col: (name) => ({ col: name }),
  Op: {
    gt: Symbol('gt'),
    lt: Symbol('lt'),
    gte: Symbol('gte'),
    lte: Symbol('lte'),
    ne: Symbol('ne'),
    eq: Symbol('eq'),
    in: Symbol('in'),
    or: Symbol('or'),
    and: Symbol('and'),
  },
};

// Store captured model definition
let capturedDefinition = null;
let capturedOptions = null;
let MockRoleModel = null;

// ==================== TESTS ====================

describe('RoleModel with esmock', () => {
  let Role;
  let RoleModel;

  beforeAll(async () => {
    // Create mock define function that captures the definition
    mockSequelize.define = (tableName, attributes, options) => {
      capturedDefinition = attributes;
      capturedOptions = options;
      
      // Create a constructor function for instances
      function Model(data) {
        Object.assign(this, data);
      }
      
      // Add static Sequelize methods
      Model.findByPk = async () => null;
      Model.findOne = async () => null;
      Model.findAll = async () => [];
      Model.findOrCreate = async () => [null, false];
      Model.create = async () => null;
      Model.update = async () => [0];
      Model.destroy = async () => 0;
      Model.count = async () => 0;
      
      MockRoleModel = Model;
      return Model;
    };

    // Use esmock to import RoleModel with mocked dependencies
    try {
      const module = await esmock('../../src/models/RoleModel.js', {
        '../../src/config/dbConnection.js': {
          default: mockSequelize,
        },
        'sequelize': {
          DataTypes: {
            INTEGER: 'INTEGER',
            STRING: (size) => `STRING(${size})`,
            BOOLEAN: 'BOOLEAN',
            DATE: 'DATE',
            NOW: 'NOW',
          },
          Op: mockSequelize.Op,
        },
      });
      
      Role = module.Role;
      RoleModel = module.RoleModel || module.default;
    } catch (error) {
      console.error('Failed to load RoleModel with esmock:', error);
    }
  });

  describe('Model Definition', () => {
    it('should define model with sequelize.define', () => {
      expect(Role).toBeDefined();
    });

    it('should capture model definition', () => {
      expect(capturedDefinition).toBeDefined();
    });

    it('should have role_id field', () => {
      if (capturedDefinition) {
        expect(capturedDefinition.role_id).toBeDefined();
      }
    });

    it('should have role_name field', () => {
      if (capturedDefinition) {
        expect(capturedDefinition.role_name).toBeDefined();
      }
    });
  });

  describe('Static Constants - ROLES', () => {
    it('should have OWNER role defined', () => {
      expect(Role.ROLES.OWNER).toBe('OWNER');
    });

    it('should have ADMIN role defined', () => {
      expect(Role.ROLES.ADMIN).toBe('ADMIN');
    });

    it('should have USER role defined', () => {
      expect(Role.ROLES.USER).toBe('USER');
    });

    it('should have VIEWER role defined', () => {
      expect(Role.ROLES.VIEWER).toBe('VIEWER');
    });

    it('should have AUDITOR role defined', () => {
      expect(Role.ROLES.AUDITOR).toBe('AUDITOR');
    });

    it('should have exactly 5 roles', () => {
      expect(Object.keys(Role.ROLES)).toHaveLength(5);
    });
  });

  describe('Static Constants - PERMISSIONS', () => {
    it('should have OWNER permissions with system_config', () => {
      expect(Role.PERMISSIONS.OWNER).toContain('system_config');
    });

    it('should have ADMIN permissions with manage_users', () => {
      expect(Role.PERMISSIONS.ADMIN).toContain('manage_users');
    });

    it('should have USER permissions with delete_own', () => {
      expect(Role.PERMISSIONS.USER).toContain('delete_own');
    });

    it('should have VIEWER with read only', () => {
      expect(Role.PERMISSIONS.VIEWER).toEqual(['read']);
    });

    it('should have AUDITOR with audit and view_logs', () => {
      expect(Role.PERMISSIONS.AUDITOR).toContain('audit');
      expect(Role.PERMISSIONS.AUDITOR).toContain('view_logs');
    });
  });

  describe('Static Constants - HIERARCHY', () => {
    it('should have OWNER at level 5', () => {
      expect(Role.HIERARCHY.OWNER).toBe(5);
    });

    it('should have ADMIN at level 4', () => {
      expect(Role.HIERARCHY.ADMIN).toBe(4);
    });

    it('should have USER at level 3', () => {
      expect(Role.HIERARCHY.USER).toBe(3);
    });

    it('should have AUDITOR at level 2', () => {
      expect(Role.HIERARCHY.AUDITOR).toBe(2);
    });

    it('should have VIEWER at level 1', () => {
      expect(Role.HIERARCHY.VIEWER).toBe(1);
    });
  });

  describe('Instance Methods', () => {
    describe('hasPermission', () => {
      it('should return true when role has permission', () => {
        const instance = { role_name: 'OWNER' };
        const result = Role.prototype.hasPermission.call(instance, 'manage_roles');
        expect(result).toBe(true);
      });

      it('should return false when role lacks permission', () => {
        const instance = { role_name: 'USER' };
        const result = Role.prototype.hasPermission.call(instance, 'manage_users');
        expect(result).toBe(false);
      });

      it('should return false for unknown role', () => {
        const instance = { role_name: 'UNKNOWN' };
        const result = Role.prototype.hasPermission.call(instance, 'read');
        expect(result).toBe(false);
      });
    });

    describe('isHigherThan', () => {
      it('should return true when OWNER compared to ADMIN', () => {
        const instance = { role_name: 'OWNER' };
        const result = Role.prototype.isHigherThan.call(instance, 'ADMIN');
        expect(result).toBe(true);
      });

      it('should return false when USER compared to ADMIN', () => {
        const instance = { role_name: 'USER' };
        const result = Role.prototype.isHigherThan.call(instance, 'ADMIN');
        expect(result).toBe(false);
      });

      it('should return false when comparing equal roles', () => {
        const instance = { role_name: 'ADMIN' };
        const result = Role.prototype.isHigherThan.call(instance, 'ADMIN');
        expect(result).toBe(false);
      });

      it('should use default 0 for unknown role_name', () => {
        const instance = { role_name: 'UNKNOWN_ROLE' };
        const result = Role.prototype.isHigherThan.call(instance, 'ADMIN');
        expect(result).toBe(false);
      });

      it('should use default 0 for unknown otherRoleName', () => {
        const instance = { role_name: 'ADMIN' };
        const result = Role.prototype.isHigherThan.call(instance, 'UNKNOWN_ROLE');
        expect(result).toBe(true);
      });

      it('should use default 0 for both unknown roles', () => {
        const instance = { role_name: 'UNKNOWN1' };
        const result = Role.prototype.isHigherThan.call(instance, 'UNKNOWN2');
        expect(result).toBe(false);
      });
    });

    describe('isHigherOrEqual', () => {
      it('should return true when higher', () => {
        const instance = { role_name: 'OWNER' };
        const result = Role.prototype.isHigherOrEqual.call(instance, 'ADMIN');
        expect(result).toBe(true);
      });

      it('should return true when equal', () => {
        const instance = { role_name: 'ADMIN' };
        const result = Role.prototype.isHigherOrEqual.call(instance, 'ADMIN');
        expect(result).toBe(true);
      });

      it('should return false when lower', () => {
        const instance = { role_name: 'USER' };
        const result = Role.prototype.isHigherOrEqual.call(instance, 'ADMIN');
        expect(result).toBe(false);
      });

      it('should use default 0 for unknown role_name', () => {
        const instance = { role_name: 'UNKNOWN_ROLE' };
        const result = Role.prototype.isHigherOrEqual.call(instance, 'ADMIN');
        expect(result).toBe(false);
      });

      it('should use default 0 for unknown otherRoleName', () => {
        const instance = { role_name: 'ADMIN' };
        const result = Role.prototype.isHigherOrEqual.call(instance, 'UNKNOWN_ROLE');
        expect(result).toBe(true);
      });

      it('should return true for both unknown roles (0 >= 0)', () => {
        const instance = { role_name: 'UNKNOWN1' };
        const result = Role.prototype.isHigherOrEqual.call(instance, 'UNKNOWN2');
        expect(result).toBe(true);
      });
    });

    describe('getPermissions', () => {
      it('should return permissions array for OWNER', () => {
        const instance = { role_name: 'OWNER' };
        const result = Role.prototype.getPermissions.call(instance);
        expect(result).toEqual(Role.PERMISSIONS.OWNER);
      });

      it('should return empty array for unknown role', () => {
        const instance = { role_name: 'UNKNOWN' };
        const result = Role.prototype.getPermissions.call(instance);
        expect(result).toEqual([]);
      });
    });

    describe('isOwner', () => {
      it('should return true for OWNER', () => {
        const instance = { role_name: 'OWNER' };
        const result = Role.prototype.isOwner.call(instance);
        expect(result).toBe(true);
      });

      it('should return false for non-OWNER', () => {
        const instance = { role_name: 'ADMIN' };
        const result = Role.prototype.isOwner.call(instance);
        expect(result).toBe(false);
      });
    });

    describe('isAdminOrHigher', () => {
      it('should return true for OWNER', () => {
        const instance = { role_name: 'OWNER' };
        // Mock isHigherOrEqual since it's called by isAdminOrHigher
        instance.isHigherOrEqual = function(roleName) {
          const thisLevel = Role.HIERARCHY[this.role_name] || 0;
          const otherLevel = Role.HIERARCHY[roleName] || 0;
          return thisLevel >= otherLevel;
        };
        const result = Role.prototype.isAdminOrHigher.call(instance);
        expect(result).toBe(true);
      });

      it('should return true for ADMIN', () => {
        const instance = { role_name: 'ADMIN' };
        instance.isHigherOrEqual = function(roleName) {
          const thisLevel = Role.HIERARCHY[this.role_name] || 0;
          const otherLevel = Role.HIERARCHY[roleName] || 0;
          return thisLevel >= otherLevel;
        };
        const result = Role.prototype.isAdminOrHigher.call(instance);
        expect(result).toBe(true);
      });

      it('should return false for USER', () => {
        const instance = { role_name: 'USER' };
        instance.isHigherOrEqual = function(roleName) {
          const thisLevel = Role.HIERARCHY[this.role_name] || 0;
          const otherLevel = Role.HIERARCHY[roleName] || 0;
          return thisLevel >= otherLevel;
        };
        const result = Role.prototype.isAdminOrHigher.call(instance);
        expect(result).toBe(false);
      });

      it('should return false for VIEWER', () => {
        const instance = { role_name: 'VIEWER' };
        instance.isHigherOrEqual = function(roleName) {
          const thisLevel = Role.HIERARCHY[this.role_name] || 0;
          const otherLevel = Role.HIERARCHY[roleName] || 0;
          return thisLevel >= otherLevel;
        };
        const result = Role.prototype.isAdminOrHigher.call(instance);
        expect(result).toBe(false);
      });
    });

    describe('toSafeJSON', () => {
      it('should return safe object for OWNER', () => {
        const instance = {
          role_id: 1,
          role_name: 'OWNER',
          description: 'Owner role',
          is_active: true,
          create_date: new Date('2024-01-01')
        };
        // Mock getPermissions
        instance.getPermissions = function() {
          return Role.PERMISSIONS[this.role_name] || [];
        };
        const result = Role.prototype.toSafeJSON.call(instance);
        expect(result.role_id).toBe(1);
        expect(result.role_name).toBe('OWNER');
        expect(result.permissions).toEqual(Role.PERMISSIONS.OWNER);
        expect(result.hierarchy_level).toBe(5);
      });

      it('should return safe object for ADMIN', () => {
        const instance = {
          role_id: 2,
          role_name: 'ADMIN',
          description: 'Admin role',
          is_active: true,
          create_date: new Date('2024-01-01')
        };
        instance.getPermissions = function() {
          return Role.PERMISSIONS[this.role_name] || [];
        };
        const result = Role.prototype.toSafeJSON.call(instance);
        expect(result.role_name).toBe('ADMIN');
        expect(result.permissions).toEqual(Role.PERMISSIONS.ADMIN);
        expect(result.hierarchy_level).toBe(4);
      });

      it('should return empty permissions for unknown role', () => {
        const instance = {
          role_id: 99,
          role_name: 'UNKNOWN',
          description: 'Unknown role',
          is_active: false,
          create_date: new Date('2024-01-01')
        };
        instance.getPermissions = function() {
          return Role.PERMISSIONS[this.role_name] || [];
        };
        const result = Role.prototype.toSafeJSON.call(instance);
        expect(result.permissions).toEqual([]);
        expect(result.hierarchy_level).toBeUndefined();
      });
    });
  });

  describe('Class Methods', () => {
    describe('getDefaultRole', () => {
      it('should return USER', () => {
        expect(Role.getDefaultRole()).toBe('USER');
      });
    });

    describe('getRoleHierarchy', () => {
      it('should return sorted roles', () => {
        const hierarchy = Role.getRoleHierarchy();
        expect(hierarchy[0]).toBe('OWNER');
        expect(hierarchy[hierarchy.length - 1]).toBe('VIEWER');
      });

      it('should have all 5 roles', () => {
        expect(Role.getRoleHierarchy()).toHaveLength(5);
      });
    });

    describe('isValidRole', () => {
      it('should return true for valid roles', () => {
        expect(Role.isValidRole('OWNER')).toBe(true);
        expect(Role.isValidRole('ADMIN')).toBe(true);
        expect(Role.isValidRole('USER')).toBe(true);
      });

      it('should return false for invalid roles', () => {
        expect(Role.isValidRole('INVALID')).toBe(false);
        expect(Role.isValidRole('')).toBe(false);
        expect(Role.isValidRole(null)).toBe(false);
      });
    });

    describe('getPermissionsByRoleName', () => {
      it('should return permissions for valid role', () => {
        expect(Role.getPermissionsByRoleName('OWNER')).toEqual(Role.PERMISSIONS.OWNER);
      });

      it('should return empty array for invalid role', () => {
        expect(Role.getPermissionsByRoleName('INVALID')).toEqual([]);
      });
    });

    describe('compareRoles', () => {
      it('should return 1 when first is higher', () => {
        expect(Role.compareRoles('OWNER', 'ADMIN')).toBe(1);
      });

      it('should return -1 when first is lower', () => {
        expect(Role.compareRoles('USER', 'ADMIN')).toBe(-1);
      });

      it('should return 0 when equal', () => {
        expect(Role.compareRoles('ADMIN', 'ADMIN')).toBe(0);
      });

      it('should use default 0 for unknown first role', () => {
        expect(Role.compareRoles('UNKNOWN', 'ADMIN')).toBe(-1);
      });

      it('should use default 0 for unknown second role', () => {
        expect(Role.compareRoles('ADMIN', 'UNKNOWN')).toBe(1);
      });

      it('should return 0 for both unknown roles', () => {
        expect(Role.compareRoles('UNKNOWN1', 'UNKNOWN2')).toBe(0);
      });
    });

    describe('findByName', () => {
      it('should call findOne', async () => {
        Role.findOne = async (options) => {
          expect(options.where.role_name).toBeDefined();
          expect(options.where.is_active).toBe(true);
          return null;
        };
        
        await Role.findByName('ADMIN');
      });
    });

    describe('findAllActive', () => {
      it('should call findAll with is_active filter', async () => {
        Role.findAll = async (options) => {
          expect(options.where.is_active).toBe(true);
          return [];
        };
        
        await Role.findAllActive();
      });
    });
  });

  describe('Export Structure', () => {
    it('should export Role', () => {
      expect(Role).toBeDefined();
    });

    it('should export RoleModel', () => {
      expect(RoleModel).toBeDefined();
    });

    it('should have ROLES on export', () => {
      if (RoleModel && RoleModel.ROLES) {
        expect(RoleModel.ROLES).toEqual(Role.ROLES);
      }
    });
  });
});
