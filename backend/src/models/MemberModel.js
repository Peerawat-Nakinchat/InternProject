import { OrganizationMember, User, Organization, Role } from './dbModels.js';
import { sequelize } from '../models/dbModels.js';

const addMemberToOrganization = async ({ orgId, userId, roleId }, options = {}) => {
  const transaction = options.transaction || null;

  try {
    console.log("➕ Adding member:", { orgId, userId, roleId }); // Log ดูค่าที่รับมา

    // Validate role_id
    if (![1, 2, 3, 4, 5].includes(Number(roleId))) {
      throw new Error(`Invalid role_id: ${roleId}`);
    }

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Use upsert
    const [member, created] = await OrganizationMember.upsert(
      {
        org_id: orgId,
        user_id: userId,
        role_id: Number(roleId),
        joined_date: new Date()
      },
      {
        transaction,
        returning: true
      }
    );

    return member;
  } catch (error) {
    console.error('❌ Error adding member:', error);
    throw error;
  }
};

const checkMembership = async (orgId, userId) => {
  try {
    const member = await OrganizationMember.findOne({
      where: {
        org_id: orgId,
        user_id: userId
      }
    });

    return !!member;
  } catch (error) {
    console.error('❌ Error checking membership:', error);
    throw error;
  }
};

const findMembershipsByUserId = async (userId) => {
  try {
    const memberships = await OrganizationMember.findAll({
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

    return memberships;
  } catch (error) {
    console.error('❌ Error finding memberships:', error);
    throw error;
  }
};

const findMemberRole = async (orgId, userId) => {
  try {
    const member = await OrganizationMember.findOne({
      where: {
        org_id: orgId,
        user_id: userId
      },
      attributes: ['role_id']
    });

    return member ? member.role_id : null;
  } catch (error) {
    console.error('❌ Error finding member role:', error);
    throw error;
  }
};

const getMembers = async (orgId, filters = {}) => {
  try {
    const where = { org_id: orgId };
    
    if (filters.role_id) {
      where.role_id = filters.role_id;
    }

    const members = await OrganizationMember.findAll({
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
            'is_active'
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

    return members;
  } catch (error) {
    console.error('❌ Error getting members:', error);
    throw error;
  }
};

const updateMemberRole = async (orgId, userId, newRoleId, transaction = null) => {
  try {
    // Validate role_id
    if (![1, 2, 3, 4, 5].includes(newRoleId)) {
      throw new Error('Invalid role_id');
    }

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

    return rowsUpdated > 0 ? updatedMember : null;
  } catch (error) {
    console.error('❌ Error updating member role:', error);
    throw error;
  }
};

const removeMember = async (orgId, userId, transaction = null) => {
  try {
    const deleted = await OrganizationMember.destroy({
      where: {
        org_id: orgId,
        user_id: userId
      },
      transaction
    });

    return deleted > 0;
  } catch (error) {
    console.error('❌ Error removing member:', error);
    throw error;
  }
};

const updateOrganizationOwner = async (orgId, newOwnerUserId, transaction = null) => {
  try {
    const [rowsUpdated, [updatedOrg]] = await Organization.update(
      { owner_user_id: newOwnerUserId },
      {
        where: { org_id: orgId },
        returning: true,
        transaction
      }
    );

    return rowsUpdated > 0 ? updatedOrg : null;
  } catch (error) {
    console.error('❌ Error updating organization owner:', error);
    throw error;
  }
};

// Get member count by organization
const getMemberCount = async (orgId) => {
  try {
    const count = await OrganizationMember.count({
      where: { org_id: orgId }
    });

    return count;
  } catch (error) {
    console.error('❌ Error getting member count:', error);
    throw error;
  }
};

// Get members with pagination
const getMembersWithPagination = async (orgId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      role_id = null,
      search = null
    } = options;
    const Op = OrganizationMember.sequelize.Sequelize.Op;

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
          'is_active'
        ],
        where: search ? {
          [Op.or]: [
            { email: { [Op.iLike]: `%${search}%` } },
            { name: { [Op.iLike]: `%${search}%` } },
            { surname: { [Op.iLike]: `%${search}%` } },
            { full_name: { [Op.iLike]: `%${search}%` } }
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
  } catch (error) {
    console.error('❌ Error getting members with pagination:', error);
    throw error;
  }
};

// Bulk remove members
const bulkRemoveMembers = async (orgId, userIds, transaction = null) => {
  try {
    const Op = OrganizationMember.sequelize.Sequelize.Op;
    const deleted = await OrganizationMember.destroy({
      where: {
        org_id: orgId,
        user_id: { [Op.in]: userIds }
      },
      transaction
    });

    return deleted;
  } catch (error) {
    console.error('❌ Error bulk removing members:', error);
    throw error;
  }
};

export const MemberModel = {
  addMemberToOrganization,
  checkMembership,
  findMembershipsByUserId,
  findMemberRole,
  getMembers,
  updateMemberRole,
  removeMember,
  updateOrganizationOwner,
  getMemberCount,
  getMembersWithPagination,
  bulkRemoveMembers
};