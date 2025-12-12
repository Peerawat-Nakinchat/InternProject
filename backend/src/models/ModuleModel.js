// src/models/ModuleModel.js
import { DataTypes, Op } from "sequelize";
import sequelize from "../config/dbConnection.js";

// ==================== MODULE MODEL ====================
export const Module = sequelize.define(
  "sys_iso_modules",
  {
    module_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    module_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 50],
      },
    },
    module_name: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 500],
      },
    },
    standard_version: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    module_point: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    is_active: {
      type: DataTypes.STRING(1),
      defaultValue: "t",
      validate: {
        isIn: [["t", "f"]],
      },
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
    tableName: "sys_iso_modules",
    createdAt: "create_date",
    updatedAt: "update_date",
  },
);

/**
 * Find all modules
 */
const findAll = async (options = {}) => {
  const {
    page = 1,
    limit = 50,
    sortBy = "module_point",
    sortOrder = "ASC",
    isActive = null,
  } = options;

  const where = {};

  if (isActive !== null) {
    where.is_active = isActive ? "t" : "f";
  }

  const { count, rows } = await Module.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [[sortBy, sortOrder]],
  });

  return {
    modules: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit),
  };
};

/**
 * Find module by ID
 */
const findById = async (moduleId) => {
  return await Module.findByPk(moduleId);
};

/**
 * Find module by code
 */
const findByCode = async (moduleCode) => {
  return await Module.findOne({
    where: { module_code: moduleCode.toUpperCase().trim() },
  });
};

/**
 * Find active modules only
 */
const findActive = async () => {
  return await Module.findAll({
    where: { is_active: "t" },
    order: [["module_point", "ASC"]],
  });
};

/**
 * Create module
 */
const create = async (data, transaction = null) => {
  return await Module.create(
    {
      module_code: data.module_code.toUpperCase().trim(),
      module_name: data.module_name.trim(),
      standard_version: data.standard_version || null,
      description: data.description || null,
      module_point: data.module_point || null,
      is_active: data.is_active || "t",
    },
    { transaction },
  );
};

/**
 * Update module
 */
const update = async (moduleId, updates, transaction = null) => {
  const allowedFields = [
    "module_code",
    "module_name",
    "standard_version",
    "description",
    "module_point",
    "is_active",
  ];

  const updateData = {};
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateData[field] = updates[field];
    }
  }

  if (updateData.module_code) {
    updateData.module_code = updateData.module_code.toUpperCase().trim();
  }

  const [rowsUpdated, [updatedModule]] = await Module.update(updateData, {
    where: { module_id: moduleId },
    returning: true,
    validate: true,
    transaction,
  });

  return updatedModule;
};

/**
 * Delete module
 */
const deleteById = async (moduleId, transaction = null) => {
  const deleted = await Module.destroy({
    where: { module_id: moduleId },
    transaction,
  });

  return deleted > 0;
};

/**
 * Search modules
 */
const search = async (searchTerm, options = {}) => {
  const {
    page = 1,
    limit = 50,
    sortBy = "module_point",
    sortOrder = "ASC",
  } = options;

  const where = {
    [Op.or]: [
      { module_code: { [Op.iLike]: `%${searchTerm}%` } },
      { module_name: { [Op.iLike]: `%${searchTerm}%` } },
      { description: { [Op.iLike]: `%${searchTerm}%` } },
    ],
  };

  const { count, rows } = await Module.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [[sortBy, sortOrder]],
  });

  return {
    modules: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit),
  };
};

/**
 * Count modules
 */
const count = async (where = {}) => {
  return await Module.count({ where });
};

/**
 * Check if module code exists
 */
const codeExists = async (moduleCode, excludeModuleId = null) => {
  const where = { module_code: moduleCode.toUpperCase().trim() };

  if (excludeModuleId) {
    where.module_id = { [Op.ne]: excludeModuleId };
  }

  const cnt = await Module.count({ where });
  return cnt > 0;
};

export const ModuleModel = {
  findAll,
  findById,
  findByCode,
  findActive,
  create,
  update,
  deleteById,
  search,
  count,
  codeExists,
};

export default ModuleModel;
