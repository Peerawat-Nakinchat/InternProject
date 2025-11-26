import express from "express";
import { protect as authenticateToken } from "../middleware/authMiddleware.js";
import {
  sendInvitation,
  getInvitationInfo,
  acceptInvitation,
} from "../controllers/InvitationController.js";

const router = express.Router();

// Send invitation (Requires auth)
/**
 * @swagger
 * /invitations/send:
 *   post:
 *     summary: Send an invitation
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
 *               - roleId
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               roleId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Invitation sent successfully
 */
router.post("/send", authenticateToken, sendInvitation);

// Get invitation info (Public, but requires token)
/**
 * @swagger
 * /invitations/{token}:
 *   get:
 *     summary: Get invitation information
 *     tags: [Invitation]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation details
 */
router.get("/:token", getInvitationInfo);

// Accept invitation (Requires auth - user must be logged in to accept)
/**
 * @swagger
 * /invitations/accept:
 *   post:
 *     summary: Accept an invitation
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
 *         description: Invitation accepted successfully
 */
router.post("/accept", authenticateToken, acceptInvitation);

export default router;
