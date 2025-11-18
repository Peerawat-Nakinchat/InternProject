// src/routes/companyRoutes.js
import express from 'express';
import { createCompany, getUserCompanies } from '../controllers/CompanyController.js';
import { protect } from '../middleware/authMiddleware.js';
import { checkRole } from '../middleware/roleMiddleware.js'; // if used

const router = express.Router();

// protect all routes in this router
router.use(protect);

// Create company (any authenticated user can create)
router.post('/', createCompany);

// Get companies related to user
router.get('/', getUserCompanies);

// Example: delete company (only OWNER)
 // router.delete('/:orgId', checkRole([1]), deleteCompany);

export default router;
