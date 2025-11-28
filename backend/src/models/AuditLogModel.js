// src/models/AuditLogModel.js
import { DataTypes, Op } from 'sequelize';
import sequelize from "../config/dbConnection.js";

export const AuditLog = sequelize.define('sys_audit_logs', {
  // Primary Key
  log_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Unique log identifier'
  },

  // User Information
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'User who performed the action (null for system actions)'
  },
  user_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Email snapshot at time of action'
  },
  user_name: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Full name snapshot at time of action'
  },

  // Action Information
  action: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Action type (e.g., LOGIN, CREATE, UPDATE, DELETE)',
    validate: {
      isIn: [[
        // Auth actions
        'LOGIN', 'LOGOUT', 'LOGOUT_ALL', 'REGISTER', 
        'PASSWORD_RESET', 'PASSWORD_CHANGE', 'EMAIL_CHANGE',
        'PROFILE_UPDATE', 'ACCOUNT_ACTIVATE', 'ACCOUNT_DEACTIVATE',
        // Company actions
        'COMPANY_CREATE', 'COMPANY_UPDATE', 'COMPANY_DELETE', 'COMPANY_VIEW',
        // Member actions
        'MEMBER_INVITE', 'MEMBER_ADD', 'MEMBER_REMOVE', 'MEMBER_ROLE_CHANGE',
        'OWNER_TRANSFER',
        // Invitation actions
        'INVITATION_SEND', 'INVITATION_ACCEPT', 'INVITATION_CANCEL',
        // System actions
        'SYSTEM_STARTUP', 'SYSTEM_SHUTDOWN', 'DATABASE_BACKUP',
        // Security actions
        'SUSPICIOUS_ACTIVITY', 'FAILED_LOGIN', 'TOKEN_REFRESH',
        // Other
        'OTHER'
      ]]
    }
  },
  action_description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Human-readable description of the action'
  },

  // Target Resource Information
  target_table: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Table name of affected resource (e.g., sys_users, sys_organizations)'
  },
  target_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID of the affected resource'
  },
  target_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Type of resource (e.g., USER, ORGANIZATION, MEMBER)',
    validate: {
      isIn: [['USER', 'ORGANIZATION', 'MEMBER', 'INVITATION', 'TOKEN', 'SYSTEM', 'OTHER']]
    }
  },

  // Data Changes
  before_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Data before the change (for UPDATE/DELETE)'
  },
  after_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Data after the change (for CREATE/UPDATE)'
  },
  changes: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Specific fields that changed'
  },

  // Request Information
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'Client IP address (supports IPv6)'
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Browser/client user agent string'
  },
  request_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Full request URL/endpoint'
  },
  request_method: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'HTTP method (GET, POST, PUT, DELETE, PATCH)',
    validate: {
      isIn: [['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']]
    }
  },
  request_body: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Sanitized request body'
  },
  request_params: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'URL parameters'
  },
  request_query: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Query string parameters'
  },

  // Response Information
  response_status: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'HTTP status code'
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'SUCCESS',
    comment: 'Action result status',
    validate: {
      isIn: [['SUCCESS', 'FAILED', 'ERROR', 'WARNING', 'PARTIAL']]
    }
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error message if action failed'
  },
  error_stack: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error stack trace (development only)'
  },

  // Performance Metrics
  duration_ms: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Request duration in milliseconds'
  },

  // Context Information
  organization_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Organization context if applicable'
  },
  session_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Session identifier'
  },
  correlation_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'For tracking related actions'
  },

  // Additional Metadata
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional context-specific data'
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING(50)),
    allowNull: true,
    comment: 'Tags for categorization'
  },

  // Severity & Classification
  severity: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'INFO',
    comment: 'Log severity level',
    validate: {
      isIn: [['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']]
    }
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Log category (SECURITY, BUSINESS, SYSTEM, etc.)',
    validate: {
      isIn: [['SECURITY', 'BUSINESS', 'SYSTEM', 'PERFORMANCE', 'COMPLIANCE', 'OTHER']]
    }
  },

  // Timestamps
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
    comment: 'When the action occurred'
  }
}, {
  timestamps: false,
  tableName: 'sys_audit_logs',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['action'] },
    { fields: ['target_type', 'target_id'] },
    { fields: ['target_table'] },
    { fields: ['created_at'] },
    { fields: ['ip_address'] },
    { fields: ['organization_id'] },
    { fields: ['status'] },
    { fields: ['severity'] },
    { fields: ['category'] },
    { fields: ['correlation_id'] },
    { 
      name: 'audit_logs_composite_idx',
      fields: ['user_id', 'action', 'created_at'] 
    },
    {
      name: 'audit_logs_search_idx',
      fields: ['target_type', 'target_id', 'created_at']
    }
  ]
});

/**
 * AuditLogModel - Pure Data Access Layer
 */

