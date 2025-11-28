// src/controllers/InvitationController.js
import InvitationService from "../services/InvitationService.js";

/**
 * ส่งคำเชิญ
 */
export const sendInvitation = async (req, res) => {
  try {
    const { email, org_id, role_id } = req.body;

    const result = await InvitationService.sendInvitation(
      email,
      org_id,
      role_id
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
export const getInvitationInfo = async (req, res) => {
  try {
    const { token } = req.params;

    const info = await InvitationService.getInvitationInfo(token);

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
export const acceptInvitation = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.user_id;

    const result = await InvitationService.acceptInvitation(token, userId);

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
 * Cancel invitation (future implementation)
 */
export const cancelInvitation = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.user_id;

    const result = await InvitationService.cancelInvitation(token, userId);

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
export const resendInvitation = async (req, res) => {
  try {
    const { email, org_id, role_id } = req.body;

    const result = await InvitationService.resendInvitation(
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