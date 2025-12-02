// src/routes/memberRoutes.js
import express from "express";
import { MemberController } from "../controllers/MemberController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireOrganization, requireOrgRole } from "../middleware/companyMiddleware.js";
import { auditLog, auditChange } from "../middleware/auditLogMiddleware.js";
import { AUDIT_ACTIONS } from "../constants/AuditActions.js";
import MemberModel from "../models/MemberModel.js";
import OrganizationModel from "../models/CompanyModel.js";

export const createMemberRoutes = (deps = {}) => {
  const router = express.Router();

  const controller = deps.controller || MemberController;
  const authMw = deps.authMiddleware || { protect };
  const companyMw = deps.companyMiddleware || { requireOrganization, requireOrgRole };
  const auditMw = deps.auditMiddleware || { auditLog, auditChange };
  const MemModel = deps.MemberModel || MemberModel;
  const OrgModel = deps.OrganizationModel || OrganizationModel;

  router.use(authMw.protect);
  router.use(companyMw.requireOrganization);

  /**
 * @swagger
 * /members/{orgId}:
 *   get:
 *     summary: List all members of an organization
 *     description: Returns list of all members with their roles. Accessible by OWNER, ADMIN, and MEMBER (role_id 1, 2, 3)
 *     tags: [Member]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization UUID
 *       - in: header
 *         name: x-org-id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Must match orgId in path
 *     responses:
 *       200:
 *         description: List of members retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       membership_id:
 *                         type: string
 *                       user_id:
 *                         type: string
 *                       role_id:
 *                         type: integer
 *                       joined_date:
 *                         type: string
 *                         format: date-time
 *                       user:
 *                         type: object
 *                         properties:
 *                           user_id:
 *                             type: string
 *                           email:
 *                             type: string
 *                           name:
 *                             type: string
 *                           surname:
 *                             type: string
 *                           full_name:
 *                             type: string
 *                       role:
 *                         type: object
 *                         properties:
 *                           role_id:
 *                             type: integer
 *                           role_name:
 *                             type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
  router.get(
    "/:orgId",
    auditMw.auditLog(AUDIT_ACTIONS.MEMBER.VIEW_ALL, "MEMBER", { severity: "LOW", category: "MEMBERSHIP" }),
    controller.listMembers
  );

  /**
 * @swagger
 * /members/{orgId}/invite:
 *   post:
 *     summary: Invite a member to organization
 *     description: Only OWNER and ADMIN can invite new members
 *     tags: [Member]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: header
 *         name: x-org-id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invitedUserId
 *               - roleId
 *             properties:
 *               invitedUserId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID to invite
 *               roleId:
 *                 type: integer
 *                 description: Role to assign (1=OWNER, 2=ADMIN, 3=MEMBER, 4=VIEWER, 5=AUDITOR)
 *                 enum: [1, 2, 3, 4, 5]
 *     responses:
 *       201:
 *         description: Member invited successfully
 *       400:
 *         description: Missing required fields
 *       403:
 *         description: Insufficient permissions (must be OWNER or ADMIN)
 *       409:
 *         description: User is already a member
 */
  router.post(
    "/:orgId/invite",
    auditMw.auditLog(AUDIT_ACTIONS.MEMBER.INVITE, "MEMBER", { severity: "MEDIUM", category: "MEMBERSHIP" }),
    controller.inviteMemberToCompany
  );

  /**
 * @swagger
 * /members/{orgId}/{memberId}/role:
 *   patch:
 *     summary: Change member's role
 *     description: Only OWNER and ADMIN can change roles. Cannot change OWNER's role.
 *     tags: [Member]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID of the member whose role to change
 *       - in: header
 *         name: x-org-id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newRoleId
 *             properties:
 *               newRoleId:
 *                 type: integer
 *                 description: New role ID
 *                 enum: [2, 3, 4, 5]
 *     responses:
 *       200:
 *         description: Role changed successfully
 *       403:
 *         description: Insufficient permissions or trying to change OWNER role
 *       404:
 *         description: Member not found
 */
  router.patch(
    "/:orgId/:memberId/role",
    auditMw.auditChange("MEMBER", (id) => MemModel.findById(id)),
    auditMw.auditLog(AUDIT_ACTIONS.MEMBER.CHANGE_ROLE, "MEMBER", { severity: "HIGH", category: "MEMBERSHIP" }),
    controller.changeMemberRole
  );

  /**
 * @swagger
 * /members/{orgId}/{memberId}:
 *   delete:
 *     summary: Remove member from organization
 *     description: Only OWNER and ADMIN can remove members. Cannot remove OWNER.
 *     tags: [Member]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID of the member to remove
 *       - in: header
 *         name: x-org-id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Member removed successfully
 *       403:
 *         description: Insufficient permissions or trying to remove OWNER
 *       404:
 *         description: Member not found
 */
  router.delete(
    "/:orgId/:memberId",
    auditMw.auditChange("MEMBER", (id) => MemModel.findById(id)),
    auditMw.auditLog(AUDIT_ACTIONS.MEMBER.REMOVE, "MEMBER", { severity: "HIGH", category: "MEMBERSHIP" }),
    controller.removeMember
  );

  /**
 * @swagger
 * /members/{orgId}/transfer-owner:
 *   post:
 *     summary: Transfer organization ownership
 *     description: Only current OWNER can transfer ownership. Old owner becomes ADMIN.
 *     tags: [Member]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: header
 *         name: x-org-id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newOwnerUserId
 *             properties:
 *               newOwnerUserId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID of the new owner (must be existing member)
 *     responses:
 *       200:
 *         description: Ownership transferred successfully
 *       400:
 *         description: Missing required field
 *       403:
 *         description: Only current OWNER can transfer ownership
 *       404:
 *         description: New owner user not found or not a member
 */
  router.post(
    "/:orgId/transfer-owner",
    auditMw.auditChange("COMPANY", (id) => OrgModel.findById(id)),
    auditMw.auditLog(AUDIT_ACTIONS.MEMBER.TRANSFER_OWNERSHIP, "COMPANY", { severity: "CRITICAL", category: "SECURITY" }),
    controller.transferOwner
  );

  return router;
};

export default createMemberRoutes();