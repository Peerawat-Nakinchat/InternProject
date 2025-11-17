import express from 'express';
const router = express.Router();
import { MemberController } from '../controllers/MemberController.js';
import { verifyAccess } from '../middleware/authMiddleware.js';
import { requireCompany } from '../middleware/companyMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';

router.post('/invite', verifyAccess, requireCompany, allowRoles('owner','admin'), MemberController.invite);
router.get('/', verifyAccess, requireCompany, MemberController.list);
router.put('/role', verifyAccess, requireCompany, allowRoles('owner','admin'), MemberController.updateRole);
router.delete('/:user_id', verifyAccess, requireCompany, allowRoles('owner','admin'), MemberController.remove);

export default router;
