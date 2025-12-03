// src/models/CompanyModel.js
import { DataTypes, Op } from 'sequelize';
import sequelize from "../config/dbConnection.js";
import { User } from "./UserModel.js";  
import { OrganizationMember } from "./MemberModel.js";

// ==================== ORGANIZATION MODEL ====================
export const Organization = sequelize.define('sys_organizations', {
  org_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  org_name: {
    type: DataTypes.STRING(1000),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 1000]
    }
  },
  org_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [1, 50],
      is: /^[A-Z0-9_-]+$/i // Only alphanumeric, underscore, hyphen
    }
  },
  owner_user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  org_address_1: {
    type: DataTypes.STRING(1000),
    allowNull: true
  },
  org_address_2: {
    type: DataTypes.STRING(1000),
    allowNull: true
  },
  org_address_3: {
    type: DataTypes.STRING(1000),
    allowNull: true
  },
  org_integrate: {
    type: DataTypes.STRING(1),
    defaultValue: 'N',
    validate: {
      isIn: [['Y', 'N']]
    }
  },
  org_integrate_url: {
    type: DataTypes.STRING(1500),
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  org_integrate_provider_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  org_integrate_passcode: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  created_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_date'
  },
  updated_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_date'
  }
}, {
  timestamps: true,
  tableName: 'sys_organizations',
  createdAt: 'created_date',
  updatedAt: 'updated_date'
});

/**
 * Create organization
 */
const create = async (data, transaction = null) => {
  return await Organization.create(
    {
      org_name: data.org_name.trim(),
      org_code: data.org_code.toUpperCase().trim(),
      owner_user_id: data.owner_user_id,
      org_address_1: data.org_address_1 || '',
      org_address_2: data.org_address_2 || '',
      org_address_3: data.org_address_3 || '',
      org_integrate: data.org_integrate || 'N',
      org_integrate_url: data.org_integrate_url || null,
      org_integrate_provider_id: data.org_integrate_provider_id || null,
      org_integrate_passcode: data.org_integrate_passcode || null
    },
    { transaction }
  );
};

/**
 * Find organization by ID
 */
const findById = async (orgId) => {
  return await Organization.findByPk(orgId, {
    include: [
      {
        model: User,
        as: 'owner',
        attributes: ['user_id', 'email', 'name', 'surname', 'full_name']
      }
    ]
  });
};

/**
 * Find organization by code
 */
const findByCode = async (orgCode) => {
  return await Organization.findOne({
    where: { org_code: orgCode.toUpperCase().trim() }
  });
};

/**
 * Find organizations where user is owner
 */
const findByOwner = async (userId) => {
  return await Organization.findAll({
    where: { owner_user_id: userId },
    include: [
      {
        model: User,
        as: 'owner',
        attributes: ['user_id', 'email', 'name', 'surname']
      }
    ]
  });
};

/**
 * Find organizations where user is member
 */
const findByMember = async (userId) => {
  return await Organization.findAll({
    include: [
      {
        model: User,
        as: 'members',
        where: { user_id: userId },
        through: {
          attributes: ['role_id', 'joined_date']
        },
        attributes: ['user_id']
      },
      {
        model: User,
        as: 'owner',
        attributes: ['user_id', 'email', 'name', 'surname']
      }
    ],
    where: {
      owner_user_id: { [Op.ne]: userId }
    }
  });
};

/**
 * Update organization
 */
const update = async (orgId, updates, transaction = null) => {
  // Whitelist allowed fields
  const allowedFields = [
    'org_name',
    'org_code',
    'org_address_1',
    'org_address_2',
    'org_address_3',
    'org_integrate',
    'org_integrate_url',
    'org_integrate_provider_id',
    'org_integrate_passcode'
  ];

  const updateData = {};
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateData[field] = updates[field];
    }
  }

  // Normalize org_code
  if (updateData.org_code) {
    updateData.org_code = updateData.org_code.toUpperCase().trim();
  }

  const [rowsUpdated, [updatedOrg]] = await Organization.update(
    updateData,
    {
      where: { org_id: orgId },
      returning: true,
      validate: true,
      transaction
    }
  );

  return updatedOrg;
};

