// src/services/ModuleService.js
import ModuleModel from "../models/ModuleModel.js";

/**
 * Get all modules
 */
const getAllModules = async (options = {}) => {
  return await ModuleModel.findAll(options);
};

/**
 * Get active modules only
 */
const getActiveModules = async () => {
  return await ModuleModel.findActive();
};

/**
 * Get module by ID
 */
const getModuleById = async (moduleId) => {
  const module = await ModuleModel.findById(moduleId);
  if (!module) {
    throw new Error("ไม่พบ Module ที่ระบุ");
  }
  return module;
};

/**
 * Get module by code
 */
const getModuleByCode = async (moduleCode) => {
  const module = await ModuleModel.findByCode(moduleCode);
  if (!module) {
    throw new Error("ไม่พบ Module ที่ระบุ");
  }
  return module;
};

/**
 * Create new module
 */
const createModule = async (moduleData) => {
  // Check if code already exists
  const exists = await ModuleModel.codeExists(moduleData.module_code);
  if (exists) {
    throw new Error("รหัส Module นี้มีอยู่ในระบบแล้ว");
  }

  return await ModuleModel.create(moduleData);
};

/**
 * Update module
 */
const updateModule = async (moduleId, updates) => {
  // Check if module exists
  const existing = await ModuleModel.findById(moduleId);
  if (!existing) {
    throw new Error("ไม่พบ Module ที่ระบุ");
  }

  // Check if new code already exists (if code is being changed)
  if (updates.module_code && updates.module_code !== existing.module_code) {
    const codeExists = await ModuleModel.codeExists(
      updates.module_code,
      moduleId,
    );
    if (codeExists) {
      throw new Error("รหัส Module นี้มีอยู่ในระบบแล้ว");
    }
  }

  return await ModuleModel.update(moduleId, updates);
};

/**
 * Delete module
 */
const deleteModule = async (moduleId) => {
  const existing = await ModuleModel.findById(moduleId);
  if (!existing) {
    throw new Error("ไม่พบ Module ที่ระบุ");
  }

  return await ModuleModel.deleteById(moduleId);
};

/**
 * Search modules
 */
const searchModules = async (searchTerm, options = {}) => {
  return await ModuleModel.search(searchTerm, options);
};

export const ModuleService = {
  getAllModules,
  getActiveModules,
  getModuleById,
  getModuleByCode,
  createModule,
  updateModule,
  deleteModule,
  searchModules,
};

export default ModuleService;
