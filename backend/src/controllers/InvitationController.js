import InvitationService from "../services/InvitationService.js";
import { ResponseHandler } from "../utils/responseHandler.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import defaultController from "./AuthController.js";

export const createInvitationController = (service = InvitationService) => {
  
  const sendInvitation = asyncHandler(async (req, res) => {
    // Assumes validation middleware checks for email, org_id, role_id
    const result = await service.sendInvitation(
      req.body.email, 
      req.body.org_id, 
      req.body.role_id, 
      req.user.user_id
    );
    return ResponseHandler.created(res, result);
  });

  const getInvitationInfo = asyncHandler(async (req, res) => {
    const info = await service.getInvitationInfo(req.params.token);
    return ResponseHandler.success(res, info);
  });

  const acceptInvitation = asyncHandler(async (req, res) => {
    const result = await service.acceptInvitation(req.body.token, req.user.user_id);
    return ResponseHandler.success(res, result);
  });

  const cancelInvitation = asyncHandler(async (req, res) => {
    const result = await service.cancelInvitation(req.body.token, req.user.user_id);
    return ResponseHandler.success(res, result);
  });

  const resendInvitation = asyncHandler(async (req, res) => {
    const result = await service.resendInvitation(
      req.body.email, 
      req.body.org_id, 
      req.body.role_id
    );
    return ResponseHandler.success(res, result);
  });

  const getOrganizationInvitations = asyncHandler(async (req, res) => {
    const invitations = await service.getOrganizationInvitations(req.params.org_id);
    return ResponseHandler.success(res, { invitations });
  });

  return {
    sendInvitation, getInvitationInfo, acceptInvitation,
    cancelInvitation, resendInvitation, getOrganizationInvitations
  };
};

const InvitationController = createInvitationController();

export const {
  sendInvitation, getInvitationInfo, acceptInvitation,
    cancelInvitation, resendInvitation, getOrganizationInvitations
} = InvitationController

export default InvitationController

