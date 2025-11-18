// src/routes/member.routes.js
import express from 'express';
import { MemberController } from '../controllers/MemberController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireOrganization } from '../middleware/companyMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// List members (OWNER/ADMIN/MANAGER)
router.get('/:orgId', requireOrganization, MemberController.listMembers);

// Invite member (OWNER/ADMIN)
router.post('/:orgId/invite', requireOrganization, MemberController.inviteMemberToCompany);

// Change role (OWNER/ADMIN)
router.patch('/:orgId/:memberId/role', requireOrganization, MemberController.changeMemberRole);

// Remove member (OWNER/ADMIN) - cannot remove OWNER
router.delete('/:orgId/:memberId', requireOrganization, MemberController.removeMember);

// Transfer owner (OWNER only)
router.post('/:orgId/transfer-owner', requireOrganization, MemberController.transferOwner);

export default router;
