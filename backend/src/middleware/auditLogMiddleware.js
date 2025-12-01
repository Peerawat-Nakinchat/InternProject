// src/middleware/auditLogMiddleware.js
import AuditLogService from '../services/AuditLogService.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Main audit logging middleware
 */
export const auditLog = (action, targetType = null, options = {}) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    const correlationId = req.correlationId || uuidv4();
    req.correlationId = correlationId;

    // Store original send function
    const originalSend = res.send;

    // Override send function to capture response
    res.send = function(data) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Determine if we should log this request
      const shouldLog = options.logAll || 
        statusCode < 400 || 
        [401, 403, 404].includes(statusCode) ||
        options.forceLog;

      if (shouldLog) {
        // Parse response if it's JSON
        let parsedData = null;
        try {
          parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        } catch (e) {
          // Not JSON, ignore
        }

        // Extract target ID from various sources
        const targetId = 
          req.params?.id || 
          req.params?.orgId || 
          req.params?.userId ||
          req.params?.memberId ||
          parsedData?.data?.id ||
          parsedData?.user?.user_id ||
          parsedData?.data?.org_id;

        // Determine target table
        const targetTable = options.targetTable || inferTargetTable(targetType, req.path);

        // Build log data
        const logData = {
          // User info
          user_id: req.user?.user_id || parsedData?.user?.user_id || parsedData?.data?.user_id || null,
          user_email: req.user?.email || parsedData?.user?.email || parsedData?.data?.email || null,
          user_name: req.user?.full_name || parsedData?.user?.full_name || (parsedData?.user?.name ? `${parsedData.user.name} ${parsedData.user.surname}` : null) || null,

          // Action info
          action: action,
          action_description: options.description || null,

          // Target info
          target_type: targetType,
          target_id: targetId,
          target_table: targetTable,

          // Request info
          ip_address: req.clientInfo?.ipAddress || req.ip,
          user_agent: req.clientInfo?.userAgent || req.headers['user-agent'],
          request_url: req.originalUrl || req.url,
          request_method: req.method,
          request_params: req.params && Object.keys(req.params).length > 0 ? req.params : null,
          request_query: req.query && Object.keys(req.query).length > 0 ? req.query : null,
          request_body: req.body && Object.keys(req.body).length > 0 ? req.body : null,

          // Response info
          response_status: statusCode,
          status: statusCode < 400 ? 'SUCCESS' : 'FAILED',
          error_message: statusCode >= 400 && parsedData?.error ? parsedData.error : null,

          // Performance
          duration_ms: duration,

          // Context
          organization_id: req.user?.current_org_id || null,
          session_id: req.sessionId || null,
          correlation_id: correlationId,

          // Classification
          severity: determineSeverity(statusCode, action),
          category: options.category || determineCategory(action),
          tags: options.tags || null,

          // Metadata
          metadata: {
            ...options.metadata,
            endpoint: req.route?.path || req.path,
            controller: options.controller || null
          }
        };

        // Log asynchronously (don't block response)
        setImmediate(async () => {
          try {
            await AuditLogService.log(logData);
          } catch (error) {
            console.error('Failed to create audit log:', error);
          }
        });
      }

      // Call original send
      originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Middleware to log data changes (CREATE/UPDATE/DELETE)
 */
export const auditChange = (targetType, findResourceFn, options = {}) => {
  return async (req, res, next) => {
    try {
      const targetId = req.params?.id || req.params?.orgId || req.params?.userId;
      
      // Fetch current state before changes (for UPDATE/DELETE)
      if (targetId && findResourceFn && (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE')) {
        try {
          const currentResource = await findResourceFn(targetId);
          if (currentResource) {
            req.auditBeforeData = currentResource.toJSON ? currentResource.toJSON() : currentResource;
          }
        } catch (error) {
          console.error('Failed to fetch before data:', error);
        }
      }

      // Store original send
      const originalSend = res.send;

      res.send = function(data) {
        const statusCode = res.statusCode;

        // Only log successful changes
        if (statusCode >= 200 && statusCode < 300) {
          setImmediate(async () => {
            try {
              let afterData = null;
              
              // Extract after data from response
              try {
                const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
                afterData = parsedData?.data || parsedData?.user || parsedData?.organization || parsedData;
              } catch (e) {
                // Ignore parse errors
              }

              // Determine action
              let action = options.action;
              if (!action) {
                if (req.method === 'POST') action = `${targetType}_CREATE`;
                else if (req.method === 'PUT' || req.method === 'PATCH') action = `${targetType}_UPDATE`;
                else if (req.method === 'DELETE') action = `${targetType}_DELETE`;
              }

              // Log the change
              await AuditLogService.logDataChange(
                action,
                targetType,
                targetId,
                options.targetTable || inferTargetTable(targetType),
                req.auditBeforeData || null,
                afterData,
                req.user?.user_id,
                {
                  ip_address: req.clientInfo?.ipAddress || req.ip,
                  user_agent: req.clientInfo?.userAgent || req.headers['user-agent'],
                  organization_id: req.user?.current_org_id,
                  correlation_id: req.correlationId
                }
              );
            } catch (error) {
              console.error('Failed to log data change:', error);
            }
          });
        }

        originalSend.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Audit change middleware error:', error);
      next();
    }
  };
};

/**
 * Helper: Infer target table from target type
 */
function inferTargetTable(targetType, path = '') {
  const tableMap = {
    'USER': 'sys_users',
    'COMPANY': 'sys_organizations',
    'MEMBER': 'sys_organization_members',
    'INVITATION': 'invitations',
    'TOKEN': 'sys_refresh_tokens'
  };

  return tableMap[targetType] || null;
}

/**
 * Helper: Determine severity from status code
 */
function determineSeverity(statusCode, action) {
  if (statusCode >= 500) return 'ERROR';
  if (statusCode >= 400) return 'WARNING';
  if (action.includes('DELETE') || action.includes('TRANSFER')) return 'WARNING';
  return 'INFO';
}

/**
 * Helper: Determine category from action
 */
function determineCategory(action) {
  if (action.includes('LOGIN') || action.includes('LOGOUT') || action.includes('PASSWORD')) {
    return 'SECURITY';
  }
  if (action.includes('SYSTEM') || action.includes('DATABASE')) {
    return 'SYSTEM';
  }
  if (action.includes('SUSPICIOUS') || action.includes('FAILED')) {
    return 'SECURITY';
  }
  return 'BUSINESS';
}

/**
 * Middleware to add correlation ID to requests
 */
export const addCorrelationId = (req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || uuidv4();
  res.setHeader('X-Correlation-ID', req.correlationId);
  next();
};

/**
 * Middleware to add session ID
 */
export const addSessionId = (req, res, next) => {
  // Extract session ID from various sources
  req.sessionId = 
    req.headers['x-session-id'] || 
    req.session?.id || 
    req.cookies?.sessionId ||
    null;
  next();
};

export const clientInfoMiddleware = (req, res, next) => {
  req.clientInfo = {
    ipAddress:
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      null,

    userAgent: req.headers['user-agent'] || null,

    platform: req.headers['sec-ch-ua-platform'] || null,
    browser: req.headers['sec-ch-ua'] || null,
  };

  next();
};


export default {
  auditLog,
  auditChange,
  addCorrelationId,
  addSessionId,
  clientInfoMiddleware
};