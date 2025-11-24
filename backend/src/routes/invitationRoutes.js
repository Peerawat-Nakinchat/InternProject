import express from "express";
import { protect as authenticateToken } from "../middleware/authMiddleware.js";
import {
  sendInvitation,
  getInvitationInfo,
  acceptInvitation,
} from "../controllers/InvitationController.js";

const router = express.Router();

// Send invitation (Requires auth)
router.post("/send", authenticateToken, sendInvitation);

// Get invitation info (Public, but requires token)
router.get("/:token", getInvitationInfo);

// Accept invitation (Requires auth - user must be logged in to accept)
router.post("/accept", authenticateToken, acceptInvitation);

export default router;
