// src/controllers/InvitationController.js
import InvitationService from "../services/InvitationService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const createInvitationController = (service = InvitationService) => {
  
  // POST /api/invitations
  const sendInvitation = asyncHandler(async (req, res) => {
    const { email, org_id, role_id } = req.body;
    const invited_by = req.user.user_id;

    const result = await service.sendInvitation(email, org_id, role_id, invited_by);
    res.json(result);
  });

  // GET /api/invitations/:token
  const getInvitationInfo = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const info = await service.getInvitationInfo(token);
    res.json(info);
  });

  // POST /api/invitations/accept
  const acceptInvitation = asyncHandler(async (req, res) => {
    const { token } = req.body;
    const userId = req.user.user_id;

    const result = await service.acceptInvitation(token, userId);
    res.json(result);
  });

  // POST /api/invitations/cancel
  const cancelInvitation = asyncHandler(async (req, res) => {
    const { token } = req.body;
    const userId = req.user.user_id;

    const result = await service.cancelInvitation(token, userId);
    res.json(result);
  });

  // POST /api/invitations/resend
  const resendInvitation = asyncHandler(async (req, res) => {
    const { email, org_id, role_id } = req.body;

    const result = await service.resendInvitation(email, org_id, role_id);
    res.json(result);
  });

  // GET /api/invitations/organization/:org_id
  const getOrganizationInvitations = asyncHandler(async (req, res) => {
    const { org_id } = req.params;
    const invitations = await service.getOrganizationInvitations(org_id);
    res.json({ success: true, invitations });
  });

  return {
    sendInvitation, getInvitationInfo, acceptInvitation, 
    cancelInvitation, resendInvitation, getOrganizationInvitations
  };
};

const defaultController = createInvitationController();

export const {
  sendInvitation, getInvitationInfo, acceptInvitation, 
  cancelInvitation, resendInvitation, getOrganizationInvitations
} = defaultController;