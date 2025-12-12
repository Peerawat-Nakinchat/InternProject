// src/services/MemberService.js
import { sequelize } from "../models/dbModels.js";
import { MemberModel } from "../models/MemberModel.js";
import { ROLE_ID } from "../constants/roles.js";
import { createError } from "../middleware/errorHandler.js";

export const createMemberService = (deps = {}) => {
  const Member = deps.MemberModel || MemberModel;
  const db = deps.sequelize || sequelize;

  const getMembers = async (orgId, actorRoleId, filters = {}) => {
    if (!actorRoleId || actorRoleId > ROLE_ID.MEMBER) {
      throw createError.forbidden("สิทธิ์ไม่เพียงพอในการดูสมาชิก");
    }
    return await Member.findByOrganization(orgId, filters);
  };

  const inviteMember = async (orgId, inviterUserId, inviterRoleId, invitedUserId, roleId) => {
    if (!invitedUserId || !roleId) throw createError.badRequest("invitedUserId and roleId required");

    if (!inviterRoleId || inviterRoleId > ROLE_ID.ADMIN) {
      throw createError.forbidden("สิทธิ์ไม่เพียงพอ (ต้องเป็น OWNER หรือ ADMIN)");
    }

    const isMember = await Member.exists(orgId, invitedUserId);
    if (isMember) {
      throw createError.conflict("ผู้ใช้นี้เป็นสมาชิกอยู่แล้ว");
    }
    
    return await Member.create({ orgId, userId: invitedUserId, roleId });
  };

  const changeMemberRole = async (orgId, actorUserId, actorRoleId, targetMemberId, newRoleId) => {
    if (!actorRoleId || actorRoleId > ROLE_ID.ADMIN) {
      throw createError.forbidden("สิทธิ์ไม่เพียงพอ");
    }

    const targetRole = await Member.getRole(orgId, targetMemberId);
    if (!targetRole) throw createError.notFound("ไม่พบสมาชิก");

    if (targetRole === ROLE_ID.OWNER) {
      throw createError.forbidden("ไม่สามารถเปลี่ยน role ของ OWNER ได้");
    }

    return await Member.updateRole(orgId, targetMemberId, newRoleId);
  };

  const removeMember = async (orgId, actorUserId, actorRoleId, targetMemberId) => {
    if (!actorRoleId || actorRoleId > ROLE_ID.ADMIN) {
      throw createError.forbidden("สิทธิ์ไม่เพียงพอ");
    }

    const targetRole = await Member.getRole(orgId, targetMemberId);
    if (targetRole === ROLE_ID.OWNER) {
      throw createError.forbidden("ไม่สามารถลบ OWNER ได้");
    }

    const deleted = await Member.remove(orgId, targetMemberId);
    if (!deleted) throw createError.notFound("ไม่พบสมาชิก");

    return { success: true };
  };

  const transferOwner = async (orgId, currentOwnerId, currentOwnerRoleId, newOwnerUserId) => {
    if (currentOwnerRoleId !== ROLE_ID.OWNER) {
      throw createError.forbidden("ต้องเป็น OWNER เท่านั้นในการโอนสิทธิ์");
    }

    const isMember = await Member.exists(orgId, newOwnerUserId);
    if (!isMember) {
      throw createError.badRequest("ผู้รับโอนต้องเป็นสมาชิกขององค์กรก่อน");
    }

    const t = await db.transaction();
    try {
      await Member.updateOwner(orgId, newOwnerUserId, t);
      await Member.updateRole(orgId, newOwnerUserId, ROLE_ID.OWNER, t); 
      await Member.updateRole(orgId, currentOwnerId, ROLE_ID.ADMIN, t); 
      
      await t.commit();
      return { success: true };
    } catch (error) {
      if (!t.finished) await t.rollback();
      throw error;
    }
  };

  const getMembersWithPagination = async (orgId, actorRoleId, options = {}) => {
    if (!actorRoleId || actorRoleId > ROLE_ID.MEMBER) {
      throw createError.forbidden("สิทธิ์ไม่เพียงพอในการดูสมาชิก");
    }
    return await Member.findByOrganizationPaginated(orgId, options);
  };

  const bulkRemoveMembers = async (orgId, actorRoleId, userIds) => {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw createError.badRequest("กรุณาระบุรายชื่อสมาชิกที่ต้องการลบ");
    }

    if (actorRoleId !== ROLE_ID.OWNER) {
      throw createError.forbidden("เฉพาะ OWNER เท่านั้นที่สามารถลบสมาชิกหลายคนได้");
    }

    const targetMembers = await Member.findRolesInList(orgId, userIds);
    const hasOwner = targetMembers.some(member => member.roleId === ROLE_ID.OWNER);
    
    if (hasOwner) {
      throw createError.forbidden("พบ OWNER อยู่ในรายการลบ: ไม่สามารถลบ OWNER ได้ กรุณาโอนสิทธิ์ก่อน");
    }
    const deletedCount = await Member.bulkRemove(orgId, userIds);

    return { success: true, deleted: deletedCount };
  };

  return {
    getMembers, inviteMember, changeMemberRole, removeMember, transferOwner,
    getMembersWithPagination, getMemberCount: Member.countByOrganization,
    bulkRemoveMembers, checkMembership: Member.exists, getUserMemberships: Member.findByUser
  };
};

const defaultInstance = createMemberService();
export default defaultInstance;