import express from 'express';
import { 
  createCompany, 
  getUserCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany
} from '../controllers/CompanyController.js';
import { protect } from '../middleware/authMiddleware.js';
import { checkRole } from '../middleware/roleMiddleware.js';
import { requireOrganization } from '../middleware/companyMiddleware.js';

const router = express.Router();

// ✅ ใช้ protect กับทุก route
router.use(protect);

// ✅ CREATE - ไม่ต้องใช้ requireOrganization (ยังไม่มีบริษัท)
router.post('/', createCompany);

// ✅ GET LIST - ไม่ต้องใช้ requireOrganization (ดึงทุกบริษัทของ user)
router.get('/', getUserCompanies);

// ✅ ใช้ requireOrganization กับ route ที่ต้องการ orgId
router.get("/:orgId", requireOrganization, getCompanyById);

// ✅ UPDATE (only OWNER)
router.put('/:orgId', requireOrganization, checkRole([1]), updateCompany);

// ✅ DELETE (only OWNER)
router.delete('/:orgId', requireOrganization, checkRole([1]), deleteCompany);

export default router;