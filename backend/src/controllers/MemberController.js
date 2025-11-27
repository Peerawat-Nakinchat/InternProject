// src/controllers/MemberController.js
import { MemberModel } from '../models/MemberModel.js';
import { sequelize } from '../models/dbModels.js';

/**
 * GET /api/members/:orgId
 */
const listMembers = async (req, res) => {
  try {
    const orgId = req.params.orgId || req.user?.current_org_id;
    if (!orgId) return res.status(400).json({ success: false, message: 'orgId required' });

    // ตรวจสอบสิทธิ์ role (OWNER, ADMIN, MANAGER)
    const roleId = req.user?.org_role_id;
    if (!roleId || roleId > 3) {
      return res.status(403).json({ success: false, message: 'สิทธิ์ไม่เพียงพอในการดูสมาชิก' });
    }

    const members = await MemberModel.getMembers(orgId);
    res.json({ success: true, data: members });
  } catch (error) {
    console.error('List members error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงสมาชิก' });
  }
};

/**
 * POST /api/members/:orgId/invite
 */
const inviteMemberToCompany = async (req, res) => {
  try {
    const orgId = req.params.orgId || req.user?.current_org_id;
    const { invitedUserId, roleId } = req.body;
    if (!invitedUserId || !roleId) return res.status(400).json({ success: false, message: 'invitedUserId and roleId required' });

    const inviterRole = await MemberModel.findMemberRole(orgId, req.user.user_id);
    if (!inviterRole || inviterRole > 2) return res.status(403).json({ success: false, message: 'สิทธิ์ไม่เพียงพอ (ต้องเป็น OWNER หรือ ADMIN)' });

    const isMember = await MemberModel.checkMembership(orgId, invitedUserId);
    if (isMember) return res.status(409).json({ success: false, message: 'ผู้ใช้นี้เป็นสมาชิกอยู่แล้ว' });

    const newMember = await MemberModel.addMemberToOrganization(orgId, invitedUserId, roleId);
    res.status(201).json({ success: true, message: 'เชิญสมาชิกสำเร็จ', member: newMember });
  } catch (error) {
    console.error('Invite member error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเชิญสมาชิก' });
  }
};

/**
 * PATCH /api/members/:orgId/:memberId/role
 */
const changeMemberRole = async (req, res) => {
  try {
    const orgId = req.params.orgId || req.user?.current_org_id;
    const memberId = req.params.memberId;
    const { newRoleId } = req.body;

    const actorRole = await MemberModel.findMemberRole(orgId, req.user.user_id);
    if (!actorRole || actorRole > 2) return res.status(403).json({ success: false, message: 'สิทธิ์ไม่เพียงพอ' });

    const targetRole = await MemberModel.findMemberRole(orgId, memberId);
    if (!targetRole) return res.status(404).json({ success: false, message: 'ไม่พบสมาชิก' });
    if (targetRole === 1) return res.status(403).json({ success: false, message: 'ไม่สามารถเปลี่ยน role ของ OWNER ได้' });

    const updatedMember = await MemberModel.updateMemberRole(orgId, memberId, newRoleId);
    res.json({ success: true, message: 'เปลี่ยนสิทธิ์สำเร็จ', member: updatedMember });
  } catch (error) {
    console.error('Change role error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเปลี่ยนสิทธิ์' });
  }
};

/**
 * DELETE /api/members/:orgId/:memberId
 */
const removeMember = async (req, res) => {
  try {
    const orgId = req.params.orgId || req.user?.current_org_id;
    const memberId = req.params.memberId;

    const actorRole = await MemberModel.findMemberRole(orgId, req.user.user_id);
    if (!actorRole || actorRole > 2) return res.status(403).json({ success: false, message: 'สิทธิ์ไม่เพียงพอ' });

    const targetRole = await MemberModel.findMemberRole(orgId, memberId);
    if (targetRole === 1) return res.status(403).json({ success: false, message: 'ไม่สามารถลบ OWNER ได้' });

    const deleted = await MemberModel.removeMember(orgId, memberId);
    if (!deleted) return res.status(404).json({ success: false, message: 'ไม่พบสมาชิก' });

    res.json({ success: true, message: 'ลบสมาชิกสำเร็จ' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบสมาชิก' });
  }
};

/**
 * POST /api/members/:orgId/transfer-owner
 */
const transferOwner = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const orgId = req.params.orgId || req.user?.current_org_id;
    const { newOwnerUserId } = req.body;

    const currentOwnerRole = await MemberModel.findMemberRole(orgId, req.user.user_id);
    if (currentOwnerRole !== 1) return res.status(403).json({ success: false, message: 'ต้องเป็น OWNER เท่านั้นในการโอนสิทธิ์' });

    // Update organization owner
    await MemberModel.updateOrganizationOwner(orgId, newOwnerUserId, t);

    // Update roles
    await MemberModel.updateMemberRole(orgId, newOwnerUserId, 1, t); // new owner
    await MemberModel.updateMemberRole(orgId, req.user.user_id, 2, t); // downgrade current owner

    await t.commit();
    res.json({ success: true, message: 'โอนสิทธิ์เจ้าของสำเร็จ' });
  } catch (error) {
    await t.rollback();
    console.error('Transfer owner error:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการโอนเจ้าของ' });
  }
};

export const MemberController = {
  listMembers,
  inviteMemberToCompany,
  changeMemberRole,
  removeMember,
  transferOwner
};
