import CompanyService from "../services/CompanyService.js";
import { ResponseHandler } from "../utils/responseHandler.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const createCompanyController = (service = CompanyService) => {
  
  const createCompany = asyncHandler(async (req, res) => {
    // Note: req.user.user_id ถูกรับประกันโดย Auth Middleware แล้ว
    const company = await service.createCompany(req.user.user_id, req.body);
    return ResponseHandler.created(res, company, "สร้างบริษัทสำเร็จ");
  });

  const getCompanyById = asyncHandler(async (req, res) => {
    const company = await service.getCompanyById(req.params.orgId);
    return ResponseHandler.success(res, company);
  });

  const getUserCompanies = asyncHandler(async (req, res) => {
    const companies = await service.getUserCompanies(req.user.user_id);
    return ResponseHandler.success(res, companies);
  });

  const updateCompany = asyncHandler(async (req, res) => {
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
} = CompanyController

export default CompanyController