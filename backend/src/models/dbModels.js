import sequelize from "../config/dbConnection.js";
import { ROLE_ID, ROLE_NAME } from "../constants/roles.js";
import logger from "../utils/logger.js";

// --- Import Existing Models ---
import { User } from "./UserModel.js";
import { Role } from "./RoleModel.js";
import { Organization } from "./CompanyModel.js";
import { OrganizationMember } from "./MemberModel.js";
import { RefreshToken } from "./TokenModel.js";
import { AuditLog } from "./AuditLogModel.js";
import { Invitation } from "./InvitationModel.js";
import { Otp } from "./OtpModel.js";

// --- Import New Access Control Models (ใช้ Named Import) ---
import { Menu } from "./MenuModel.js";
import { RolePermission } from "./RolePermissionModel.js";
import { UserRights } from "./UserRightsModel.js";

// ==================== ASSOCIATIONS ====================

// --- Existing Associations ---
User.belongsTo(Role, { foreignKey: "role_id", as: "role" });
Role.hasMany(User, { foreignKey: "role_id", as: "users" });

Organization.belongsTo(User, { foreignKey: "owner_user_id", as: "owner" });
User.hasMany(Organization, { foreignKey: "owner_user_id", as: "ownedOrganizations" });

Organization.belongsToMany(User, { through: OrganizationMember, foreignKey: "org_id", otherKey: "user_id", as: "members" });
User.belongsToMany(Organization, { through: OrganizationMember, foreignKey: "user_id", otherKey: "org_id", as: "organizations" });

OrganizationMember.belongsTo(User, { foreignKey: "user_id", as: "user" });
OrganizationMember.belongsTo(Organization, { foreignKey: "org_id", as: "organization" });
OrganizationMember.belongsTo(Role, { foreignKey: "role_id", as: "role" });

RefreshToken.belongsTo(User, { foreignKey: "user_id", as: "user", onDelete: "CASCADE" });
User.hasMany(RefreshToken, { foreignKey: "user_id", as: "refreshTokens", onDelete: "CASCADE" });

Invitation.belongsTo(User, { foreignKey: "invited_by", as: "inviter" });
Invitation.belongsTo(Organization, { foreignKey: "org_id", as: "organization" });
Invitation.belongsTo(Role, { foreignKey: "role_id", as: "role" });

// --- NEW ACCESS CONTROL ASSOCIATIONS ---

// 1. Role <-> Menu (ผ่าน RolePermission)
// ตรวจสอบว่า Role, RolePermission, Menu ไม่เป็น undefined ก่อนเรียก hasMany
if (Role && RolePermission && Menu) {
    Role.hasMany(RolePermission, { foreignKey: "role_id", as: "permissions" });
    RolePermission.belongsTo(Role, { foreignKey: "role_id", as: "role" });

    Menu.hasMany(RolePermission, { foreignKey: "menu_ref_id", as: "rolePermissions" });
    RolePermission.belongsTo(Menu, { foreignKey: "menu_ref_id", as: "menu" });
}

// 2. User/Org <-> Menu (ผ่าน UserRights - Override)
if (User && Organization && Menu && UserRights) {
    User.hasMany(UserRights, { foreignKey: "user_id", as: "rights" });
    UserRights.belongsTo(User, { foreignKey: "user_id", as: "user" });

    Organization.hasMany(UserRights, { foreignKey: "org_id", as: "userRights" });
    UserRights.belongsTo(Organization, { foreignKey: "org_id", as: "organization" });

    Menu.hasMany(UserRights, { foreignKey: "menu_ref_id", as: "userRights" });
    UserRights.belongsTo(Menu, { foreignKey: "menu_ref_id", as: "menu" });
}

const checkConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info("✅ Database connection established successfully.");
  } catch (error) {
    logger.error("❌ Unable to connect to the database:", error);
    process.exit(1);
  }
};

// ... (seedRoles function เหมือนเดิม) ...

// ==================== EXPORTS ====================
export {
  sequelize, Role, User, Organization, OrganizationMember,
  RefreshToken, AuditLog, Invitation, Otp,
  // New Exports
  Menu, RolePermission, UserRights,
  checkConnection
};

export default {
  sequelize, Role, User, Organization, OrganizationMember,
  RefreshToken, AuditLog, Invitation, Otp,
  Menu, RolePermission, UserRights,
  checkConnection
};