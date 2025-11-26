// src/routes/member.routes.js
import express from "express";
import { MemberController } from "../controllers/MemberController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireOrganization } from "../middleware/companyMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// list members
/**
 * @swagger
 * /users/{orgId}:
 *   get:
 *     summary: List all members of a company
 *     tags: [Member]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-org-id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of members
 */
router.get("/:orgId", requireOrganization, MemberController.listMembers);

// invite member
/**
 * @swagger
 * /users/{orgId}/invite:
 *   post:
 *     summary: Invite a member to company
 *     tags: [Member]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-org-id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - roleId
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               roleId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Invitation sent
 */
router.post(
  "/:orgId/invite",
  requireOrganization,
  MemberController.inviteMemberToCompany
);

// change role
// ต้องเป็น :memberId ให้ตรงกับ controller
/**
 * @swagger
 * /users/{orgId}/{memberId}/role:
 *   patch:
 *     summary: Change member role
 *     tags: [Member]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-org-id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roleId
 *             properties:
 *               roleId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Role changed successfully
 */
router.patch(
  "/:orgId/:memberId/role",
  requireOrganization,
  MemberController.changeMemberRole
);

// delete member
/**
 * @swagger
 * /users/{orgId}/{memberId}:
 *   delete:
 *     summary: Remove member from company
 *     tags: [Member]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-org-id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed successfully
 */
router.delete(
  "/:orgId/:memberId",
  requireOrganization,
  MemberController.removeMember
);

// transfer owner
/**
 * @swagger
 * /users/{orgId}/transfer-owner:
 *   post:
 *     summary: Transfer company ownership
 *     tags: [Member]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-org-id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newOwnerId
 *             properties:
 *               newOwnerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ownership transferred successfully
 */
router.post(
  "/:orgId/transfer-owner",
  requireOrganization,
  MemberController.transferOwner
);

export default router;
