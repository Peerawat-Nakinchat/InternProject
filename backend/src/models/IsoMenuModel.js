// src/models/IsoMenuModel.js
import { DataTypes, Op } from "sequelize";
import sequelize from "../config/dbConnection.js";

// ==================== ISO MENU MODEL ====================
export const IsoMenu = sequelize.define(
  "sys_iso_menus",
  {
    menu_ref_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    module_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    h_menu_id: {
      type: DataTypes.STRING(5),
      allowNull: false,
      comment: "Menu type: M=Master, T=Transaction, R=Report",
    },
    menu_id: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    parent_menu_id: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: "NULL = parent menu, has value = child menu",
    },
    menu_label: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    web_route_path: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    web_icon_name: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    create_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "create_date",
    },
    update_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "update_date",
    },
  },
  {
    timestamps: true,
    tableName: "sys_iso_menus",
    createdAt: "create_date",
    updatedAt: "update_date",
  },
);

/**
 * Find menus by module code and menu type
 * @param {string} moduleCode - e.g. "ISO27001"
 * @param {string} hMenuId - M=Master, T=Transaction, R=Report
 */
const findByModuleAndType = async (moduleCode, hMenuId) => {
  return await IsoMenu.findAll({
    where: {
      module_code: moduleCode.toUpperCase(),
      h_menu_id: hMenuId.toUpperCase(),
      is_active: true,
    },
    order: [["menu_id", "ASC"]],
  });
};

/**
 * Find all menus for a module (all types)
 */
const findByModule = async (moduleCode) => {
  return await IsoMenu.findAll({
    where: {
      module_code: moduleCode.toUpperCase(),
      is_active: true,
    },
    order: [
      ["h_menu_id", "ASC"],
      ["menu_id", "ASC"],
    ],
  });
};

/**
 * Find parent menus only (where parent_menu_id is null)
 */
const findParentMenus = async (moduleCode, hMenuId) => {
  return await IsoMenu.findAll({
    where: {
      module_code: moduleCode.toUpperCase(),
      h_menu_id: hMenuId.toUpperCase(),
      parent_menu_id: null,
      is_active: true,
    },
    order: [["menu_id", "ASC"]],
  });
};

/**
 * Find child menus by parent_menu_id
 */
const findChildMenus = async (moduleCode, parentMenuId) => {
  return await IsoMenu.findAll({
    where: {
      module_code: moduleCode.toUpperCase(),
      parent_menu_id: parentMenuId,
      is_active: true,
    },
    order: [["menu_id", "ASC"]],
  });
};

/**
 * Get hierarchical menu structure (parent with children nested)
 */
const getHierarchicalMenus = async (moduleCode, hMenuId) => {
  const allMenus = await findByModuleAndType(moduleCode, hMenuId);

  // Separate parents and children
  const parents = allMenus.filter((m) => !m.parent_menu_id);
  const children = allMenus.filter((m) => m.parent_menu_id);

  // Build hierarchy
  return parents.map((parent) => ({
    ...parent.toJSON(),
    children: children
      .filter((child) => child.parent_menu_id === parent.menu_id)
      .map((child) => child.toJSON()),
  }));
};

/**
 * Find menu by ID
 */
const findById = async (menuRefId) => {
  return await IsoMenu.findByPk(menuRefId);
};

/**
 * Create menu
 */
const create = async (data, transaction = null) => {
  return await IsoMenu.create(
    {
      module_code: data.module_code.toUpperCase().trim(),
      h_menu_id: data.h_menu_id.toUpperCase(),
      menu_id: data.menu_id,
      parent_menu_id: data.parent_menu_id || null,
      menu_label: data.menu_label.trim(),
      web_route_path: data.web_route_path || null,
      web_icon_name: data.web_icon_name || null,
      is_active: data.is_active ?? true,
    },
    { transaction },
  );
};

/**
 * Update menu
 */
const update = async (menuRefId, updates, transaction = null) => {
  const allowedFields = [
    "menu_label",
    "web_route_path",
    "web_icon_name",
    "is_active",
    "parent_menu_id",
  ];

  const updateData = {};
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateData[field] = updates[field];
    }
  }

  const [rowsUpdated, [updatedMenu]] = await IsoMenu.update(updateData, {
    where: { menu_ref_id: menuRefId },
    returning: true,
    transaction,
  });

  return updatedMenu;
};

/**
 * Delete menu
 */
const deleteById = async (menuRefId, transaction = null) => {
  const deleted = await IsoMenu.destroy({
    where: { menu_ref_id: menuRefId },
    transaction,
  });

  return deleted > 0;
};

export const IsoMenuModel = {
  findByModuleAndType,
  findByModule,
  findParentMenus,
  findChildMenus,
  getHierarchicalMenus,
  findById,
  create,
  update,
  deleteById,
};

export default IsoMenuModel;
