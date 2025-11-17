import express from 'express';
const router = express.Router();
import { CompanyController } from '../controllers/CompanyController.js';
import { verifyAccess } from '../middleware/authMiddleware.js';
import { requireCompany } from '../middleware/companyMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';

router.post('/', verifyAccess, CompanyController.create);
router.post('/transfer', verifyAccess, requireCompany, allowRoles('owner'), CompanyController.transferOwnership);

export default router;
