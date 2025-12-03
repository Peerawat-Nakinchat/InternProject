// src/models/MemberModel.js
import sequelize from "../config/dbConnection.js";
import { DataTypes, Op } from 'sequelize';
import { User } from "./UserModel.js";
import { Role } from "./RoleModel.js";
import { Organization } from "./CompanyModel.js";

export const OrganizationMember = sequelize.define('sys_organization_members', {
  membership_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  org_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  role_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isIn: [[1, 2, 3, 4, 5]]
    }
  },
  joined_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'joined_date'
  }
}, {
  timestamps: false,
  tableName: 'sys_organization_members',
  indexes: [
    {
      unique: true,
      fields: ['org_id', 'user_id']
    }
  ]
});

/**
 * Add member to organization
 */
const create = async (data, transaction = null) => {
  const [member, created] = await OrganizationMember.upsert(
    {
      org_id: data.orgId || data.org_id, // รองรับทั้ง camelCase และ snake_case กันเหนียว
      user_id: data.userId || data.user_id,
      role_id: Number(data.roleId || data.role_id),
      joined_date: new Date()
    },
    {
      transaction, // ส่ง transaction ต่อให้ Sequelize
      returning: true
    }
  );

  return member;
};

/**
 * Find member by org and user
 */
const findOne = async (orgId, userId) => {
  return await OrganizationMember.findOne({
    where: {
      org_id: orgId,
      user_id: userId
    },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['user_id', 'email', 'name', 'surname', 'full_name']
      },
      {
        model: Role,
        as: 'role',
        attributes: ['role_id', 'role_name']
      }
    ]
  });
};

/**
 * Check if user is member of organization
 */
const exists = async (orgId, userId) => {
  const count = await OrganizationMember.count({
    where: {
      org_id: orgId,
      user_id: userId
    }
  });

  return count > 0;
};

/**
 * Get member's role in organization
 */
const getRole = async (orgId, userId) => {
  const member = await OrganizationMember.findOne({
    where: {
      org_id: orgId,
      user_id: userId
    },
    attributes: ['role_id']
  });

  return member ? member.role_id : null;
};

/**
 * Get all members of organization
 */
const findByOrganization = async (orgId, filters = {}) => {
  const where = { org_id: orgId };
  
  if (filters.role_id) {
    where.role_id = filters.role_id;
  }

  return await OrganizationMember.findAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        attributes: [
          'user_id',
          'email',
          'name',
          'surname',
          'full_name',
          'profile_image_url',
          'is_active',
          'sex',
          'user_address_1',
          'user_address_2', 
          'user_address_3'
        ]
      },
      {
        model: Role,
        as: 'role',
        attributes: ['role_id', 'role_name']
      }
    ],
    order: [['joined_date', 'DESC']]
  });
};

/**
 * Get all memberships of a user
 */
const findByUser = async (userId) => {
  return await OrganizationMember.findAll({
    where: { user_id: userId },
    include: [
      {
        model: Organization,
        as: 'organization',
        attributes: ['org_id', 'org_name', 'org_code']
      },
      {
        model: Role,
        as: 'role',
        attributes: ['role_id', 'role_name']
      }
    ]
  });
};

/**
 * Update member role
 */
const updateRole = async (orgId, userId, newRoleId, transaction = null) => {
  const [rowsUpdated, [updatedMember]] = await OrganizationMember.update(
    { role_id: newRoleId },
    {
      where: {
        org_id: orgId,
        user_id: userId
      },
      returning: true,
      transaction
    }
  );

  return updatedMember;
};

/**
 * Remove member from organization
 */
const remove = async (orgId, userId, transaction = null) => {
  const deleted = await OrganizationMember.destroy({
    where: {
      org_id: orgId,
      user_id: userId
    },
    transaction
  });

  return deleted > 0;
};

/**
 * Remove all members from organization
 */
