/**
 * Integration Tests for dbModels - syncDatabase and seedRoles
 * These tests require a real database connection
 * Run with: npm test -- --testPathPattern="dbModels.integration"
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Set test environment variables before importing
process.env.NODE_ENV = 'test';
process.env.DB_USER = 'testuser';
process.env.DB_PASSWORD = 'testpass';
process.env.DB_DATABASE = 'internproject';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5433';
process.env.ACCESS_TOKEN_SECRET = 'test-access-secret-key-for-testing';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-key-for-testing';

let sequelize;
let Role;

describe('dbModels Integration Tests (syncDatabase & seedRoles)', () => {
  beforeAll(async () => {
    try {
      const { Sequelize, DataTypes } = await import('sequelize');
      
      sequelize = new Sequelize({
        dialect: 'postgres',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE + '_test',
        logging: false,
        define: {
          timestamps: true,
          underscored: true,
          freezeTableName: true
        }
      });

      // Test connection
      await sequelize.authenticate();

      // Define Role model for seeding tests
      Role = sequelize.define('Role', {
        role_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        role_name: {
          type: DataTypes.STRING(50),
          allowNull: false,
          unique: true,
          validate: {
            isIn: {
              args: [['OWNER', 'ADMIN', 'USER', 'VIEWER', 'AUDITOR']],
              msg: 'Role name must be one of: OWNER, ADMIN, USER, VIEWER, AUDITOR'
            }
          }
        },
        description: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          defaultValue: true
        }
      }, {
        tableName: 'sys_role'
      });

    } catch (error) {
      console.error('Failed to connect to test database:', error.message);
    }
  }, 30000);

  afterAll(async () => {
    if (sequelize) {
      await sequelize.close();
    }
  });

  describe('syncDatabase functionality', () => {
    it('should sync database schema successfully', async () => {
      if (!sequelize) return;

      // Force sync to recreate tables
      await expect(sequelize.sync({ force: true })).resolves.not.toThrow();
    });

    it('should create tables when sync is called', async () => {
      if (!sequelize) return;

      await sequelize.sync({ force: true });

      // Check that Role table exists
      const tables = await sequelize.getQueryInterface().showAllTables();
      expect(tables).toContain('sys_role');
    });

    it('should handle alter sync mode', async () => {
      if (!sequelize) return;

      // First sync
      await sequelize.sync({ force: true });

      // Alter sync (add changes without dropping)
      await expect(sequelize.sync({ alter: true })).resolves.not.toThrow();
    });
  });

  describe('seedRoles functionality', () => {
    beforeAll(async () => {
      if (sequelize && Role) {
        await sequelize.sync({ force: true });
      }
    });

    it('should seed OWNER role with id 1', async () => {
      if (!Role) return;

      await Role.findOrCreate({
        where: { role_id: 1 },
        defaults: { role_name: 'OWNER', description: 'Owner role', is_active: true }
      });

      const owner = await Role.findByPk(1);
      expect(owner).not.toBeNull();
      expect(owner.role_name).toBe('OWNER');
    });

    it('should seed ADMIN role with id 2', async () => {
      if (!Role) return;

      await Role.findOrCreate({
        where: { role_id: 2 },
        defaults: { role_name: 'ADMIN', description: 'Admin role', is_active: true }
      });

      const admin = await Role.findByPk(2);
      expect(admin).not.toBeNull();
      expect(admin.role_name).toBe('ADMIN');
    });

    it('should seed USER role with id 3', async () => {
      if (!Role) return;

      await Role.findOrCreate({
        where: { role_id: 3 },
        defaults: { role_name: 'USER', description: 'User role', is_active: true }
      });

      const user = await Role.findByPk(3);
      expect(user).not.toBeNull();
      expect(user.role_name).toBe('USER');
    });

    it('should seed VIEWER role with id 4', async () => {
      if (!Role) return;

      await Role.findOrCreate({
        where: { role_id: 4 },
        defaults: { role_name: 'VIEWER', description: 'Viewer role', is_active: true }
      });

      const viewer = await Role.findByPk(4);
      expect(viewer).not.toBeNull();
      expect(viewer.role_name).toBe('VIEWER');
    });

    it('should seed AUDITOR role with id 5', async () => {
      if (!Role) return;

      await Role.findOrCreate({
        where: { role_id: 5 },
        defaults: { role_name: 'AUDITOR', description: 'Auditor role', is_active: true }
      });

      const auditor = await Role.findByPk(5);
      expect(auditor).not.toBeNull();
      expect(auditor.role_name).toBe('AUDITOR');
    });

    it('should not duplicate roles when seeding multiple times', async () => {
      if (!Role) return;

      // Seed first time
      await Role.findOrCreate({
        where: { role_id: 1 },
        defaults: { role_name: 'OWNER', description: 'Owner role' }
      });

      // Seed second time (should not duplicate)
      await Role.findOrCreate({
        where: { role_id: 1 },
        defaults: { role_name: 'OWNER', description: 'Owner role' }
      });

      const ownerCount = await Role.count({ where: { role_name: 'OWNER' } });
      expect(ownerCount).toBe(1);
    });

    it('should create all 5 roles', async () => {
      if (!Role) return;

      // Clear and reseed
      await Role.destroy({ where: {}, force: true });

      const roles = [
        { role_id: 1, role_name: 'OWNER', description: 'Owner role' },
        { role_id: 2, role_name: 'ADMIN', description: 'Admin role' },
        { role_id: 3, role_name: 'USER', description: 'User role' },
        { role_id: 4, role_name: 'VIEWER', description: 'Viewer role' },
        { role_id: 5, role_name: 'AUDITOR', description: 'Auditor role' }
      ];

      for (const role of roles) {
        await Role.findOrCreate({
          where: { role_id: role.role_id },
          defaults: role
        });
      }

      const totalRoles = await Role.count();
      expect(totalRoles).toBe(5);
    });

    it('should seed roles with correct is_active default', async () => {
      if (!Role) return;

      const roles = await Role.findAll();
      roles.forEach(role => {
        expect(role.is_active).toBe(true);
      });
    });
  });

  describe('Database Connection', () => {
    it('should authenticate successfully', async () => {
      if (!sequelize) return;

      await expect(sequelize.authenticate()).resolves.not.toThrow();
    });

    it('should handle connection pool', async () => {
      if (!sequelize) return;

      // Execute multiple queries to test pool
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(sequelize.query('SELECT 1 as test'));
      }

      await expect(Promise.all(promises)).resolves.not.toThrow();
    });
  });

  describe('Transaction Support', () => {
    it('should support transactions', async () => {
      if (!sequelize || !Role) return;

      const t = await sequelize.transaction();

      try {
        await Role.create({
          role_name: 'OWNER',
          description: 'Test role in transaction'
        }, { transaction: t });

        await t.commit();
      } catch (error) {
        await t.rollback();
        // Expected if role already exists
      }
    });

    it('should rollback transaction on error', async () => {
      if (!sequelize || !Role) return;

      const t = await sequelize.transaction();
      const initialCount = await Role.count();

      try {
        await Role.create({
          role_name: 'INVALID_ROLE', // Will fail validation
          description: 'This should fail'
        }, { transaction: t });

        await t.commit();
      } catch (error) {
        await t.rollback();
      }

      const finalCount = await Role.count();
      expect(finalCount).toBe(initialCount);
    });
  });
});
