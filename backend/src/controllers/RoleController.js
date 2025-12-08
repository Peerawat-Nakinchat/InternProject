// src/controllers/RoleController.js
import RoleService from "../services/RoleService.js";

/**
 * GET /api/roles
 * หน้าที่: เรียก Service ขอ Role ทั้งหมด แล้วส่งกลับ
 */
export const getAllRoles = async (req, res, next) => {
  try {
    const roles = await RoleService.getAllRoles();
    res.status(200).json({
      success: true,
      data: roles
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/roles/:id
 * หน้าที่: แกะ ID จาก URL ส่งให้ Service แล้วส่งผลกลับ
 */
export const getRoleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const role = await RoleService.getRoleById(id);
    res.status(200).json({
      success: true,
      data: role
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/roles/:id/permissions
 * หน้าที่: ขอ Permission ของ Role นั้นๆ
 */
export const getRolePermissions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const permissions = RoleService.getPermissions(id);

    res.status(200).json({
      success: true,
      data: permissions
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getAllRoles,
  getRoleById,
  getRolePermissions
};