// Create audit log entry
const create = async (data, transaction = null) => {
  return await AuditLog.create(data, { transaction });
};

// Bulk create
const bulkCreate = async (logsData, transaction = null) => {
  return await AuditLog.bulkCreate(logsData, { 
    transaction,
    validate: true 
  });
};

// Find by ID
const findById = async (logId) => {
  return await AuditLog.findByPk(logId);
};

// Query with filters
const query = async (filters = {}, options = {}) => {
  const {
    page = 1,
    limit = 50,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = options;

  const where = {};

  // User filters
  if (filters.user_id) where.user_id = filters.user_id;
  if (filters.user_email) where.user_email = { [Op.iLike]: `%${filters.user_email}%` };

  // Action filters
  if (filters.action) where.action = filters.action;
  if (filters.actions && Array.isArray(filters.actions)) {
    where.action = { [Op.in]: filters.actions };
  }

  // Target filters
  if (filters.target_type) where.target_type = filters.target_type;
  if (filters.target_id) where.target_id = filters.target_id;
  if (filters.target_table) where.target_table = filters.target_table;

  // Status filters
  if (filters.status) where.status = filters.status;
  if (filters.severity) where.severity = filters.severity;
  if (filters.category) where.category = filters.category;

  // Organization filter
  if (filters.organization_id) where.organization_id = filters.organization_id;

  // IP filter
  if (filters.ip_address) where.ip_address = filters.ip_address;

  // Date range
  if (filters.startDate || filters.endDate) {
    where.created_at = {};
    if (filters.startDate) where.created_at[Op.gte] = filters.startDate;
    if (filters.endDate) where.created_at[Op.lte] = filters.endDate;
  }

  // Correlation filter
  if (filters.correlation_id) where.correlation_id = filters.correlation_id;

  const { count, rows } = await AuditLog.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [[sortBy, sortOrder]]
  });

  return {
    logs: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit)
  };
};

// Get user activity
const findByUser = async (userId, limit = 50) => {
  return await AuditLog.findAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
    limit
  });
};

// Get recent logs
const findRecent = async (limit = 100) => {
  return await AuditLog.findAll({
    order: [['created_at', 'DESC']],
    limit
  });
};

// Get security events
const findSecurityEvents = async (startDate, endDate, limit = 100) => {
  return await AuditLog.findAll({
    where: {
      category: 'SECURITY',
      created_at: {
        [Op.between]: [startDate, endDate]
      }
    },
    order: [['created_at', 'DESC']],
    limit
  });
};

// Get failed actions
const findFailedActions = async (limit = 100) => {
  return await AuditLog.findAll({
    where: {
      status: { [Op.in]: ['FAILED', 'ERROR'] }
    },
    order: [['created_at', 'DESC']],
    limit
  });
};

// Delete old logs (retention policy)
const deleteOldLogs = async (retentionDays = 90, transaction = null) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  return await AuditLog.destroy({
    where: {
      created_at: { [Op.lt]: cutoffDate }
    },
    transaction
  });
};

// Get statistics
const getStats = async (startDate, endDate) => {
  const where = {};
  if (startDate && endDate) {
    where.created_at = { [Op.between]: [startDate, endDate] };
  }

  const [
    total,
    byAction,
    byStatus,
    bySeverity,
    byCategory
  ] = await Promise.all([
    AuditLog.count({ where }),
    AuditLog.findAll({
      attributes: [
        'action',
        [sequelize.fn('COUNT', sequelize.col('log_id')), 'count']
      ],
      where,
      group: ['action'],
      order: [[sequelize.fn('COUNT', sequelize.col('log_id')), 'DESC']],
      limit: 10
    }),
    AuditLog.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('log_id')), 'count']
      ],
      where,
      group: ['status']
    }),
    AuditLog.findAll({
      attributes: [
        'severity',
        [sequelize.fn('COUNT', sequelize.col('log_id')), 'count']
      ],
      where,
      group: ['severity']
    }),
    AuditLog.findAll({
      attributes: [
        'category',
        [sequelize.fn('COUNT', sequelize.col('log_id')), 'count']
      ],
      where,
      group: ['category']
    })
  ]);

  return {
    total,
    byAction: byAction.map(r => r.toJSON()),
    byStatus: byStatus.map(r => r.toJSON()),
    bySeverity: bySeverity.map(r => r.toJSON()),
    byCategory: byCategory.map(r => r.toJSON())
  };
};

// Count by criteria
const count = async (where = {}) => {
  return await AuditLog.count({ where });
};

// Export model and functions
export const AuditLogModel = {
  create,
  bulkCreate,
  findById,
  query,
  findByUser,
  findRecent,
  findSecurityEvents,
  findFailedActions,
  deleteOldLogs,
  getStats,
  count
};

export default AuditLogModel;