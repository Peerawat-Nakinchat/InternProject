// src/models/RoleModel.js
import { DataTypes, Op } from 'sequelize';
import sequelize from "../config/dbConnection.js";

// ==================== ROLE MODEL ====================
export const Role = sequelize.define('sys_role', {
  role_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  role_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: {
      name: 'unique_role_name',
      msg: 'Role name already exists'
    },
    validate: {
      notEmpty: {
        msg: 'Role name cannot be empty'
      },
      isIn: {
        args: [['OWNER', 'ADMIN', 'USER', 'VIEWER', 'AUDITOR']],
        msg: 'Invalid role name'
      }
    }
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: null
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  create_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
    field: 'create_date'
  },
  update_date: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'update_date'
  }
}, {
  timestamps: false,
  tableName: 'sys_role',
  indexes: [
    {
      unique: true,
      fields: ['role_name']
    },
    {
      fields: ['is_active']
    }
  ]
});

// ==================== CONSTANTS ====================
Role.ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  USER: 'USER',
  VIEWER: 'VIEWER',
  AUDITOR: 'AUDITOR'
};

Role.PERMISSIONS = {
  OWNER: ['create', 'read', 'update', 'delete', 'manage_users', 'manage_roles', 'system_config'],
  ADMIN: ['create', 'read', 'update', 'delete', 'manage_users'],
  USER: ['create', 'read', 'update', 'delete_own'],
  VIEWER: ['read'],
  AUDITOR: ['read', 'audit', 'view_logs']
};

Role.HIERARCHY = {
  OWNER: 5,
  ADMIN: 4,
  USER: 3,
  AUDITOR: 2,
  VIEWER: 1
};

// ==================== INSTANCE METHODS ====================

Role.prototype.hasPermission = function(action) {
  const permissions = Role.PERMISSIONS[this.role_name] || [];
  return permissions.includes(action);
};

Role.prototype.isHigherThan = function(otherRoleName) {
  const thisLevel = Role.HIERARCHY[this.role_name] || 0;
  const otherLevel = Role.HIERARCHY[otherRoleName] || 0;
  return thisLevel > otherLevel;
};

Role.prototype.isHigherOrEqual = function(otherRoleName) {
  const thisLevel = Role.HIERARCHY[this.role_name] || 0;
  const otherLevel = Role.HIERARCHY[otherRoleName] || 0;
  return thisLevel >= otherLevel;
};

Role.prototype.getPermissions = function() {
  return Role.PERMISSIONS[this.role_name] || [];
};

Role.prototype.isOwner = function() {
  return this.role_name === Role.ROLES.OWNER;
};

Role.prototype.isAdminOrHigher = function() {
  return this.isHigherOrEqual(Role.ROLES.ADMIN);
};

Role.prototype.toSafeJSON = function() {
  return {
    role_id: this.role_id,
    role_name: this.role_name,
    description: this.description,
    is_active: this.is_active,
    permissions: this.getPermissions(),
    hierarchy_level: Role.HIERARCHY[this.role_name],
    create_date: this.create_date
  };
};

// ==================== CLASS METHODS ====================

Role.getDefaultRole = function() {
  return Role.ROLES.USER;
};

Role.getRoleHierarchy = function() {
  return Object.keys(Role.HIERARCHY).sort((a, b) => 
    Role.HIERARCHY[b] - Role.HIERARCHY[a]
  );
};

Role.isValidRole = function(roleName) {
  return Object.values(Role.ROLES).includes(roleName);
};

Role.findByName = async function(roleName) {
  return await this.findOne({
    where: { 
      role_name: roleName,
      is_active: true
    }
  });
};

Role.findAllActive = async function() {
  return await this.findAll({
    where: { is_active: true },
    order: [
      [sequelize.literal(`CASE role_name 
        WHEN 'OWNER' THEN 5 
        WHEN 'ADMIN' THEN 4 
        WHEN 'USER' THEN 3 
        WHEN 'AUDITOR' THEN 2 
        WHEN 'VIEWER' THEN 1 
        ELSE 0 END`), 'DESC']
    ]
  });
};

Role.getPermissionsByRoleName = function(roleName) {
  return Role.PERMISSIONS[roleName] || [];
};

Role.compareRoles = function(roleName1, roleName2) {
  const level1 = Role.HIERARCHY[roleName1] || 0;
  const level2 = Role.HIERARCHY[roleName2] || 0;
  
  if (level1 > level2) return 1;
  if (level1 < level2) return -1;
  return 0;
};

export const RoleModel = {
  Role,
  ROLES: Role.ROLES,
  PERMISSIONS: Role.PERMISSIONS,
  HIERARCHY: Role.HIERARCHY
};

export default RoleModel;