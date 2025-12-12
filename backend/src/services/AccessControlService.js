import MenuModel from '../models/MenuModel.js';
import UserRightsModel from '../models/UserRightsModel.js';
import RolePermissionModel from '../models/RolePermissionModel.js';
import { OrganizationMember, User, Organization } from '../models/dbModels.js';
import { createError } from '../middleware/errorHandler.js';
import { redisClient } from '../config/redis.js';
import logger from '../utils/logger.js';

const SYSTEM_ADMIN_ROLE_ID = 1;
const CACHE_TTL = 300; // 5 นาที

export const createAccessControlService = (deps = {}) => {
  // Inject Models (Repository Pattern)
  const Menu = deps.MenuModel || MenuModel;
  const UserRights = deps.UserRightsModel || UserRightsModel;
  const RolePerms = deps.RolePermissionModel || RolePermissionModel;
  
  // Inject Standard Models
  const Member = deps.MemberModel || OrganizationMember;
  const UserModel = deps.User || User;
  const CompanyModel = deps.Organization || Organization;
  
  const redis = deps.redis || redisClient;

  // --- Private Logic ---

  const _checkUserOverride = async (userId, orgId, permissionCode) => {
    // เรียก wrapper function (ไม่ต้องเขียน findOne ที่นี่แล้ว)
    const menu = await Menu.findByPermissionCode(permissionCode);
    if (!menu) return null; // ไม่พบเมนูนี้ในระบบ

    // เรียก wrapper function
    const override = await UserRights.findOverride(userId, orgId, menu.menu_ref_id);
    return override ? override.menu_rights_is_visible : null;
  };

  const _checkRolePermission = async (userId, orgId, permissionCode) => {
    const menu = await Menu.findByPermissionCode(permissionCode);
    if (!menu) return false;

    // หา Role ปัจจุบันของผู้ใช้
    const membership = await Member.findOne({
      where: { user_id: userId, org_id: orgId },
      attributes: ['role_id']
    });

    if (!membership) return false;

    // เรียก wrapper function เพื่อเช็คสิทธิ์ Role
    return await RolePerms.checkPermission(membership.role_id, menu.menu_ref_id);
  };

  // --- Public Methods ---

  const checkPermission = async (userId, orgId, permissionCode) => {
    const cacheKey = `perm:${userId}:${orgId}:${permissionCode}`;

    // 1. Try Redis Cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached !== null) return cached === '1';
    } catch (err) {
      logger.error('Redis Get Error:', err);
    }

    // 2. Logic Check
    let isAllowed = false;
    
    // Check Global Admin
    const user = await UserModel.findByPk(userId, { attributes: ['role_id'] });
    if (user?.role_id === SYSTEM_ADMIN_ROLE_ID) isAllowed = true;

    // Check Owner
    if (!isAllowed) {
        const company = await CompanyModel.findByPk(orgId, { attributes: ['owner_user_id'] });
        if (company?.owner_user_id === userId) isAllowed = true;
    }

    // Check Hybrid RBAC (Override -> Role)
    if (!isAllowed) {
      const override = await _checkUserOverride(userId, orgId, permissionCode);
      if (override !== null) {
        isAllowed = override; // ใช้ค่า Override
      } else {
        isAllowed = await _checkRolePermission(userId, orgId, permissionCode); // ใช้ค่า Role
      }
    }

    // 3. Set Cache
    try {
      await redis.set(cacheKey, isAllowed ? '1' : '0', 'EX', CACHE_TTL);
    } catch (err) {
      logger.error('Redis Set Error:', err);
    }

    return isAllowed;
  };

  const toggleUserOverrideDB = async (targetUserId, orgId, permissionCode, isEnabled) => {
    const menu = await Menu.findByPermissionCode(permissionCode);
    if (!menu) throw createError.notFound(`Permission Code ${permissionCode} not found.`);

    // 1. DB Operation (ผ่าน Wrapper)
    if (isEnabled) {
      await UserRights.upsertOverride(targetUserId, orgId, menu.menu_ref_id, true);
    } else {
      await UserRights.removeOverride(targetUserId, orgId, menu.menu_ref_id);
    }

    // 2. Invalidate Cache (ล้าง Cache ทันทีที่มีการเปลี่ยนสิทธิ์)
    const cacheKey = `perm:${targetUserId}:${orgId}:${permissionCode}`;
    await redis.del(cacheKey);
  };

  return { checkPermission, toggleUserOverrideDB };
};

const defaultInstance = createAccessControlService();
export default defaultInstance;