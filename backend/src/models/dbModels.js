// src/models/dbModels.js
import sequelize from "../config/dbConnection.js";
import { DataTypes } from 'sequelize';

// ==================== IMPORT MODELS ====================
// Import เฉพาะ Model definitions (ไม่ใช่ sequelize จากไฟล์อื่น)
import { User } from "./UserModel.js";
import { Role } from "./RoleModel.js";
import { Organization } from "./CompanyModel.js";
import { OrganizationMember } from "./MemberModel.js";
import { RefreshToken } from "./TokenModel.js";
import { AuditLog } from "./AuditLogModel.js";

// ==================== ASSOCIATIONS ====================

// User <-> Role
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });

// Organization <-> User (Owner)
Organization.belongsTo(User, { 
  foreignKey: 'owner_user_id', 
  as: 'owner' 
});
User.hasMany(Organization, { 
  foreignKey: 'owner_user_id', 
  as: 'ownedOrganizations' 
});

// Organization <-> User (Members) - Many-to-Many
Organization.belongsToMany(User, {
  through: OrganizationMember,
  foreignKey: 'org_id',
  otherKey: 'user_id',
  as: 'members'
});

User.belongsToMany(Organization, {
  through: OrganizationMember,
  foreignKey: 'user_id',
  otherKey: 'org_id',
  as: 'organizations'
});

// OrganizationMember associations
OrganizationMember.belongsTo(User, { 
  foreignKey: 'user_id', 
  as: 'user' 
});
OrganizationMember.belongsTo(Organization, { 
  foreignKey: 'org_id', 
  as: 'organization' 
});
OrganizationMember.belongsTo(Role, { 
  foreignKey: 'role_id', 
  as: 'role' 
});

// RefreshToken <-> User
RefreshToken.belongsTo(User, { 
  foreignKey: 'user_id', 
  as: 'user',
  onDelete: 'CASCADE' 
});
User.hasMany(RefreshToken, { 
  foreignKey: 'user_id', 
  as: 'refreshTokens',
  onDelete: 'CASCADE' 
});

// ==================== SYNC DATABASE ====================
const syncDatabase = async () => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database synced successfully');
      
      await seedRoles();
    }
  } catch (error) {
    console.error('❌ Database sync error:', error);
    throw error;
  }
};

// Seed initial roles
const seedRoles = async () => {
  const roles = [
    { role_id: 1, role_name: 'OWNER' },
    { role_id: 2, role_name: 'ADMIN' },
    { role_id: 3, role_name: 'USER' },
    { role_id: 4, role_name: 'VIEWER' },
    { role_id: 5, role_name: 'AUDITOR' }
  ];

  for (const role of roles) {
    await Role.findOrCreate({
      where: { role_id: role.role_id },
      defaults: role
    });
  }
  console.log('✅ Roles seeded successfully');
};

// ==================== EXPORTS ====================
export {
  sequelize,
  Role,
  User,
  Organization,
  OrganizationMember,
  RefreshToken,
  AuditLog,
  syncDatabase
};

export default {
  sequelize,
  Role,
  User,
  Organization,
  OrganizationMember,
  RefreshToken,
  AuditLog,
  syncDatabase
};