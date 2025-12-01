// src/controllers/InvitationController.js
import InvitationService from "../services/InvitationService.js";

/**
 * Factory function to create controller functions with injected service
 * This pattern allows for dependency injection and easier testing
 * @param {Object} service - The service instance to use (defaults to InvitationService)
 */
export const createInvitationController = (service = InvitationService) => {
  /**
   * ส่งคำเชิญ
   */
  const sendInvitation = async (req, res) => {
    try {
      const { email, org_id, role_id } = req.body;
      const invited_by = req.user.user_id;

      const result = await service.sendInvitation(
        email,
        org_id,
        role_id,
        invited_by
      );

      res.json(result);
    } catch (error) {
      console.error("Send invitation error:", error);

      const statusCode = error.message.includes("กรุณากรอก")
        ? 400
        : error.message.includes("อยู่แล้ว")
        ? 400
        : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  };

  /**
   * ดึงข้อมูลคำเชิญ
   */
  const getInvitationInfo = async (req, res) => {
    try {
      const { token } = req.params;

      const info = await service.getInvitationInfo(token);

      res.json(info);
    } catch (error) {
      console.error("Get invitation error:", error);

      const statusCode = error.message.includes("Invalid") ||
        error.message.includes("expired")
        ? 400
        : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  };

  /**
   * รับคำเชิญ
   */
  const acceptInvitation = async (req, res) => {
    try {
      const { token } = req.body;
      const userId = req.user.user_id;

      const result = await service.acceptInvitation(token, userId);

      res.json(result);
    } catch (error) {
      console.error("Accept invitation error:", error);

      const statusCode = error.message.includes("Invalid") ||
        error.message.includes("expired")
        ? 400
        : error.message.includes("อยู่แล้ว")
        ? 400
        : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  };

  /**
   * Cancel invitation
   */
  const cancelInvitation = async (req, res) => {
    try {
      const { token } = req.body;
      const userId = req.user.user_id;

      const result = await service.cancelInvitation(token, userId);

      res.json(result);
    } catch (error) {
      console.error("Cancel invitation error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  };

  /**
   * Resend invitation
   */
  const resendInvitation = async (req, res) => {
    try {
      const { email, org_id, role_id } = req.body;

      const result = await service.resendInvitation(
        email,
        org_id,
        role_id
      );

      res.json(result);
    } catch (error) {
      console.error("Resend invitation error:", error);

      const statusCode = error.message.includes("กรุณากรอก")
        ? 400
        : error.message.includes("อยู่แล้ว")
        ? 400
        : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  };

  const getOrganizationInvitations = async (req, res) => {
    try {
      const { org_id } = req.params;
      
      const invitations = await service.getOrganizationInvitations(org_id);
      
      res.json({
        success: true,
        invitations
      });
    } catch (error) {
      console.error("Get invitations error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  };

  return {
    sendInvitation,
    getInvitationInfo,
    acceptInvitation,
    cancelInvitation,
    resendInvitation,
    getOrganizationInvitations
  };
};

// Default instance using the real InvitationService (for production use)
const defaultController = createInvitationController();

// Export individual functions for backward compatibility
export const {
  sendInvitation,
  getInvitationInfo,
  acceptInvitation,
  cancelInvitation,
  resendInvitation,
  getOrganizationInvitations
} = defaultController;