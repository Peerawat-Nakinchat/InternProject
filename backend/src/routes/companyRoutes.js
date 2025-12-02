// src/routes/companyRoutes.js
import express from "express";
import {
  createCompany,
  getUserCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
} from "../controllers/CompanyController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireOrganization, requireOrgRole } from "../middleware/companyMiddleware.js";
import { auditLog, auditChange } from "../middleware/auditLogMiddleware.js";
import { AUDIT_ACTIONS } from "../constants/AuditActions.js";
import OrganizationModel from "../models/CompanyModel.js";

export const createCompanyRoutes = (deps = {}) => {
  const router = express.Router();

  const controller = deps.controller || {
    createCompany, getUserCompanies, getCompanyById, updateCompany, deleteCompany
  };
  const authMw = deps.authMiddleware || { protect };
  const companyMw = deps.companyMiddleware || { requireOrganization, requireOrgRole };
  const auditMw = deps.auditMiddleware || { auditLog, auditChange };
  const OrgModel = deps.OrganizationModel || OrganizationModel;

  router.use(authMw.protect);

  /**
 * @swagger
 * /company:
 *   post:
 *     summary: Create a new company
 *     description: Creates a new company and automatically assigns the creator as OWNER
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
 *               - org_name
 *               - org_code
 *             properties:
 *               org_name:
 *                 type: string
 *                 description: Company name
 *                 example: "บริษัท ABC จำกัด"
 *               org_code:
 *                 type: string
 *                 description: Unique company code (uppercase)
 *                 example: "ABC123"
 *               org_address_1:
 *                 type: string
 *               org_address_2:
 *                 type: string
 *               org_address_3:
 *                 type: string
 *               org_integrate:
 *                 type: string
 *                 enum: [Y, N]
 *                 default: N
 *               org_integrate_url:
 *                 type: string
 *                 format: uri
 *               org_integrate_provider_id:
 *                 type: string
 *               org_integrate_passcode:
 *                 type: string
 *     responses:
 *       201:
 *         description: Company created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation error or missing required fields
 *       409:
 *         description: Company code already exists
 *       401:
 *         description: Unauthorized
 */
  router.post(
    "/",
    auditMw.auditLog(AUDIT_ACTIONS.COMPANY.CREATE, "COMPANY", { severity: "HIGH", category: "COMPANY" }),
    controller.createCompany
  );

  /**
 * @swagger
 * /company:
 *   get:
 *     summary: Get list of user's companies
 *     description: Returns all companies where the user is a member (as owner, admin, or member)
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of companies retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       org_id:
 *                         type: string
 *                       org_name:
 *                         type: string
 *                       org_code:
 *                         type: string
 *                       role_id:
 *                         type: integer
 *                       role_name:
 *                         type: string
 *                       member_count:
 *                         type: integer
 *       401:
 *         description: Unauthorized
 */
  router.get(
    "/",
    auditMw.auditLog(AUDIT_ACTIONS.COMPANY.VIEW_MY_COMPANIES, "COMPANY", { severity: "LOW", category: "COMPANY" }),
    controller.getUserCompanies
  );

  
/**
 * @swagger
 * /company/{orgId}:
 *   get:
 *     summary: Get company details by ID
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization UUID
 *       - in: header
 *         name: x-org-id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization context (must match orgId in path)
 *     responses:
 *       200:
 *         description: Company details retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a member of this organization
 *       404:
 *         description: Company not found
 */
  router.get(
    "/:orgId",
    companyMw.requireOrganization,
    auditMw.auditLog(AUDIT_ACTIONS.COMPANY.VIEW_DETAIL, "COMPANY", { severity: "LOW", category: "COMPANY" }),
    controller.getCompanyById
  );

  /**
 * @swagger
 * /company/{orgId}:
 *   put:
 *     summary: Update company information (OWNER only)
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: header
 *         name: x-org-id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               org_name:
 *                 type: string
 *               org_code:
 *                 type: string
 *               org_address_1:
 *                 type: string
 *               org_address_2:
 *                 type: string
 *               org_address_3:
 *                 type: string
 *               org_integrate:
 *                 type: string
 *                 enum: [Y, N]
 *               org_integrate_url:
 *                 type: string
 *               org_integrate_provider_id:
 *                 type: string
 *               org_integrate_passcode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Company updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only OWNER can update company
 *       404:
 *         description: Company not found
 *       409:
 *         description: Org code already exists
 */
  router.put(
    "/:orgId",
    companyMw.requireOrganization,
    companyMw.requireOrgRole([1]),
    auditMw.auditChange("COMPANY", (id) => OrgModel.findById(id)),
    auditMw.auditLog(AUDIT_ACTIONS.COMPANY.UPDATE, "COMPANY", { severity: "MEDIUM", category: "COMPANY" }),
    controller.updateCompany
  );

  /**
 * @swagger
 * /company/{orgId}:
 *   delete:
 *     summary: Delete company (OWNER only)
 *     description: Permanently deletes the company and all associated memberships
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: header
 *         name: x-org-id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Company deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only OWNER can delete company
 *       404:
 *         description: Company not found
 */
  router.delete(
    "/:orgId",
    companyMw.requireOrganization,
    companyMw.requireOrgRole([1]),
    auditMw.auditChange("COMPANY", (id) => OrgModel.findById(id)),
    auditMw.auditLog(AUDIT_ACTIONS.COMPANY.DELETE, "COMPANY", { severity: "CRITICAL", category: "COMPANY" }),
    controller.deleteCompany
  );

  return router;
};

export default createCompanyRoutes();