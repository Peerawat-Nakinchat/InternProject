// src/services/MemberService.js
import { sequelize } from "../models/dbModels.js";
import { MemberModel } from "../models/MemberModel.js";

/**
 * MemberService - Business Logic สำหรับการจัดการสมาชิกในองค์กร
 */
class MemberService {
  /**
   * ดึงรายชื่อสมาชิกในองค์กร
   */
  async getMembers(orgId, actorRoleId, filters = {}) {
    // Check permission - role 1, 2, 3 can view members
    if (!actorRoleId || actorRoleId > 3) {
      throw new Error("สิทธิ์ไม่เพียงพอในการดูสมาชิก");
    }

    const members = await MemberModel.findByOrganization(orgId, filters);
    return members;
  }

  /**
   * เชิญสมาชิกเข้าองค์กร
   */
  async inviteMember(orgId, inviterUserId, inviterRoleId, invitedUserId, roleId) {
    // Validation
    if (!invitedUserId || !roleId) {
      throw new Error("invitedUserId and roleId required");
    }

    // Check permission - only OWNER (1) or ADMIN (2) can invite
    if (!inviterRoleId || inviterRoleId > 2) {
      throw new Error("สิทธิ์ไม่เพียงพอ (ต้องเป็น OWNER หรือ ADMIN)");
    }

    // Check if user is already a member
    const isMember = await MemberModel.exists(orgId, invitedUserId);
    if (isMember) {
      throw new Error("ผู้ใช้นี้เป็นสมาชิกอยู่แล้ว");
    }

    // Add member
    const newMember = await MemberModel.create(
      {
        orgId,
        userId: invitedUserId,
        roleId,
      }
    );

    return newMember;
  }

  /**
   * เปลี่ยน role ของสมาชิก
   */
  async changeMemberRole(orgId, actorUserId, actorRoleId, targetMemberId, newRoleId) {
    // Check actor permission - only OWNER or ADMIN can change roles
    if (!actorRoleId || actorRoleId > 2) {
      throw new Error("สิทธิ์ไม่เพียงพอ");
    }

    // Check target member exists and get their current role
    const targetRole = await MemberModel.getRole(orgId, targetMemberId);

    if (!targetRole) {
      throw new Error("ไม่พบสมาชิก");
    }

    // Cannot change OWNER role
    if (targetRole === 1) {
      throw new Error("ไม่สามารถเปลี่ยน role ของ OWNER ได้");
    }

    // Update role
    const updatedMember = await MemberModel.updateRole(
      orgId,
      targetMemberId,
      newRoleId
    );

    return updatedMember;
  }

  /**
   * ลบสมาชิกออกจากองค์กร
   */
  async removeMember(orgId, actorUserId, actorRoleId, targetMemberId) {
    // Check actor permission
    if (!actorRoleId || actorRoleId > 2) {
      throw new Error("สิทธิ์ไม่เพียงพอ");
    }

    // Check target role
    const targetRole = await MemberModel.getRole(orgId, targetMemberId);

    if (targetRole === 1) {
      throw new Error("ไม่สามารถลบ OWNER ได้");
    }

    // Remove member
    const deleted = await MemberModel.remove(orgId, targetMemberId);

    if (!deleted) {
      throw new Error("ไม่พบสมาชิก");
    }

    return { success: true };
  }

  /**
   * โอนความเป็นเจ้าขององค์กร
   */
  async transferOwner(orgId, currentOwnerId, currentOwnerRoleId, newOwnerUserId) {
    // Check permission - must be current OWNER
    if (currentOwnerRoleId !== 1) {
      throw new Error("ต้องเป็น OWNER เท่านั้นในการโอนสิทธิ์");
    }

    // Check if new owner is a member
    const isMember = await MemberModel.exists(orgId, newOwnerUserId);
    if (!isMember) {
      throw new Error("ผู้รับโอนต้องเป็นสมาชิกขององค์กรก่อน");
    }

    const t = await sequelize.transaction();

    try {
      // Update organization owner
      await MemberModel.updateOwner(orgId, newOwnerUserId, t);

      // Update new owner's role to OWNER (1)
      await MemberModel.updateRole(orgId, newOwnerUserId, 1, t);

      // Update old owner's role to ADMIN (2)
      await MemberModel.updateRole(orgId, currentOwnerId, 2, t);

      await t.commit();

      return { success: true };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Get members with pagination
   */
  async getMembersWithPagination(orgId, actorRoleId, options = {}) {
    // Check permission
    if (!actorRoleId || actorRoleId > 3) {
      throw new Error("สิทธิ์ไม่เพียงพอในการดูสมาชิก");
    }

    const result = await MemberModel.findByOrganizationPaginated(orgId, options);
    return result;
  }

  /**
   * Get member count
   */
  async getMemberCount(orgId) {
    const count = await MemberModel.countByOrganization(orgId);
    return count;
  }

  /**
   * Bulk remove members
   */
  async bulkRemoveMembers(orgId, actorRoleId, userIds) {
    // Check permission - only OWNER can bulk remove
    if (actorRoleId !== 1) {
      throw new Error("เฉพาะ OWNER เท่านั้นที่สามารถลบสมาชิกหลายคนได้");
    }

    // Check if trying to remove owner
    for (const userId of userIds) {
      const role = await MemberModel.getRole(orgId, userId);
      if (role === 1) {
        throw new Error("ไม่สามารถลบ OWNER ได้");
      }
    }

    const deleted = await MemberModel.bulkRemove(orgId, userIds);
    return { deleted, success: true };
  }

  /**
   * Check if user is member of organization
   */
  async checkMembership(orgId, userId) {
    const isMember = await MemberModel.exists(orgId, userId);
    return isMember;
  }

  /**
   * Get user's memberships
   */
  async getUserMemberships(userId) {
    const memberships = await MemberModel.findByUser(userId);
    return memberships;
  }
}

export default new MemberService();