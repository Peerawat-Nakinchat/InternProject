// src/controllers/MemberController.js
import MemberService from "../services/MemberService.js";
import { asyncHandler, createError } from "../middleware/errorHandler.js";

export const createMemberController = (service = MemberService) => {
  
  // GET /api/members/:orgId?
  const listMembers = asyncHandler(async (req, res) => {
    const orgId = req.params.orgId || req.user?.current_org_id;

    if (!orgId) throw createError.badRequest("orgId required");

    const roleId = req.user?.org_role_id;
    const members = await service.getMembers(orgId, roleId);

    res.json({ success: true, data: members });
  });

  // POST /api/members/:orgId?/invite
  const inviteMemberToCompany = asyncHandler(async (req, res) => {
    const orgId = req.params.orgId || req.user?.current_org_id;
    const { invitedUserId, roleId } = req.body;

    const newMember = await service.inviteMember(
      orgId, req.user.user_id, req.user.org_role_id, invitedUserId, roleId
    );

    res.status(201).json({ success: true, message: "เชิญสมาชิกสำเร็จ", member: newMember });
  });

  // PUT /api/members/:orgId?/change-role/:memberId
  const changeMemberRole = asyncHandler(async (req, res) => {
    const orgId = req.params.orgId || req.user?.current_org_id;
    const memberId = req.params.memberId;
    const { newRoleId } = req.body;

    const updatedMember = await service.changeMemberRole(
      orgId, req.user.user_id, req.user.org_role_id, memberId, newRoleId
    );

    res.json({ success: true, message: "เปลี่ยนสิทธิ์สำเร็จ", member: updatedMember });
  });

  // DELETE /api/members/:orgId?/remove/:memberId
  const removeMember = asyncHandler(async (req, res) => {
    const orgId = req.params.orgId || req.user?.current_org_id;
    const memberId = req.params.memberId;

    await service.removeMember(orgId, req.user.user_id, req.user.org_role_id, memberId);

    res.json({ success: true, message: "ลบสมาชิกสำเร็จ" });
  });

  // POST /api/members/:orgId?/transfer-ownership
  const transferOwner = asyncHandler(async (req, res) => {
    const orgId = req.params.orgId || req.user?.current_org_id;
    const { newOwnerUserId } = req.body;

    await service.transferOwner(orgId, req.user.user_id, req.user.org_role_id, newOwnerUserId);

    res.json({ success: true, message: "โอนสิทธิ์เจ้าของสำเร็จ" });
  });

  return {
    listMembers, inviteMemberToCompany, changeMemberRole,
    removeMember, transferOwner
  };
};

const defaultController = createMemberController();

export const MemberController = {
  listMembers: defaultController.listMembers,
  inviteMemberToCompany: defaultController.inviteMemberToCompany,
  changeMemberRole: defaultController.changeMemberRole,
  removeMember: defaultController.removeMember,
  transferOwner: defaultController.transferOwner,
};

export default MemberController;