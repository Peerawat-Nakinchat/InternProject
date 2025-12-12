import CompanyService from "../services/CompanyService.js";
import { ResponseHandler } from "../utils/responseHandler.js";
import { asyncHandler, createError } from "../middleware/errorHandler.js"; // Import createError

export const createCompanyController = (service = CompanyService) => {
  
  const createCompany = asyncHandler(async (req, res) => {
    const ownerUserId = req.user?.user_id;

    if (!ownerUserId) {
      throw createError.unauthorized("Unauthorized: User ID is required to create a company");
    }

    const company = await service.createCompany(ownerUserId, req.body);
    return ResponseHandler.created(res, company, "สร้างบริษัทสำเร็จ");
  });

  const getCompanyById = asyncHandler(async (req, res) => {
    const company = await service.getCompanyById(req.params.orgId);
    return ResponseHandler.success(res, company);
  });

  const getUserCompanies = asyncHandler(async (req, res) => {
    const userId = req.user?.user_id;

    if (!userId) {
      throw createError.unauthorized("Unauthorized: User ID is required to fetch companies");
    }

    const companies = await service.getUserCompanies(userId);
    return ResponseHandler.success(res, companies);
  });

  const updateCompany = asyncHandler(async (req, res) => {
    // อาจจะเพิ่ม validation ที่นี่ด้วยก็ได้ แต่ Test ยังไม่ได้ force
    const updatedCompany = await service.updateCompany(
      req.params.orgId,
      req.user.user_id,
      req.user.org_role_id,
      req.body
    );
    return ResponseHandler.success(res, updatedCompany, "อัปเดตข้อมูลสำเร็จ");
  });

  const deleteCompany = asyncHandler(async (req, res) => {
    await service.deleteCompany(
      req.params.orgId, 
      req.user.user_id, 
      req.user.org_role_id
    );
    return ResponseHandler.success(res, null, "ลบบริษัทสำเร็จ");
  });

  return { createCompany, getCompanyById, getUserCompanies, updateCompany, deleteCompany };
};

const CompanyController = createCompanyController();

export const {
  createCompany, getCompanyById, getUserCompanies, updateCompany, deleteCompany
} = CompanyController;

export default CompanyController;