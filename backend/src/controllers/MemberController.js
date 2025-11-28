// src/controllers/MemberController.js
import MemberService from "../services/MemberService.js";

/**
 * GET /api/members/:orgId
 */
const listMembers = async (req, res) => {
  try {
    const orgId = req.params.orgId || req.user?.current_org_id;

    if (!orgId) {
      return res.status(400).json({
        success: false,
        message: "orgId required",
      });
    }

    const roleId = req.user?.org_role_id;
    const members = await MemberService.getMembers(orgId, roleId);

    res.json({
      success: true,
      data: members,
    });
  } catch (error) {
    console.error("List members error:", error);

    const statusCode = error.message.includes("สิทธิ์") ? 403 : 500;

    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * POST /api/members/:orgId/invite
 */
const inviteMemberToCompany = async (req, res) => {
  try {
    const orgId = req.params.orgId || req.user?.current_org_id;
    const { invitedUserId, roleId } = req.body;

    const newMember = await MemberService.inviteMember(
      orgId,
      req.user.user_id,
      req.user.org_role_id,
      invitedUserId,
      roleId
    );

    res.status(201).json({
      success: true,
      message: "เชิญสมาชิกสำเร็จ",
      member: newMember,
    });
  } catch (error) {
    console.error("Invite member error:", error);

    const statusCode = error.message.includes("สิทธิ์")
      ? 403
      : error.message.includes("อยู่แล้ว")
      ? 409
      : error.message.includes("required")
      ? 400
      : 500;

    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
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

    const updatedMember = await MemberService.changeMemberRole(
      orgId,
      req.user.user_id,
      req.user.org_role_id,
      memberId,
      newRoleId
    );

    res.json({
      success: true,
      message: "เปลี่ยนสิทธิ์สำเร็จ",
      member: updatedMember,
    });
  } catch (error) {
    console.error("Change role error:", error);

    const statusCode = error.message.includes("สิทธิ์")
      ? 403
      : error.message.includes("ไม่พบ")
      ? 404
      : 500;

    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * DELETE /api/members/:orgId/:memberId
 */
const removeMember = async (req, res) => {
  try {
    const orgId = req.params.orgId || req.user?.current_org_id;
    const memberId = req.params.memberId;

    await MemberService.removeMember(
      orgId,
      req.user.user_id,
      req.user.org_role_id,
      memberId
    );

    res.json({
      success: true,
      message: "ลบสมาชิกสำเร็จ",
    });
  } catch (error) {
    console.error("Remove member error:", error);

    const statusCode = error.message.includes("สิทธิ์")
      ? 403
      : error.message.includes("ไม่พบ")
      ? 404
      : 500;

    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * POST /api/members/:orgId/transfer-owner
 */
const transferOwner = async (req, res) => {
  try {
    const orgId = req.params.orgId || req.user?.current_org_id;
    const { newOwnerUserId } = req.body;

    await MemberService.transferOwner(
      orgId,
      req.user.user_id,
      req.user.org_role_id,
      newOwnerUserId
    );

    res.json({
      success: true,
      message: "โอนสิทธิ์เจ้าของสำเร็จ",
    });
  } catch (error) {
    console.error("Transfer owner error:", error);

    const statusCode = error.message.includes("สิทธิ์") ||
      error.message.includes("OWNER")
      ? 403
      : 500;

    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

export const MemberController = {
  listMembers,
  inviteMemberToCompany,
  changeMemberRole,
  removeMember,
  transferOwner,
};