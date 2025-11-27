import { sequelize } from '../models/dbModels.js';
import { DataTypes } from 'sequelize';

/**
 * Audit Log Model for tracking all important actions
 */
export const AuditLog = sequelize.define('sys_audit_logs', {
  log_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'User who performed the action'
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Action type (e.g., CREATE, UPDATE, DELETE, LOGIN)'
  },
  resource_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Type of resource affected (e.g., USER, ORGANIZATION, MEMBER)'
  },
  resource_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID of the affected resource'
  },
  old_values: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Previous values before change'
  },
  new_values: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'New values after change'
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IP address of the client'
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Browser/client user agent'
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'SUCCESS',
    validate: {
      isIn: [['SUCCESS', 'FAILED', 'ERROR']]
    }
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional metadata'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  timestamps: false,
  tableName: 'sys_audit_logs',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['action'] },
    { fields: ['resource_type', 'resource_id'] },
    { fields: ['created_at'] },
    { fields: ['ip_address'] }
  ]
});


export const auditLog = (action, resourceType = null) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;
    const startTime = Date.now();

    // Override send function to capture response
    res.send = function(data) {
      const duration = Date.now() - startTime;
      
      // Only log if response was successful or if it's an important failure
      const shouldLog = res.statusCode < 400 || [401, 403, 404].includes(res.statusCode);
      
      if (shouldLog) {
        // Parse response if it's JSON
        let parsedData = null;
        try {
          parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        } catch (e) {
          // Not JSON, ignore
        }

        // Create audit log asynchronously (don't block response)
        setImmediate(async () => {
          try {
            const logData = {
              user_id: req.user?.user_id || null,
              action: action,
              resource_type: resourceType,
              resource_id: req.params?.id || req.params?.orgId || req.params?.userId || null,
              new_values: req.body && Object.keys(req.body).length > 0 
                ? sanitizeLogData(req.body) 
                : null,
              ip_address: req.clientInfo?.ipAddress || req.ip,
              user_agent: req.clientInfo?.userAgent || req.headers['user-agent'],
              status: res.statusCode < 400 ? 'SUCCESS' : 'FAILED',
              error_message: res.statusCode >= 400 && parsedData?.error 
                ? parsedData.error 
                : null,
              metadata: {
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                orgId: req.user?.current_org_id || null
              }
            };

            await AuditLog.create(logData);
            
            console.log('📝 Audit log created:', {
              action,
              user: req.user?.user_id,
              status: logData.status
            });
          } catch (error) {
            console.error('❌ Failed to create audit log:', error);
          }
        });
      }

      // Call original send
      originalSend.call(this, data);
    };

    next();
  };
};


const sanitizeLogData = (data) => {
  if (!data || typeof data !== 'object') return data;

  const sensitiveFields = [
    'password',
    'password_hash',
    'oldPassword',
    'newPassword',
    'token',
    'refreshToken',
    'accessToken',
    'reset_token',
    'credit_card',
    'cvv',
    'ssn'
  ];

  const sanitized = Array.isArray(data) ? [] : {};

  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      if (sensitiveFields.includes(key)) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof data[key] === 'object' && data[key] !== null) {
        sanitized[key] = sanitizeLogData(data[key]);
      } else {
        sanitized[key] = data[key];
      }
    }
  }

  return sanitized;
};


export const auditChange = (resourceType, findResourceFn) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params?.id || req.params?.orgId || req.params?.userId;
      
      if (resourceId && findResourceFn) {
        // Fetch current state before changes
        const currentResource = await findResourceFn(resourceId);
        
        if (currentResource) {
          req.auditOldValues = sanitizeLogData(currentResource.toJSON());
        }
      }

      // Store original send
      const originalSend = res.send;

      res.send = function(data) {
        const statusCode = res.statusCode;

        if (statusCode >= 200 && statusCode < 300 && req.auditOldValues) {
          setImmediate(async () => {
            try {
              let newValues = null;
              
              // Try to parse response to get new values
              try {
                const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
                newValues = parsedData?.data || parsedData?.user || parsedData?.organization;
              } catch (e) {
                // Ignore parse errors
              }

              await AuditLog.create({
                user_id: req.user?.user_id || null,
                action: 'UPDATE',
                resource_type: resourceType,
                resource_id: resourceId,
                old_values: req.auditOldValues,
                new_values: newValues ? sanitizeLogData(newValues) : null,
                ip_address: req.clientInfo?.ipAddress || req.ip,
                user_agent: req.clientInfo?.userAgent || req.headers['user-agent'],
                status: 'SUCCESS',
                metadata: {
                  method: req.method,
                  path: req.path
                }
              });

              console.log('📝 Change audit log created:', {
                resourceType,
                resourceId
              });
            } catch (error) {
              console.error('❌ Failed to create change audit log:', error);
            }
          });
        }

        originalSend.call(this, data);
      };

      next();
    } catch (error) {
      console.error('❌ Audit change middleware error:', error);
      next();
    }
  };
};

/**
 * Query audit logs with filters
 */
export const queryAuditLogs = async (filters = {}, options = {}) => {
  const {
    page = 1,
    limit = 50,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = options;

  const where = {};

  if (filters.user_id) where.user_id = filters.user_id;
  if (filters.action) where.action = filters.action;
  if (filters.resource_type) where.resource_type = filters.resource_type;
  if (filters.resource_id) where.resource_id = filters.resource_id;
  if (filters.status) where.status = filters.status;
  
  if (filters.startDate && filters.endDate) {
    where.created_at = {
      [Op.gte]: filters.startDate,
      [Op.lte]: filters.endDate
    };
  }

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

/**
 * Clean up old audit logs (retention policy)
 */
export const cleanupOldAuditLogs = async (retentionDays = 90) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const deleted = await AuditLog.destroy({
    where: {
      created_at: {
        [Op.lt]: cutoffDate
      }
    }
  });

  console.log(`🧹 Cleaned up ${deleted} audit logs older than ${retentionDays} days`);
  return deleted;
};

// Sync audit log table
export const syncAuditLogTable = async () => {
  try {
    await AuditLog.sync({ alter: true });
    console.log('✅ Audit log table synced');
  } catch (error) {
    console.error('❌ Failed to sync audit log table:', error);
  }
};

export default {
  AuditLog,
  auditLog,
  auditChange,
  queryAuditLogs,
  cleanupOldAuditLogs,
  syncAuditLogTable
};