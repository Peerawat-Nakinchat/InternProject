// src/controllers/IsoMenuController.js
import IsoMenuModel from "../models/IsoMenuModel.js";
import logger from "../utils/logger.js";

/**
 * Get all menus for a module (hierarchical by type)
 * GET /api/iso-menus/:moduleCode
 */
const getMenusByModule = async (req, res) => {
  try {
    const { moduleCode } = req.params;

    if (!moduleCode) {
      return res.status(400).json({
        success: false,
        message: "Module code is required",
      });
    }

    const menus = await IsoMenuModel.findByModule(moduleCode);

    res.json({
      success: true,
      message: "Menus retrieved successfully",
      data: menus,
    });
  } catch (error) {
    logger.error("Error fetching menus by module:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch menus",
      error: error.message,
    });
  }
};

/**
 * Get hierarchical menus by module and type
 * GET /api/iso-menus/:moduleCode/:menuType
 * menuType: M=Master, T=Transaction, R=Report
 */
const getMenusByType = async (req, res) => {
  try {
    const { moduleCode, menuType } = req.params;

    if (!moduleCode || !menuType) {
      return res.status(400).json({
        success: false,
        message: "Module code and menu type are required",
      });
    }

    // Validate menu type
    const validTypes = ["M", "T", "R"];
    if (!validTypes.includes(menuType.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid menu type. Must be M, T, or R",
      });
    }

    const menus = await IsoMenuModel.getHierarchicalMenus(moduleCode, menuType);

    res.json({
      success: true,
      message: "Menus retrieved successfully",
      data: {
        module_code: moduleCode.toUpperCase(),
        menu_type: menuType.toUpperCase(),
        menus,
      },
    });
  } catch (error) {
    logger.error("Error fetching menus by type:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch menus",
      error: error.message,
    });
  }
};

/**
 * Get single menu by ID
 * GET /api/iso-menus/detail/:menuRefId
 */
const getMenuById = async (req, res) => {
  try {
    const { menuRefId } = req.params;

    const menu = await IsoMenuModel.findById(menuRefId);

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found",
      });
    }

    res.json({
      success: true,
      data: menu,
    });
  } catch (error) {
    logger.error("Error fetching menu by ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch menu",
      error: error.message,
    });
  }
};

/**
 * Create new menu
 * POST /api/iso-menus
 */
const createMenu = async (req, res) => {
  try {
    const {
      module_code,
      h_menu_id,
      menu_id,
      parent_menu_id,
      menu_label,
      web_route_path,
      web_icon_name,
      is_active,
    } = req.body;

    if (!module_code || !h_menu_id || !menu_id || !menu_label) {
      return res.status(400).json({
        success: false,
        message: "module_code, h_menu_id, menu_id, and menu_label are required",
      });
    }

    const menu = await IsoMenuModel.create({
      module_code,
      h_menu_id,
      menu_id,
      parent_menu_id,
      menu_label,
      web_route_path,
      web_icon_name,
      is_active,
    });

    res.status(201).json({
      success: true,
      message: "Menu created successfully",
      data: menu,
    });
  } catch (error) {
    logger.error("Error creating menu:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create menu",
      error: error.message,
    });
  }
};

/**
 * Update menu
 * PUT /api/iso-menus/:menuRefId
 */
const updateMenu = async (req, res) => {
  try {
    const { menuRefId } = req.params;

    const existingMenu = await IsoMenuModel.findById(menuRefId);
    if (!existingMenu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found",
      });
    }

    const updatedMenu = await IsoMenuModel.update(menuRefId, req.body);

    res.json({
      success: true,
      message: "Menu updated successfully",
      data: updatedMenu,
    });
  } catch (error) {
    logger.error("Error updating menu:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update menu",
      error: error.message,
    });
  }
};

/**
 * Delete menu
 * DELETE /api/iso-menus/:menuRefId
 */
const deleteMenu = async (req, res) => {
  try {
    const { menuRefId } = req.params;

    const deleted = await IsoMenuModel.deleteById(menuRefId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Menu not found",
      });
    }

    res.json({
      success: true,
      message: "Menu deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting menu:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete menu",
      error: error.message,
    });
  }
};

export default {
  getMenusByModule,
  getMenusByType,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu,
};