/**
 * Delete organization
 */
const deleteById = async (orgId, transaction = null) => {
  const deleted = await Organization.destroy({
    where: { org_id: orgId },
    transaction
  });

  return deleted > 0;
};

/**
 * Update organization owner
 */
const updateOwner = async (orgId, newOwnerId, transaction = null) => {
  const [rowsUpdated, [updatedOrg]] = await Organization.update(
    { owner_user_id: newOwnerId },
    {
      where: { org_id: orgId },
      returning: true,
      transaction
    }
  );

  return updatedOrg;
};

/**
 * Check if organization code exists
 */
const codeExists = async (orgCode, excludeOrgId = null) => {
  const where = { org_code: orgCode.toUpperCase().trim() };
  
  if (excludeOrgId) {
    where.org_id = { [Op.ne]: excludeOrgId };
  }

  const count = await Organization.count({ where });
  return count > 0;
};

/**
 * Search organizations
 */
const search = async (filters = {}, options = {}) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'created_date',
    sortOrder = 'DESC'
  } = options;

  const where = {};
  
  if (filters.org_name) {
    where.org_name = { [Op.iLike]: `${filters.org_name}%` };
  }
  
  if (filters.org_code) {
    where.org_code = { [Op.iLike]: `${filters.org_code}%` };
  }
  
  if (filters.owner_user_id) {
    where.owner_user_id = filters.owner_user_id;
  }

  const { count, rows } = await Organization.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'owner',
        attributes: ['user_id', 'email', 'name', 'surname', 'full_name']
      }
    ],
    limit,
    offset: (page - 1) * limit,
    order: [[sortBy, sortOrder]]
  });

  return {
    organizations: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit)
  };
};

/**
 * Get organization with member count
 */
const findByIdWithStats = async (orgId) => {
  const org = await Organization.findByPk(orgId, {
    include: [
      {
        model: User,
        as: 'owner',
        attributes: ['user_id', 'email', 'name', 'surname', 'full_name']
      },
      {
        model: User,
        as: 'members',
        attributes: ['user_id'],
        through: {
          attributes: ['role_id']
        }
      }
    ]
  });

  return org;
};

/**
 * Get member counts for multiple organizations
 */
const getMemberCounts = async (orgIds = null) => {
  const where = {};
  if (Array.isArray(orgIds) && orgIds.length > 0) {
    where.org_id = { [Op.in]: orgIds };
  }

  const rows = await OrganizationMember.findAll({
    attributes: [
      'org_id',
      [sequelize.fn('COUNT', sequelize.col('user_id')), 'member_count']
    ],
    where,
    group: ['org_id']
  });

  const map = {};
  rows.forEach(r => {
    const row = r.toJSON();
    map[row.org_id] = Number(row.member_count);
  });

  return map;
};

/**
 * Count organizations by criteria
 */
const count = async (where = {}) => {
  return await Organization.count({ where });
};

/**
 * Bulk create organizations
 */
const bulkCreate = async (orgsData, transaction = null) => {
  return await Organization.bulkCreate(orgsData, { 
    transaction,
    validate: true 
  });
};

/**
 * Check if user is owner of organization
 */
const isOwner = async (orgId, userId) => {
  const org = await Organization.findByPk(orgId, {
    attributes: ['owner_user_id']
  });

  return org && org.owner_user_id === userId;
};

export const OrganizationModel = {
  create,
  findById,
  findByCode,
  findByOwner,
  findByMember,
  update,
  deleteById,
  updateOwner,
  codeExists,
  search,
  findByIdWithStats,
  getMemberCounts,
  count,
  bulkCreate,
  isOwner
};

export default OrganizationModel;