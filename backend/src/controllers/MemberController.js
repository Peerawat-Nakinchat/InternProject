// src/controllers/MemberController.js
import { MemberService } from '../services/MemberService.js';
import { MemberModel } from '../models/MemberModel.js';

/**
 * GET /api/members/:orgId
 * Allowed: OWNER(1), ADMIN(2), MANAGER(3)
 * requireOrganization middleware should set req.user.org_role_id and req.user.current_org_id
 */
const listMembers = async (req, res) => {
  try {
    const orgId = req.params.orgId || req.user?.current_org_id;
    if (!orgId) return res.status(400).json({ success: false, message: 'orgId required' });

    const role = req.user?.org_role_id;
    if (!role || role > 3) { // allow 1,2,3
      return res.status(403).json({ success: false, message: 'สิทธิ์ไม่เพียงพอในการดูสมาชิก' });
    }

    const members = await MemberService.getMembersForOrg(orgId);
    return res.status(200).json({ success: true, data: members });
  } catch (err) {
    console.error('List members error:', err);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงสมาชิก' });
  }
};

/**
 * POST /api/members/:orgId/invite
 * Allowed: OWNER(1), ADMIN(2)
 */
const inviteMemberToCompany = async (req, res) => {
  try {
    const orgId = req.params.orgId || req.user?.current_org_id;
    const inviterUserId = req.user.user_id;
    const { invitedUserId, roleId } = req.body;

    if (!invitedUserId || !roleId) {
      return res.status(400).json({ success: false, message: 'ต้องระบุ invitedUserId และ roleId' });
    }

    if (![3,4,5].includes(roleId)) {
      return res.status(400).json({ success: false, message: 'roleId ต้องเป็น 3,4 หรือ 5' });
    }

    // check inviter permission
    const inviterRole = await MemberModel.findMemberRole(orgId, inviterUserId);
    if (!inviterRole || inviterRole > 2) {
      return res.status(403).json({ success: false, message: 'สิทธิ์ไม่เพียงพอ (ต้องเป็น OWNER หรือ ADMIN)' });
    }

    const newMember = await MemberService.inviteMember(orgId, invitedUserId, roleId);
    return res.status(201).json({ success: true, message: 'เชิญสมาชิกสำเร็จ', member: newMember });
  } catch (err) {
    console.error('Invite member error:', err);
    if (err?.code === '23505' || (err.message && err.message.includes('duplicate key'))) {
      return res.status(409).json({ success: false, message: 'ผู้ใช้นี้เป็นสมาชิกอยู่แล้ว' });
    }
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเชิญสมาชิก' });
  }
};

/**
 * PATCH /api/members/:orgId/:memberId/role
 * Allowed: OWNER(1) or ADMIN(2)
 */
const changeMemberRole = async (req, res) => {
  try {
    const orgId = req.params.orgId || req.user?.current_org_id;
    const memberUserId = req.params.memberId;
    const { newRoleId } = req.body;
    const actorUserId = req.user.user_id;

    if (!memberUserId || !newRoleId) {
      return res.status(400).json({ success: false, message: 'memberId and newRoleId required' });
    }

    // check actor permission
    const actorRole = await MemberModel.findMemberRole(orgId, actorUserId);
    if (!actorRole || actorRole > 2) {
      return res.status(403).json({ success: false, message: 'สิทธิ์ไม่เพียงพอ' });
    }

    // prevent downgrading/removing owner via this endpoint if target is owner
    const targetRole = await MemberModel.findMemberRole(orgId, memberUserId);
    if (targetRole === 1) {
      return res.status(403).json({ success: false, message: 'ไม่สามารถเปลี่ยน role ของ OWNER โดยตรงได้ (ใช้ transfer-owner)' });
    }

    const updated = await MemberService.changeMemberRole(orgId, memberUserId, newRoleId);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'ไม่พบสมาชิก' });
    }

    return res.status(200).json({ success: true, message: 'เปลี่ยนสิทธิ์สำเร็จ', member: updated });
  } catch (err) {
    console.error('Change role error:', err);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเปลี่ยนสิทธิ์' });
  }
};

/**
 * DELETE /api/members/:orgId/:memberId
 * Allowed: OWNER(1) or ADMIN(2)
 * Cannot remove OWNER via this endpoint.
 */
const removeMember = async (req, res) => {
  try {
    const orgId = req.params.orgId || req.user?.current_org_id;
    const memberUserId = req.params.memberId;
    const actorUserId = req.user.user_id;

    if (!memberUserId) {
      return res.status(400).json({ success: false, message: 'memberId required' });
    }

    const actorRole = await MemberModel.findMemberRole(orgId, actorUserId);
    if (!actorRole || actorRole > 2) {
      return res.status(403).json({ success: false, message: 'สิทธิ์ไม่เพียงพอ' });
    }

    // Prevent removing owner
    const targetRole = await MemberModel.findMemberRole(orgId, memberUserId);
    if (targetRole === 1) {
      return res.status(403).json({ success: false, message: 'ไม่สามารถลบ OWNER ได้' });
    }

    const deleted = await MemberService.removeMemberFromOrg(orgId, memberUserId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'ไม่พบสมาชิก' });
    }

    return res.status(200).json({ success: true, message: 'ลบสมาชิกสำเร็จ' });
  } catch (err) {
    console.error('Remove member error:', err);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบสมาชิก' });
  }
};

/**
 * POST /api/members/:orgId/transfer-owner
 * Body: { newOwnerUserId }
 * Allowed: only current OWNER (1)
 */
const transferOwner = async (req, res) => {
  try {
    const orgId = req.params.orgId || req.user?.current_org_id;
    const currentUserId = req.user.user_id;
    const { newOwnerUserId } = req.body;

    if (!newOwnerUserId) {
      return res.status(400).json({ success: false, message: 'newOwnerUserId required' });
    }

    // verify caller is OWNER in this org
    const callerRole = await MemberModel.findMemberRole(orgId, currentUserId);
    if (callerRole !== 1) {
      return res.status(403).json({ success: false, message: 'ต้องเป็น OWNER เท่านั้นในการโอนสิทธิ์' });
    }

    // ensure newOwnerUserId is a member or will be added by service
    const updatedOrg = await MemberService.transferOwner(orgId, currentUserId, newOwnerUserId);

    return res.status(200).json({
      success: true,
      message: 'โอนสิทธิ์เจ้าของสำเร็จ',
      organization: updatedOrg
    });
  } catch (err) {
    console.error('Transfer owner error:', err);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการโอนเจ้าของ' });
  }
};

export const MemberController = {
  listMembers,
  inviteMemberToCompany,
  changeMemberRole,
  removeMember,
  transferOwner
};
