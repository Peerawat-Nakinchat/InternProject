// src/controllers/ModuleController.js
import ModuleService from "../services/ModuleService.js";
import { ResponseHandler } from "../utils/responseHandler.js";
import { asyncHandler } from "../middleware/errorHandler.js";

/**
 * GET /api/modules
 * Get all modules
 */
const getAllModules = asyncHandler(async (req, res) => {
  const { page, limit, sortBy, sortOrder, isActive } = req.query;

  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 50,
    sortBy: sortBy || "module_point",
    sortOrder: sortOrder || "ASC",
    isActive: isActive === "true" ? true : isActive === "false" ? false : null,
  };

  const result = await ModuleService.getAllModules(options);

  return ResponseHandler.success(res, result, "ดึงข้อมูล Modules สำเร็จ");
});

/**
 * GET /api/modules/active
 * Get active modules only
 */
const getActiveModules = asyncHandler(async (req, res) => {
  const modules = await ModuleService.getActiveModules();

  return ResponseHandler.success(
    res,
    modules,
    "ดึงข้อมูล Active Modules สำเร็จ",
  );
});

/**
 * GET /api/modules/:id
 * Get module by ID
 */
const getModuleById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const module = await ModuleService.getModuleById(id);

  return ResponseHandler.success(res, module, "ดึงข้อมูล Module สำเร็จ");
});

/**
 * GET /api/modules/code/:code
 * Get module by code
 */
const getModuleByCode = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const module = await ModuleService.getModuleByCode(code);

  return ResponseHandler.success(res, module, "ดึงข้อมูล Module สำเร็จ");
});

/**
 * POST /api/modules
 * Create new module
 */
const createModule = asyncHandler(async (req, res) => {
  const moduleData = req.body;

  if (!moduleData.module_code || !moduleData.module_name) {
    return ResponseHandler.error(
      res,
      "กรุณากรอก module_code และ module_name",
      400,
    );
  }

  const module = await ModuleService.createModule(moduleData);

  return ResponseHandler.success(res, module, "สร้าง Module สำเร็จ", 201);
});

/**
 * PUT /api/modules/:id
 * Update module
 */
const updateModule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const module = await ModuleService.updateModule(id, updates);

  return ResponseHandler.success(res, module, "อัพเดท Module สำเร็จ");
});

/**
 * DELETE /api/modules/:id
 * Delete module
 */
const deleteModule = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await ModuleService.deleteModule(id);

  return ResponseHandler.success(res, null, "ลบ Module สำเร็จ");
});

/**
 * GET /api/modules/search
 * Search modules
 */
const searchModules = asyncHandler(async (req, res) => {
  const { q, page, limit, sortBy, sortOrder } = req.query;

  if (!q) {
    return ResponseHandler.error(res, "กรุณาระบุคำค้นหา", 400);
  }

  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 50,
    sortBy: sortBy || "module_point",
    sortOrder: sortOrder || "ASC",
  };

  const result = await ModuleService.searchModules(q, options);

  return ResponseHandler.success(res, result, "ค้นหา Modules สำเร็จ");
});

export const ModuleController = {
  getAllModules,
  getActiveModules,
  getModuleById,
  getModuleByCode,
  createModule,
  updateModule,
  deleteModule,
  searchModules,
};

export default ModuleController;
