import MemberService from "../services/MemberService.js";
import { ResponseHandler } from "../utils/responseHandler.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const createMemberController = (service = MemberService) => {
  
  // Helper extraction function to clean up controller methods
  const getContext = (req) => ({
    orgId: req.params.orgId || req.user.current_org_id,
    userId: req.user.user_id,
    roleId: req.user.org_role_id
  });

  const listMembers = asyncHandler(async (req, res) => {
    const { orgId, roleId } = getContext(req);
    const members = await service.getMembers(orgId, roleId);
    return ResponseHandler.success(res, members);
  });

  const inviteMemberToCompany = asyncHandler(async (req, res) => {
    const { orgId, userId, roleId } = getContext(req);
    const { invitedUserId, roleId: targetRoleId } = req.body;

    const newMember = await service.inviteMember(
      orgId, userId, roleId, invitedUserId, targetRoleId
    );

    return ResponseHandler.created(res, newMember, "เชิญสมาชิกสำเร็จ");
  });

  const changeMemberRole = asyncHandler(async (req, res) => {
    const { orgId, userId, roleId } = getContext(req);
    const updatedMember = await service.changeMemberRole(
      orgId, userId, roleId, 
      req.params.memberId, 
      req.body.newRoleId
    );
    
    return ResponseHandler.success(res, updatedMember, "เปลี่ยนสิทธิ์สำเร็จ");
  });

  const removeMember = asyncHandler(async (req, res) => {
    const { orgId, userId, roleId } = getContext(req);
    await service.removeMember(orgId, userId, roleId, req.params.memberId);
    
    return ResponseHandler.success(res, null, "ลบสมาชิกสำเร็จ");
  });

  const transferOwner = asyncHandler(async (req, res) => {
    const { orgId, userId, roleId } = getContext(req);
    await service.transferOwner(orgId, userId, roleId, req.body.newOwnerUserId);
    
    return ResponseHandler.success(res, null, "โอนสิทธิ์เจ้าของสำเร็จ");
  });

  return {
    listMembers, inviteMemberToCompany, changeMemberRole,
    removeMember, transferOwner
  };
};

const MemberController = createMemberController();

export const {
    listMembers, inviteMemberToCompany, changeMemberRole,
    removeMember, transferOwner
} = MemberController

export default MemberController