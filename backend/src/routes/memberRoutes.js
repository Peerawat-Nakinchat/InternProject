// src/routes/member.routes.js
import express from 'express';
import { MemberController } from '../controllers/MemberController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireOrganization } from '../middleware/companyMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// list members
router.get('/:orgId', requireOrganization, MemberController.listMembers);

// invite member
router.post('/:orgId/invite', requireOrganization, MemberController.inviteMemberToCompany);

// change role
// ต้องเป็น :memberId ให้ตรงกับ controller
router.patch('/:orgId/:memberId/role', requireOrganization, MemberController.changeMemberRole);

// delete member
router.delete('/:orgId/:memberId', requireOrganization, MemberController.removeMember);

// transfer owner
router.post('/:orgId/transfer-owner', requireOrganization, MemberController.transferOwner);

export default router;
