import sequelize from '../config/dbConnection.js';
import { DataTypes } from 'sequelize';

// ==================== ROLE MODEL ====================
const Role = sequelize.define('sys_role', {
  role_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false
  },
  role_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      isIn: [['OWNER', 'ADMIN', 'USER', 'VIEWER', 'AUDITOR']]
    }
  },
  create_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'create_date'
  }
}, {
  timestamps: false,
  tableName: 'sys_role'
});

// ==================== USER MODEL ====================
const User = sequelize.define('sys_users', {
  user_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      len: [6, 255]
    }
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 200]
    }
  },
  surname: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 200]
    }
  },
  full_name: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  sex: {
    type: DataTypes.STRING(10),
    allowNull: true,
    validate: {
      isIn: [['M', 'F', 'O', null]]
    }
  },
  user_address_1: {
    type: DataTypes.STRING(1000),
    allowNull: true
  },
  user_address_2: {
    type: DataTypes.STRING(1000),
    allowNull: true
  },
  user_address_3: {
    type: DataTypes.STRING(1000),
    allowNull: true
  },
  profile_image_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      isUrlOrEmpty(value) {
      if (!value || value.trim() === '') {
        return;
      }
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(value)) {
        throw new Error('กรุณากรอก URL ที่ถูกต้อง');
      }
    }
    }
  },
  auth_provider: {
    type: DataTypes.STRING(50),
    defaultValue: 'local',
    validate: {
      isIn: [['local', 'google', 'facebook']]
    }
  },
  provider_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  role_id: {
  type: DataTypes.INTEGER,
  allowNull: false,
  references: {
    model: 'sys_role', // table ที่อ้างอิง
    key: 'role_id'
  },
  onUpdate: 'CASCADE',
  onDelete: 'NO ACTION'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  reset_token: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  reset_token_expire: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  timestamps: true,
  tableName: 'sys_users',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: (user) => {
      if (user.name && user.surname) {
        user.full_name = `${user.name} ${user.surname}`;
      }
    },
    beforeUpdate: (user) => {
      if (user.changed('name') || user.changed('surname')) {
        user.full_name = `${user.name} ${user.surname}`;
      }
    }
  }
});

// ==================== ORGANIZATION MODEL ====================
const Organization = sequelize.define('sys_organizations', {
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

// ==================== ORGANIZATION MEMBER MODEL ====================
const OrganizationMember = sequelize.define('sys_organization_members', {
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

// ==================== REFRESH TOKEN MODEL ====================
const RefreshToken = sequelize.define('sys_refresh_tokens', {
  token_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  refresh_token: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  timestamps: false,
  tableName: 'sys_refresh_tokens'
});

// ==================== ASSOCIATIONS ====================

// User -> Role
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });

// Organization -> User (owner)
Organization.belongsTo(User, { 
  foreignKey: 'owner_user_id', 
  as: 'owner' 
});
User.hasMany(Organization, { 
  foreignKey: 'owner_user_id', 
  as: 'ownedOrganizations' 
});

// Organization <-> User (through OrganizationMember)
Organization.belongsToMany(User, {
  through: OrganizationMember,
  foreignKey: 'org_id',
  otherKey: 'user_id',
  as: 'members'
});

User.belongsToMany(Organization, {
  through: OrganizationMember,
  foreignKey: 'user_id',
  otherKey: 'org_id',
  as: 'organizations'
});

// OrganizationMember associations
OrganizationMember.belongsTo(User, { 
  foreignKey: 'user_id', 
  as: 'user' 
});
OrganizationMember.belongsTo(Organization, { 
  foreignKey: 'org_id', 
  as: 'organization' 
});
OrganizationMember.belongsTo(Role, { 
  foreignKey: 'role_id', 
  as: 'role' 
});

// RefreshToken -> User
RefreshToken.belongsTo(User, { 
  foreignKey: 'user_id', 
  as: 'user',
  onDelete: 'CASCADE' 
});
User.hasMany(RefreshToken, { 
  foreignKey: 'user_id', 
  as: 'refreshTokens',
  onDelete: 'CASCADE' 
});

// ==================== SYNC DATABASE ====================
const syncDatabase = async () => {
  try {
    // สำหรับ production ใช้ migrations แทน
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database synced successfully');
      
      // Seed roles if not exist
      await seedRoles();
    }
  } catch (error) {
    console.error('❌ Database sync error:', error);
    throw error;
  }
};

// Seed initial roles
const seedRoles = async () => {
  const roles = [
    { role_id: 1, role_name: 'OWNER' },
    { role_id: 2, role_name: 'ADMIN' },
    { role_id: 3, role_name: 'USER' },
    { role_id: 4, role_name: 'VIEWER' },
    { role_id: 5, role_name: 'AUDITOR' }
  ];

  for (const role of roles) {
    await Role.findOrCreate({
      where: { role_id: role.role_id },
      defaults: role
    });
  }
  console.log('✅ Roles seeded successfully');
};

// Export models and sync function
export {
  sequelize,
  Role,
  User,
  Organization,
  OrganizationMember,
  RefreshToken,
  syncDatabase
};

export default {
  sequelize,
  Role,
  User,
  Organization,
  OrganizationMember,
  RefreshToken,
  syncDatabase
};