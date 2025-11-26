import express from "express";
import {
  createCompany,
  getUserCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
} from "../controllers/CompanyController.js";
import { protect } from "../middleware/authMiddleware.js";
import { checkRole } from "../middleware/roleMiddleware.js";
import { requireOrganization } from "../middleware/companyMiddleware.js";

const router = express.Router();

// ✅ ใช้ protect กับทุก route
router.use(protect);

// ✅ CREATE - ไม่ต้องใช้ requireOrganization (ยังไม่มีบริษัท)
/**
 * @swagger
 * /company:
 *   post:
 *     summary: Create a new company
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Company created successfully
 */
router.post("/", createCompany);

// ✅ GET LIST - ไม่ต้องใช้ requireOrganization (ดึงทุกบริษัทของ user)
/**
 * @swagger
 * /company:
 *   get:
 *     summary: Get list of user's companies
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of companies
 */
router.get("/", getUserCompanies);

// ✅ ใช้ requireOrganization กับ route ที่ต้องการ orgId
/**
 * @swagger
 * /company/{orgId}:
 *   get:
 *     summary: Get company by ID
 *     tags: [Company]
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
 *         description: Company details
 */
router.get("/:orgId", requireOrganization, getCompanyById);

// ✅ UPDATE (only OWNER)
/**
 * @swagger
 * /company/{orgId}:
 *   put:
 *     summary: Update company (Owner only)
 *     tags: [Company]
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
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Company updated successfully
 */
router.put("/:orgId", requireOrganization, checkRole([1]), updateCompany);

// ✅ DELETE (only OWNER)
/**
 * @swagger
 * /company/{orgId}:
 *   delete:
 *     summary: Delete company (Owner only)
 *     tags: [Company]
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
 *         description: Company deleted successfully
 */
router.delete("/:orgId", requireOrganization, checkRole([1]), deleteCompany);

export default router;
