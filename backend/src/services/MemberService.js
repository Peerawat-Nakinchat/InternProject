// src/services/MemberService.js
import { sequelize } from "../models/dbModels.js";
import { MemberModel } from "../models/MemberModel.js";

/**
 * Factory for MemberService
 * @param {Object} deps - Dependencies injection
 */
export const createMemberService = (deps = {}) => {
  // Inject Dependencies
  const Member = deps.MemberModel || MemberModel;
  const db = deps.sequelize || sequelize;

  /**
   * Get Members
   */
  const getMembers = async (orgId, actorRoleId, filters = {}) => {
    // Check permission - role 1, 2, 3 can view members
    if (!actorRoleId || actorRoleId > 3) {
      throw new Error("สิทธิ์ไม่เพียงพอในการดูสมาชิก");
    }

    const members = await Member.findByOrganization(orgId, filters);
    return members;
  };

  /**
   * Invite Member (Add existing user to org)
   */
  const inviteMember = async (orgId, inviterUserId, inviterRoleId, invitedUserId, roleId) => {
    // Validation
    if (!invitedUserId || !roleId) {
      throw new Error("invitedUserId and roleId required");
    }

    // Check permission - only OWNER (1) or ADMIN (2) can invite
    if (!inviterRoleId || inviterRoleId > 2) {
      throw new Error("สิทธิ์ไม่เพียงพอ (ต้องเป็น OWNER หรือ ADMIN)");
    }

    // Check if user is already a member
    const isMember = await Member.exists(orgId, invitedUserId);
    if (isMember) {
      throw new Error("ผู้ใช้นี้เป็นสมาชิกอยู่แล้ว");
    }

    // Add member
    const newMember = await Member.create({
      orgId,
      userId: invitedUserId,
      roleId,
    });

    return newMember;
  };

  /**
   * Change Member Role
   */
  const changeMemberRole = async (orgId, actorUserId, actorRoleId, targetMemberId, newRoleId) => {
    // Check actor permission - only OWNER or ADMIN can change roles
    if (!actorRoleId || actorRoleId > 2) {
      throw new Error("สิทธิ์ไม่เพียงพอ");
    }

    // Check target member exists and get their current role
    const targetRole = await Member.getRole(orgId, targetMemberId);

    if (!targetRole) {
      throw new Error("ไม่พบสมาชิก");
    }

    // Cannot change OWNER role
    if (targetRole === 1) {
      throw new Error("ไม่สามารถเปลี่ยน role ของ OWNER ได้");
    }

    // Update role
    const updatedMember = await Member.updateRole(
      orgId,
      targetMemberId,
      newRoleId
    );

    return updatedMember;
  };

  /**
   * Remove Member
   */
  const removeMember = async (orgId, actorUserId, actorRoleId, targetMemberId) => {
    // Check actor permission
    if (!actorRoleId || actorRoleId > 2) {
      throw new Error("สิทธิ์ไม่เพียงพอ");
    }

    // Check target role
    const targetRole = await Member.getRole(orgId, targetMemberId);

    if (targetRole === 1) {
      throw new Error("ไม่สามารถลบ OWNER ได้");
    }

    // Remove member
    const deleted = await Member.remove(orgId, targetMemberId);

    if (!deleted) {
      throw new Error("ไม่พบสมาชิก");
    }

    return { success: true };
  };

  /**
   * Transfer Ownership
   */
  const transferOwner = async (orgId, currentOwnerId, currentOwnerRoleId, newOwnerUserId) => {
    // Check permission - must be current OWNER
    if (currentOwnerRoleId !== 1) {
      throw new Error("ต้องเป็น OWNER เท่านั้นในการโอนสิทธิ์");
    }

    // Check if new owner is a member
    const isMember = await Member.exists(orgId, newOwnerUserId);
    if (!isMember) {
      throw new Error("ผู้รับโอนต้องเป็นสมาชิกขององค์กรก่อน");
    }

    const t = await db.transaction();

    try {
      // Update organization owner (assuming MemberModel handles this logic or proxies to OrgModel)
      // Note: Based on original code, MemberModel.updateOwner is used.
      await Member.updateOwner(orgId, newOwnerUserId, t);

      // Update new owner's role to OWNER (1)
      await Member.updateRole(orgId, newOwnerUserId, 1, t);

      // Update old owner's role to ADMIN (2)
      await Member.updateRole(orgId, currentOwnerId, 2, t);

      await t.commit();

      return { success: true };
    } catch (error) {
      if (!t.finished) await t.rollback();
      throw error;
    }
  };

  /**
   * Get Members with Pagination
   */
  const getMembersWithPagination = async (orgId, actorRoleId, options = {}) => {
    // Check permission
    if (!actorRoleId || actorRoleId > 3) {
      throw new Error("สิทธิ์ไม่เพียงพอในการดูสมาชิก");
    }

    const result = await Member.findByOrganizationPaginated(orgId, options);
    return result;
  };

  /**
   * Get Member Count
   */
  const getMemberCount = async (orgId) => {
    return await Member.countByOrganization(orgId);
  };

  /**
   * Bulk Remove Members
   */
  const bulkRemoveMembers = async (orgId, actorRoleId, userIds) => {
    // Check permission - only OWNER can bulk remove
    if (actorRoleId !== 1) {
      throw new Error("เฉพาะ OWNER เท่านั้นที่สามารถลบสมาชิกหลายคนได้");
    }

    // Check if trying to remove owner
    for (const userId of userIds) {
      const role = await Member.getRole(orgId, userId);
      if (role === 1) {
        throw new Error("ไม่สามารถลบ OWNER ได้");
      }
    }

    const deleted = await Member.bulkRemove(orgId, userIds);
    return { deleted, success: true };
  };

  /**
   * Check Membership
   */
  const checkMembership = async (orgId, userId) => {
    return await Member.exists(orgId, userId);
  };

  /**
   * Get User Memberships
   */
  const getUserMemberships = async (userId) => {
    return await Member.findByUser(userId);
  };

  return {
    getMembers,
    inviteMember,
    changeMemberRole,
    removeMember,
    transferOwner,
    getMembersWithPagination,
    getMemberCount,
    bulkRemoveMembers,
    checkMembership,
    getUserMemberships
  };
};

// Default Instance
const defaultInstance = createMemberService();
export default defaultInstance;