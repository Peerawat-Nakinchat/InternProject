// src/models/dbModels.js
import sequelize from "../config/dbConnection.js";
import { ROLE_ID, ROLE_NAME } from "../constants/roles.js";
import logger from "../utils/logger.js";

// ==================== IMPORT MODELS ====================
// Import เฉพาะ Model definitions (ไม่ใช่ sequelize จากไฟล์อื่น)
import { User } from "./UserModel.js";
import { Role } from "./RoleModel.js";
import { Organization } from "./CompanyModel.js";
import { OrganizationMember } from "./MemberModel.js";
import { RefreshToken } from "./TokenModel.js";
import { AuditLog } from "./AuditLogModel.js";
import { Invitation } from "./InvitationModel.js";
import { Otp } from "./OtpModel.js";

// ==================== ASSOCIATIONS ====================

// User <-> Role
User.belongsTo(Role, { foreignKey: "role_id", as: "role" });
Role.hasMany(User, { foreignKey: "role_id", as: "users" });

// Organization <-> User (Owner)
Organization.belongsTo(User, {
  foreignKey: "owner_user_id",
  as: "owner",
});
User.hasMany(Organization, {
  foreignKey: "owner_user_id",
  as: "ownedOrganizations",
});

// Organization <-> User (Members) - Many-to-Many
Organization.belongsToMany(User, {
  through: OrganizationMember,
  foreignKey: "org_id",
  otherKey: "user_id",
  as: "members",
});

User.belongsToMany(Organization, {
  through: OrganizationMember,
  foreignKey: "user_id",
  otherKey: "org_id",
  as: "organizations",
});

// OrganizationMember associations
OrganizationMember.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});
OrganizationMember.belongsTo(Organization, {
  foreignKey: "org_id",
  as: "organization",
});
OrganizationMember.belongsTo(Role, {
  foreignKey: "role_id",
  as: "role",
});

// RefreshToken <-> User
RefreshToken.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
  onDelete: "CASCADE",
});
User.hasMany(RefreshToken, {
  foreignKey: "user_id",
  as: "refreshTokens",
  onDelete: "CASCADE",
});

Invitation.belongsTo(User, {
  foreignKey: "invited_by",
  as: "inviter",
});
Invitation.belongsTo(Organization, {
  foreignKey: "org_id",
  as: "organization",
});
Invitation.belongsTo(Role, {
  foreignKey: "role_id",
  as: "role",
});

const checkConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info("✅ Database connection established successfully.");
  } catch (error) {
    logger.error("❌ Unable to connect to the database:", error);
    process.exit(1); // Fail fast ถ้าต่อ DB ไม่ได้
  }
};

// Seed initial roles
const seedRoles = async () => {
  try {
    const roles = Object.keys(ROLE_ID).map((key) => ({
      role_id: ROLE_ID[key],
      role_name: ROLE_NAME[ROLE_ID[key]],
    }));

    for (const role of roles) {
      await Role.findOrCreate({
        where: { role_id: role.role_id },
        defaults: role,
      });
    }
    logger.info("✅ Roles seeded successfully");
  } catch (error) {
    logger.error("❌ Role seeding error:", error);
  }
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
  Invitation,
  Otp,
  checkConnection
};

export default {
  sequelize,
  Role,
  User,
  Organization,
  OrganizationMember,
  RefreshToken,
  AuditLog,
  Invitation,
  Otp,
  checkConnection
};
