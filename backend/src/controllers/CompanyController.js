// src/controllers/CompanyController.js
import CompanyService from "../services/CompanyService.js";
import { asyncHandler, createError } from "../middleware/errorHandler.js";

export const createCompanyController = (service = CompanyService) => {
  // POST /api/company
  const createCompany = asyncHandler(async (req, res) => {
    const ownerUserId = req.user?.user_id;

    if (!ownerUserId) {
      throw createError.unauthorized("Unauthorized"); 
    }

    const company = await service.createCompany(ownerUserId, req.body);

    res.status(201).json({
      success: true,
      message: "สร้างบริษัทสำเร็จ",
      data: company,
    });
  });

  // GET /api/company/:orgId
  const getCompanyById = asyncHandler(async (req, res) => {
    const { orgId } = req.params;
    const company = await service.getCompanyById(orgId);
    res.status(200).json({
      success: true,
      data: company,
    });
  });

  // GET /api/company/list
  const getUserCompanies = asyncHandler(async (req, res) => {
    const userId = req.user?.user_id;

    if (!userId) {
       throw createError.unauthorized("Unauthorized");
    }

    const companies = await service.getUserCompanies(userId);

    res.status(200).json({
      success: true,
      data: companies,
    });
  });

  // PUT /api/company/:orgId
  const updateCompany = asyncHandler(async (req, res) => {
    const { orgId } = req.params;
    const userId = req.user?.user_id;
    const userOrgRoleId = req.user?.org_role_id;
    const updatedCompany = await service.updateCompany(
      orgId,
      userId,
      userOrgRoleId,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "อัปเดตข้อมูลสำเร็จ",
      data: updatedCompany,
    });
  });

  // DELETE /api/company/:orgId
  const deleteCompany = asyncHandler(async (req, res) => {
    const { orgId } = req.params;
    const userId = req.user?.user_id;
    const userOrgRoleId = req.user?.org_role_id;

    await service.deleteCompany(orgId, userId, userOrgRoleId);

    res.status(200).json({
      success: true,
      message: "ลบบริษัทสำเร็จ",
    });
  });

  return { createCompany, getCompanyById, getUserCompanies, updateCompany, deleteCompany };
};

// Default instance
const defaultController = createCompanyController();

export const { createCompany, getCompanyById, getUserCompanies, updateCompany, deleteCompany } = defaultController;