const removeAllByOrganization = async (orgId, transaction = null) => {
  const deleted = await OrganizationMember.destroy({
    where: { org_id: orgId },
    transaction
  });

  return deleted;
};

/**
 * Bulk remove members
 */
const bulkRemove = async (orgId, userIds, transaction = null) => {
  const deleted = await OrganizationMember.destroy({
    where: {
      org_id: orgId,
      user_id: { [Op.in]: userIds }
    },
    transaction
  });

  return deleted;
};

/**
 * Get member count for organization
 */
const countByOrganization = async (orgId) => {
  return await OrganizationMember.count({
    where: { org_id: orgId }
  });
};

/**
 * Get members with pagination
 */
const findByOrganizationPaginated = async (orgId, options = {}) => {
  const {
    page = 1,
    limit = 10,
    role_id = null,
    search = null
  } = options;

  const where = { org_id: orgId };
  
  if (role_id) {
    where.role_id = role_id;
  }

  const include = [
    {
      model: User,
      as: 'user',
      attributes: [
        'user_id',
        'email',
        'name',
        'surname',
        'full_name',
        'profile_image_url',
        'is_active',
        'sex',
        'user_address_1',
        'user_address_2', 
        'user_address_3'
      ],
      where: search ? {
        [Op.or]: [
          { email: { [Op.iLike]: `${search}%` } },
          { name: { [Op.iLike]: `${search}%` } },
          { surname: { [Op.iLike]: `${search}%` } },
          { full_name: { [Op.iLike]: `${search}%` } }
        ]
      } : undefined
    },
    {
      model: Role,
      as: 'role',
      attributes: ['role_id', 'role_name']
    }
  ];

  const { count, rows } = await OrganizationMember.findAndCountAll({
    where,
    include,
    limit,
    offset: (page - 1) * limit,
    order: [['joined_date', 'DESC']],
    distinct: true
  });

  return {
    members: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit)
  };
};

/**
 * Get members by role
 */
const findByRole = async (orgId, roleId) => {
  return await OrganizationMember.findAll({
    where: {
      org_id: orgId,
      role_id: roleId
    },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['user_id', 'email', 'name', 'surname', 'full_name']
      }
    ]
  });
};

/**
 * Count members by role
 */
const countByRole = async (orgId, roleId) => {
  return await OrganizationMember.count({
    where: {
      org_id: orgId,
      role_id: roleId
    }
  });
};

/**
 * Get role distribution (stats)
 */
const getRoleDistribution = async (orgId) => {
  const results = await OrganizationMember.findAll({
    attributes: [
      'role_id',
      [sequelize.fn('COUNT', sequelize.col('user_id')), 'count']
    ],
    where: { org_id: orgId },
    group: ['role_id']
  });

  const distribution = {};
  results.forEach(r => {
    const row = r.toJSON();
    distribution[row.role_id] = Number(row.count);
  });

  return distribution;
};

/**
 * Bulk create members
 */
const bulkCreate = async (membersData, transaction = null) => {
  return await OrganizationMember.bulkCreate(membersData, { 
    transaction,
    validate: true 
  });
};

/**
 * Find membership by ID
 */
const findByMembershipId = async (membershipId) => {
  return await OrganizationMember.findByPk(membershipId, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['user_id', 'email', 'name', 'surname', 'full_name']
      },
      {
        model: Organization,
        as: 'organization',
        attributes: ['org_id', 'org_name', 'org_code']
      },
      {
        model: Role,
        as: 'role',
        attributes: ['role_id', 'role_name']
      }
    ]
  });
};

export const MemberModel = {
  create,
  findOne,
  exists,
  getRole,
  findByOrganization,
  findByUser,
  updateRole,
  remove,
  removeAllByOrganization,
  bulkRemove,
  countByOrganization,
  findByOrganizationPaginated,
  findByRole,
  countByRole,
  getRoleDistribution,
  bulkCreate,
  findByMembershipId
};

export default MemberModel;