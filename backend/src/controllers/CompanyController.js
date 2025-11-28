// src/controllers/CompanyController.js
import CompanyService from "../services/CompanyService.js";

// POST /api/company
const createCompany = async (req, res) => {
  try {
    const ownerUserId = req.user?.user_id;

    if (!ownerUserId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const company = await CompanyService.createCompany(ownerUserId, req.body);

    return res.status(201).json({
      success: true,
      message: "สร้างบริษัทสำเร็จ",
      data: company,
    });
  } catch (error) {
    console.error("Create company error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการสร้างบริษัท",
    });
  }
};

// GET /api/company/:orgId
const getCompanyById = async (req, res) => {
  try {
    const { orgId } = req.params;
    const company = await CompanyService.getCompanyById(orgId);

    return res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    console.error("Get company error:", error);

    const statusCode = error.message.includes("ไม่พบ") ? 404 : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

// GET /api/company/list
const getUserCompanies = async (req, res) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const companies = await CompanyService.getUserCompanies(userId);

    return res.status(200).json({
      success: true,
      data: companies,
    });
  } catch (error) {
    console.error("List companies error:", error);

    return res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงข้อมูลบริษัท",
    });
  }
};

// PUT /api/company/:orgId
const updateCompany = async (req, res) => {
  try {
    const { orgId } = req.params;
    const userId = req.user?.user_id;
    const userOrgRoleId = req.user?.org_role_id;

    const updatedCompany = await CompanyService.updateCompany(
      orgId,
      userId,
      userOrgRoleId,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "อัปเดตข้อมูลสำเร็จ",
      data: updatedCompany,
    });
  } catch (error) {
    console.error("Update company error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    const statusCode = error.message.includes("ไม่พบ")
      ? 404
      : error.message.includes("OWNER")
      ? 403
      : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE /api/company/:orgId
const deleteCompany = async (req, res) => {
  try {
    const { orgId } = req.params;
    const userId = req.user?.user_id;
    const userOrgRoleId = req.user?.org_role_id;

    await CompanyService.deleteCompany(orgId, userId, userOrgRoleId);

    return res.status(200).json({
      success: true,
      message: "ลบบริษัทสำเร็จ",
    });
  } catch (error) {
    console.error("Delete company error:", error);

    const statusCode = error.message.includes("ไม่พบ")
      ? 404
      : error.message.includes("OWNER")
      ? 403
      : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

export { createCompany, getCompanyById, getUserCompanies, updateCompany, deleteCompany };