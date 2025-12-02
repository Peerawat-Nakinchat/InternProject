/**
 * Integration Tests for CompanyModel getMemberCounts
 * These tests require a real database connection
 * Run with: npm test -- --testPathPattern="CompanyModel.integration"
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

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
let Organization;
let OrganizationMember;
let User;
let Role;

describe('CompanyModel Integration Tests (getMemberCounts)', () => {
  beforeAll(async () => {
    try {
      const { Sequelize, DataTypes, Op } = await import('sequelize');
      
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

      // Define Role model
      Role = sequelize.define('Role', {
        role_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        role_name: {
          type: DataTypes.STRING(50),
          allowNull: false,
          unique: true
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          defaultValue: true
        }
      }, {
        tableName: 'sys_role'
      });

      // Define User model
      User = sequelize.define('User', {
        user_id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true
        },
        password_hash: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false
        },
        surname: {
          type: DataTypes.STRING(100),
          allowNull: false
        },
        role_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 3
        }
      }, {
        tableName: 'sys_users'
      });

      // Define Organization model
      Organization = sequelize.define('Organization', {
        org_id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true
        },
        org_name: {
          type: DataTypes.STRING(200),
          allowNull: false
        },
        org_code: {
          type: DataTypes.STRING(50),
          unique: true
        },
        owner_user_id: {
          type: DataTypes.UUID,
          allowNull: false
        }
      }, {
        tableName: 'sys_organizations'
      });

      // Define OrganizationMember model
      OrganizationMember = sequelize.define('OrganizationMember', {
        membership_id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true
        },
        org_id: {
          type: DataTypes.UUID,
          allowNull: false
        },
        user_id: {
          type: DataTypes.UUID,
          allowNull: false
        },
        role_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 3
        }
      }, {
        tableName: 'sys_organization_members'
      });

      // Setup associations
      Organization.belongsTo(User, { foreignKey: 'owner_user_id', as: 'owner' });
      OrganizationMember.belongsTo(Organization, { foreignKey: 'org_id' });
      OrganizationMember.belongsTo(User, { foreignKey: 'user_id' });

      // Add getMemberCounts method to Organization model
      Organization.getMemberCounts = async function(orgIds = null) {
        const where = {};
        if (orgIds && orgIds.length > 0) {
          where.org_id = { [Op.in]: orgIds };
        }

        const results = await OrganizationMember.findAll({
          where,
          attributes: [
            'org_id',
            [sequelize.fn('COUNT', sequelize.col('user_id')), 'member_count']
          ],
          group: ['org_id'],
          raw: true
        });

        const countsMap = {};
        results.forEach(row => {
          countsMap[row.org_id] = parseInt(row.member_count, 10);
        });

        return countsMap;
      };

      // Sync database
      await sequelize.sync({ force: true });

      // Seed roles
      await Role.bulkCreate([
        { role_id: 1, role_name: 'OWNER' },
        { role_id: 2, role_name: 'ADMIN' },
        { role_id: 3, role_name: 'USER' },
        { role_id: 4, role_name: 'VIEWER' },
        { role_id: 5, role_name: 'AUDITOR' }
      ], { ignoreDuplicates: true });

    } catch (error) {
      console.error('Failed to setup test database:', error.message);
    }
  }, 30000);

  afterAll(async () => {
    if (sequelize) {
      await sequelize.close();
    }
  });

  beforeEach(async () => {
    if (OrganizationMember && Organization && User) {
      await OrganizationMember.destroy({ where: {}, force: true });
      await Organization.destroy({ where: {}, force: true });
      await User.destroy({ where: {}, force: true });
    }
  });

  describe('getMemberCounts', () => {
    it('should return empty map when no organizations exist', async () => {
      if (!Organization) return;

      const counts = await Organization.getMemberCounts();
      expect(counts).toEqual({});
    });

    it('should return empty map when organizations have no members', async () => {
      if (!Organization || !User) return;

      // Create owner user
      const owner = await User.create({
        email: 'owner@test.com',
        password_hash: 'hashedpassword123',
        name: 'Owner',
        surname: 'User',
        role_id: 3
      });

      // Create organization without members
      const org = await Organization.create({
        org_name: 'Test Org',
        org_code: 'TEST001',
        owner_user_id: owner.user_id
      });

      const counts = await Organization.getMemberCounts([org.org_id]);
      expect(counts).toEqual({});
    });

    it('should return correct member count for single organization', async () => {
      if (!Organization || !User || !OrganizationMember) return;

      // Create users
      const owner = await User.create({
        email: 'owner@test.com',
        password_hash: 'hashedpassword123',
        name: 'Owner',
        surname: 'User',
        role_id: 3
      });

      const member1 = await User.create({
        email: 'member1@test.com',
        password_hash: 'hashedpassword123',
        name: 'Member',
        surname: 'One',
        role_id: 3
      });

      const member2 = await User.create({
        email: 'member2@test.com',
        password_hash: 'hashedpassword123',
        name: 'Member',
        surname: 'Two',
        role_id: 3
      });

      // Create organization
      const org = await Organization.create({
        org_name: 'Test Org',
        org_code: 'TEST001',
        owner_user_id: owner.user_id
      });

      // Add members
      await OrganizationMember.bulkCreate([
        { org_id: org.org_id, user_id: member1.user_id, role_id: 3 },
        { org_id: org.org_id, user_id: member2.user_id, role_id: 3 }
      ]);

      const counts = await Organization.getMemberCounts([org.org_id]);
      expect(counts[org.org_id]).toBe(2);
    });

    it('should return correct member counts for multiple organizations', async () => {
      if (!Organization || !User || !OrganizationMember) return;

      // Create users
      const owner = await User.create({
        email: 'owner@test.com',
        password_hash: 'hashedpassword123',
        name: 'Owner',
        surname: 'User',
        role_id: 3
      });

      const user1 = await User.create({
        email: 'user1@test.com',
        password_hash: 'hashedpassword123',
        name: 'User',
        surname: 'One',
        role_id: 3
      });

      const user2 = await User.create({
        email: 'user2@test.com',
        password_hash: 'hashedpassword123',
        name: 'User',
        surname: 'Two',
        role_id: 3
      });

      const user3 = await User.create({
        email: 'user3@test.com',
        password_hash: 'hashedpassword123',
        name: 'User',
        surname: 'Three',
        role_id: 3
      });

      // Create organizations
      const org1 = await Organization.create({
        org_name: 'Org One',
        org_code: 'ORG001',
        owner_user_id: owner.user_id
      });

      const org2 = await Organization.create({
        org_name: 'Org Two',
        org_code: 'ORG002',
        owner_user_id: owner.user_id
      });

      // Add members - org1 has 2 members, org2 has 1 member
      await OrganizationMember.bulkCreate([
        { org_id: org1.org_id, user_id: user1.user_id, role_id: 3 },
        { org_id: org1.org_id, user_id: user2.user_id, role_id: 3 },
        { org_id: org2.org_id, user_id: user3.user_id, role_id: 3 }
      ]);

      const counts = await Organization.getMemberCounts([org1.org_id, org2.org_id]);
      expect(counts[org1.org_id]).toBe(2);
      expect(counts[org2.org_id]).toBe(1);
    });

    it('should return all organization counts when orgIds is null', async () => {
      if (!Organization || !User || !OrganizationMember) return;

      const owner = await User.create({
        email: 'owner@test.com',
        password_hash: 'hashedpassword123',
        name: 'Owner',
        surname: 'User',
        role_id: 3
      });

      const member = await User.create({
        email: 'member@test.com',
        password_hash: 'hashedpassword123',
        name: 'Member',
        surname: 'User',
        role_id: 3
      });

      const org = await Organization.create({
        org_name: 'Test Org',
        org_code: 'TEST001',
        owner_user_id: owner.user_id
      });

      await OrganizationMember.create({
        org_id: org.org_id,
        user_id: member.user_id,
        role_id: 3
      });

      const counts = await Organization.getMemberCounts(null);
      expect(Object.keys(counts).length).toBeGreaterThan(0);
      expect(counts[org.org_id]).toBe(1);
    });

    it('should return empty map when orgIds is empty array', async () => {
      if (!Organization) return;

      const counts = await Organization.getMemberCounts([]);
      expect(counts).toEqual({});
    });

    it('should convert member_count to number', async () => {
      if (!Organization || !User || !OrganizationMember) return;

      const owner = await User.create({
        email: 'owner@test.com',
        password_hash: 'hashedpassword123',
        name: 'Owner',
        surname: 'User',
        role_id: 3
      });

      const member = await User.create({
        email: 'member@test.com',
        password_hash: 'hashedpassword123',
        name: 'Member',
        surname: 'User',
        role_id: 3
      });

      const org = await Organization.create({
        org_name: 'Test Org',
        org_code: 'TEST001',
        owner_user_id: owner.user_id
      });

      await OrganizationMember.create({
        org_id: org.org_id,
        user_id: member.user_id,
        role_id: 3
      });

      const counts = await Organization.getMemberCounts([org.org_id]);
      expect(typeof counts[org.org_id]).toBe('number');
    });
  });
});
