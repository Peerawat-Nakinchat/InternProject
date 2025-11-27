import { Organization, User, OrganizationMember, Role } from './dbModels.js';
import { Op } from 'sequelize';
import { sequelize } from '../models/dbModels.js';

const createOrganization = async (data, transaction = null) => {
  try {
    // Sequelize จะทำ validation อัตโนมัติตาม schema
    const organization = await Organization.create(
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

    return organization;
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      const customError = new Error('Organization code already exists');
      customError.code = '23505';
      throw customError;
    }
    throw error;
  }
};

const findOrganizationById = async (orgId) => {
  try {
    const organization = await Organization.findByPk(orgId, {
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['user_id', 'email', 'name', 'surname', 'full_name']
        }
      ]
    });

    return organization;
  } catch (error) {
    console.error('❌ Error finding organization:', error);
    throw error;
  }
};
const getRoleNameMap = (roleId) => {
  const id = Number(roleId);
  switch (id) {
    case 1: return 'OWNER';
    case 2: return 'ADMIN';
    case 3: return 'USER';
    case 4: return 'VIEWER';
    case 5: return 'AUDITOR';
    default: return 'UNKNOWN';
  }
};

const findOrganizationsByUser = async (userId) => {
  try {
    // ---------- OWNER ----------
    const ownedOrgs = await Organization.findAll({
      where: { owner_user_id: userId },
      attributes: {
        include: [
          [sequelize.literal('1'), 'role_id'],
          [sequelize.literal(`'OWNER'`), 'role_name']
        ]
      },
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['user_id', 'email', 'name', 'surname']
        }
      ]
    });

    const formattedOwnedOrgs = ownedOrgs.map(org => {
      const o = org.toJSON();
      o.member_count = 0;
      return o;
    });

    // ---------- MEMBER ----------
    const memberOrgs = await Organization.findAll({
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

    const formattedMemberOrgs = memberOrgs.map(org => {
      const o = org.toJSON();
      const memberInfo = o.members?.[0];

      console.log('📊 Debug member info:', {
        org_name: o.org_name,
        memberInfo: memberInfo,
        keys: memberInfo ? Object.keys(memberInfo) : []
      });

      // ✅ ลอง key ทั้งหมดที่เป็นไปได้
      const through = 
        memberInfo?.OrganizationMember ||
        memberInfo?.sys_organization_members ||
        memberInfo?.['sys_organization_members'] ||
        null;

      if (through && through.role_id) {
        o.role_id = through.role_id;
        o.role_name = getRoleNameMap(through.role_id);
        o.joined_date = through.joined_date ?? null;
        
        console.log('✅ Role assigned:', {
          org_name: o.org_name,
          role_id: o.role_id,
          role_name: o.role_name
        });
      } else {
        console.warn('⚠️ No through data for org:', o.org_name, {
          through: through,
          memberInfo: memberInfo
        });
        o.role_id = null;
        o.role_name = 'UNKNOWN';
        o.joined_date = null;
      }

      o.member_count = 0;
      delete o.members;
      return o;
    });

    // รวมทั้งสองชุด
    const allOrgs = [...formattedOwnedOrgs, ...formattedMemberOrgs];

    // ---------- เติม member_count ----------
    const orgIds = allOrgs.map(o => o.org_id).filter(Boolean);

    if (orgIds.length > 0) {
      const counts = await OrganizationMember.findAll({
        attributes: [
          'org_id',
          [sequelize.fn('COUNT', sequelize.col('user_id')), 'member_count']
        ],
        where: {
          org_id: { [Op.in]: orgIds }
        },
        group: ['org_id']
      });

      const countsMap = {};
      counts.forEach(r => {
        const row = r.toJSON();
        countsMap[row.org_id] = Number(row.member_count);
      });

      allOrgs.forEach(o => {
        o.member_count = countsMap[o.org_id] ?? 0;
      });
    }

    console.log('✅ Final orgs count:', {
      owned: formattedOwnedOrgs.length,
      member: formattedMemberOrgs.length,
      total: allOrgs.length
    });

    return allOrgs;

  } catch (error) {
    console.error('❌ Error finding organizations by user:', error);
    throw error;
  }
};



const updateOrganization = async (orgId, updates) => {
  try {
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
        validate: true
      }
    );

    return rowsUpdated > 0 ? updatedOrg : null;
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      const customError = new Error('Organization code already exists');
      customError.code = '23505';
      throw customError;
    }
    throw error;
  }
};

const deleteOrganization = async (orgId, transaction = null) => {
  try {
    const deleted = await Organization.destroy({
      where: { org_id: orgId },
      transaction
    });

    return deleted > 0;
  } catch (error) {
    console.error('❌ Error deleting organization:', error);
    throw error;
  }
};

const isOrgCodeExists = async (org_code, excludeOrgId = null) => {
  try {
    const where = { org_code: org_code.toUpperCase().trim() };
    
    if (excludeOrgId) {
      where.org_id = { [Op.ne]: excludeOrgId };
    }

    const count = await Organization.count({ where });
    return count > 0;
  } catch (error) {
    console.error('❌ Error checking org code:', error);
    throw error;
  }
};

// Search organizations with filters
const searchOrganizations = async (filters = {}, options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'created_date',
      sortOrder = 'DESC'
    } = options;

    const where = {};
    
    if (filters.org_name) {
      where.org_name = { [Op.iLike]: `%${filters.org_name}%` };
    }
    
    if (filters.org_code) {
      where.org_code = { [Op.iLike]: `%${filters.org_code}%` };
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
  } catch (error) {
    console.error('❌ Error searching organizations:', error);
    throw error;
  }
};

// Get organization statistics
const getOrganizationStats = async (orgId) => {
  try {
    const org = await Organization.findByPk(orgId, {
      include: [
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

    if (!org) return null;

    const orgJson = org.toJSON();

    const membersByRole = {};
    (orgJson.members || []).forEach(member => {
      const through = member.OrganizationMember || null;
      const roleId = through?.role_id ?? null;
      if (roleId !== null) {
        membersByRole[roleId] = (membersByRole[roleId] || 0) + 1;
      }
    });

    return {
      org_id: orgJson.org_id,
      org_name: orgJson.org_name,
      total_members: orgJson.members?.length || 0,
      members_by_role: membersByRole,
      created_date: orgJson.created_date
    };
  } catch (error) {
    console.error('❌ Error getting organization stats:', error);
    throw error;
  }
};

const getMemberCounts = async (orgIds = null) => {
  try {
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
  } catch (error) {
    console.error('❌ Error getMemberCounts:', error);
    throw error;
  }
};

export const OrganizationModel = {
  createOrganization,
  findOrganizationById,
  findOrganizationsByUser,
  updateOrganization,
  deleteOrganization,
  isOrgCodeExists,
  searchOrganizations,
  getOrganizationStats
};