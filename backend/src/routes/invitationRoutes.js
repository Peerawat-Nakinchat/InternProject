// src/routes/invitationRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  sendInvitation, getInvitationInfo, acceptInvitation, cancelInvitation, resendInvitation,
} from "../controllers/InvitationController.js";
import { validateEmail } from "../middleware/validation.js";
import { auditLog } from "../middleware/auditLogMiddleware.js";
import { AUDIT_ACTIONS } from "../constants/AuditActions.js";
import { inviteLimiter, acceptLimiter } from "../middleware/security/rateLimiters.js";


export const createInvitationRoutes = (deps = {}) => {
  const router = express.Router();

  const controller = deps.controller || {
    sendInvitation, getInvitationInfo, acceptInvitation, cancelInvitation, resendInvitation
  };
  const authMw = deps.authMiddleware || { protect };
  const valMw = deps.validationMiddleware || { validateEmail };
  const auditMw = deps.auditMiddleware || { auditLog };

  /**
 * @swagger
 * /invitations/send:
 *   post:
 *     summary: Send an invitation to join organization
 *     description: Sends email invitation with token. Only authenticated users can send invitations.
 *     tags: [Invitation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - org_id
 *               - role_id
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to send invitation to
 *                 example: "user@example.com"
 *               org_id:
 *                 type: string
 *                 format: uuid
 *                 description: Organization ID
 *               role_id:
 *                 type: integer
 *                 description: Role to assign (1=OWNER, 2=ADMIN, 3=MEMBER, 4=VIEWER, 5=AUDITOR)
 *                 enum: [1, 2, 3, 4, 5]
 *     responses:
 *       200:
 *         description: Invitation sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error or user already member
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
  router.post(
    "/send",
    authMw.protect,
    inviteLimiter,
    valMw.validateEmail,
    auditMw.auditLog(AUDIT_ACTIONS.INVITATION.SEND, "INVITATION", { severity: "MEDIUM", category: "MEMBERSHIP" }),
    controller.sendInvitation
  );

  /**
 * @swagger
 * /invitations/resend:
 *   post:
 *     summary: Resend invitation email
 *     description: Generates and sends a new invitation token
 *     tags: [Invitation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - org_id
 *               - role_id
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               org_id:
 *                 type: string
 *                 format: uuid
 *               role_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Invitation resent successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
  router.post(
    "/resend",
    authMw.protect,
    inviteLimiter,
    valMw.validateEmail,
    auditMw.auditLog(AUDIT_ACTIONS.INVITATION.RESEND, "INVITATION", { severity: "LOW", category: "MEMBERSHIP" }),
    controller.resendInvitation
  );

  /**
 * @swagger
 * /invitations/{token}:
 *   get:
 *     summary: Get invitation information
 *     description: Public endpoint to verify and get details of an invitation token
 *     tags: [Invitation]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: JWT invitation token
 *     responses:
 *       200:
 *         description: Invitation details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 email:
 *                   type: string
 *                 org_id:
 *                   type: string
 *                 role_id:
 *                   type: integer
 *                 org_name:
 *                   type: string
 *                 isExistingUser:
 *                   type: boolean
 *                   description: Whether the invited email is already a registered user
 *                 isAlreadyMember:
 *                   type: boolean
 *                   description: Whether the user is already a member of this organization
 *       400:
 *         description: Invalid or expired token
 *       500:
 *         description: Internal server error
 */
  router.get("/:token", acceptLimiter, controller.getInvitationInfo);

  /**
 * @swagger
 * /invitations/accept:
 *   post:
 *     summary: Accept an invitation
 *     description: User must be authenticated to accept invitation. Adds user to organization.
 *     tags: [Invitation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: JWT invitation token
 *     responses:
 *       200:
 *         description: Invitation accepted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 org_id:
 *                   type: string
 *       400:
 *         description: Invalid token or user already member elsewhere
 *       401:
 *         description: Unauthorized - user must be logged in
 *       500:
 *         description: Internal server error
 */
  router.post(
    "/accept",
    authMw.protect,
    auditMw.auditLog(AUDIT_ACTIONS.INVITATION.ACCEPT, "INVITATION", { severity: "MEDIUM", category: "MEMBERSHIP" }),
    controller.acceptInvitation
  );

  /**
 * @swagger
 * /invitations/cancel:
 *   post:
 *     summary: Cancel/revoke an invitation (Future implementation)
 *     description: Currently, invitations expire after 7 days automatically
 *     tags: [Invitation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Note about automatic expiration
 *       401:
 *         description: Unauthorized
 */
  router.post(
    "/cancel",
    authMw.protect,
    auditMw.auditLog(AUDIT_ACTIONS.INVITATION.CANCEL, "INVITATION", { severity: "LOW", category: "MEMBERSHIP" }),
    controller.cancelInvitation
  );

  return router;
};

export default createInvitationRoutes();