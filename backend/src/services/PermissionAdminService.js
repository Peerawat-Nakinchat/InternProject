import { OrganizationMember, User, Role } from '../models/dbModels.js';
import MenuModel from '../models/MenuModel.js';
import UserRightsModel from '../models/UserRightsModel.js';
import AccessControlService from './AccessControlService.js';
import { createError } from '../middleware/errorHandler.js';

export const createPermissionAdminService = (deps = {}) => {
  const Member = deps.MemberModel || OrganizationMember;
  const Menu = deps.MenuModel || MenuModel;
  const UserRights = deps.UserRightsModel || UserRightsModel;
  const AccessControl = deps.AccessControlService || AccessControlService;

  const getUsersAndModuleRights = async (orgId) => {
    // 1. ดึงข้อมูลสมาชิกทั้งหมดใน Org
    const members = await Member.findAll({
      where: { org_id: orgId },
      include: [
        { model: User, as: 'user', attributes: ['user_id', 'full_name', 'email'] },
        { model: Role, as: 'role', attributes: ['role_name'] }
      ],
      attributes: ['user_id', 'role_id']
    });

    // 2. ดึง Master Modules ผ่าน Wrapper
    const masterModules = await Menu.getAllMasterModules();

    // 3. ดึง Override ทั้งหมดใน Org ผ่าน Wrapper
    const currentOverrides = await UserRights.findAllByOrg(orgId);

    // 4. Transform Data ให้ Frontend ใช้ง่าย
    return members.map(member => {
      const userOverrides = currentOverrides.filter(o => o.user_id === member.user_id);
      
      const moduleStatus = masterModules.reduce((acc, module) => {
        const override = userOverrides.find(o => o.menu_ref_id === module.menu_ref_id);
        acc[module.menu_id] = {
          isEnabled: override ? override.menu_rights_is_visible : false, // ถ้าไม่มี override ถือว่า false สำหรับปุ่ม Toggle
          menu_ref_id: module.menu_ref_id
        };
        return acc;
      }, {});

      return {
        userId: member.user_id,
        fullName: member.user?.full_name || 'Unknown',
        roleName: member.role?.role_name || 'Unknown',
        modules: moduleStatus
      };
    });
  };

  const toggleModuleAccess = async (targetUserId, orgId, moduleCode, isEnabled) => {
    // ตรวจสอบว่าเป็นสมาชิกจริงไหม
    const isMember = await Member.findOne({ where: { user_id: targetUserId, org_id: orgId } });
    if (!isMember) throw createError.forbidden("User is not a member of this organization");

    await AccessControl.toggleUserOverrideDB(targetUserId, orgId, moduleCode, isEnabled);
  };

  return { getUsersAndModuleRights, toggleModuleAccess };
};

const defaultInstance = createPermissionAdminService();
export default defaultInstance;