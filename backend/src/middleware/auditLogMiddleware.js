// src/middleware/auditLogMiddleware.js
import AuditLogService from '../services/AuditLogService.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

// --- Helper Functions (Pure Logic) ---
export function inferTargetTable(targetType) {
  const tableMap = {
    'USER': 'sys_users',
    'COMPANY': 'sys_organizations',
    'MEMBER': 'sys_organization_members',
    'INVITATION': 'sys_invitations',
    'TOKEN': 'sys_refresh_tokens'
  };
  return tableMap[targetType] || null;
}

export function determineSeverity(statusCode, action) {
  if (statusCode >= 500) return 'ERROR';
  if (statusCode >= 400) return 'WARNING';
  if (action && (action.includes('DELETE') || action.includes('TRANSFER'))) return 'WARNING';
  return 'INFO';
}

export function determineCategory(action) {
  if (!action) return 'BUSINESS';
  if (action.includes('LOGIN') || action.includes('LOGOUT') || action.includes('PASSWORD')) return 'SECURITY';
  if (action.includes('SYSTEM') || action.includes('DATABASE')) return 'SYSTEM';
  if (action.includes('SUSPICIOUS') || action.includes('FAILED')) return 'SECURITY';
  return 'BUSINESS';
}

/**
 * Factory Function for AuditLog Middleware
 * @param {Object} deps - Dependencies injection
 */
export const createAuditLogMiddleware = (deps = {}) => {
  const auditService = deps.AuditLogService || AuditLogService;
  const generateUuid = deps.uuid || uuidv4;

  // 1. addCorrelationId
  const addCorrelationId = (req, res, next) => {
    req.correlationId = req.headers['x-correlation-id'] || generateUuid();
    res.setHeader('X-Correlation-ID', req.correlationId);
    next();
  };

  // 2. addSessionId
  const addSessionId = (req, res, next) => {
    req.sessionId = req.headers['x-session-id'] || req.session?.id || req.cookies?.sessionId || null;
    next();
  };

  // 3. clientInfoMiddleware
  const clientInfoMiddleware = (req, res, next) => {
    req.clientInfo = {
      ipAddress: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection?.remoteAddress || req.ip || null,
      userAgent: req.headers['user-agent'] || null,
      platform: req.headers['sec-ch-ua-platform'] || null,
      browser: req.headers['sec-ch-ua'] || null,
    };
    next();
  };

  // 4. auditLog (Main Logic)
  const auditLog = (action, targetType = null, options = {}) => {
    return async (req, res, next) => {
      const startTime = Date.now();
      const correlationId = req.correlationId || generateUuid();
      req.correlationId = correlationId;

      const originalSend = res.send;

      res.send = function(data) {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        const shouldLog = options.logAll || 
          statusCode < 400 || 
          [401, 403, 404].includes(statusCode) ||
          options.forceLog;

        if (shouldLog) {
          let parsedData = null;
          try {
            parsedData = typeof data === 'string' ? JSON.parse(data) : data;
          } catch (e) { /* Ignore */ }

          const targetId = req.params?.id || req.params?.orgId || req.params?.userId || parsedData?.data?.id || parsedData?.user?.user_id || null;
          const targetTable = options.targetTable || inferTargetTable(targetType);

          const logData = {
            user_id: req.user?.user_id || parsedData?.user?.user_id || null,
            user_email: req.user?.email || null,
            action,
            target_type: targetType,
            target_id: targetId,
            target_table: targetTable,
            ip_address: req.clientInfo?.ipAddress || req.ip,
            user_agent: req.clientInfo?.userAgent || req.headers['user-agent'],
            request_url: req.originalUrl || req.url,
            request_method: req.method,
            response_status: statusCode,
            status: statusCode < 400 ? 'SUCCESS' : 'FAILED',
            error_message: statusCode >= 400 && parsedData?.error ? parsedData.error : null,
            duration_ms: duration,
            correlation_id: correlationId,
            severity: determineSeverity(statusCode, action),
            category: options.category || determineCategory(action),
            metadata: {
                ...options.metadata,
                endpoint: req.route?.path || req.path,
                controller: options.controller || null
            }
          };

          setImmediate(async () => {
            try {
              await auditService.log(logData);
            } catch (error) {
              logger.error('Failed to create audit log:', error);
            }
          });
        }
        
        return originalSend.call(this, data);
      };

      next();
    };
  };

  // 5. auditChange
  const auditChange = (targetType, findResourceFn, options = {}) => {
    return async (req, res, next) => {
      try {
        const targetId = req.params?.id || req.params?.orgId || req.params?.userId;
        
        if (targetId && findResourceFn && ['PUT', 'PATCH', 'DELETE'].includes(req.method)) {
          try {
            const current = await findResourceFn(targetId);
            if (current) req.auditBeforeData = current.toJSON ? current.toJSON() : current;
          } catch (e) { logger.error('Failed to fetch before data:', e); }
        }

        const originalSend = res.send;

        res.send = function(data) {
          const statusCode = res.statusCode;

          if (statusCode >= 200 && statusCode < 300) {
            setImmediate(async () => {
              try {
                let parsedData = null;
                try { parsedData = typeof data === 'string' ? JSON.parse(data) : data; } catch (e) {}
                
                const afterData = parsedData?.data || parsedData?.user || parsedData;
                let action = options.action || (req.method === 'POST' ? `${targetType}_CREATE` : req.method === 'DELETE' ? `${targetType}_DELETE` : `${targetType}_UPDATE`);

                await auditService.logDataChange(
                  action, targetType, targetId, 
                  options.targetTable || inferTargetTable(targetType),
                  req.auditBeforeData || null, afterData,
                  req.user?.user_id,
                  { ip_address: req.clientInfo?.ipAddress, correlation_id: req.correlationId }
                );
              } catch (e) { logger.error('Failed to log change:', e); }
            });
          }
          return originalSend.call(this, data);
        };
        next();
      } catch (err) {
        logger.error('Audit change middleware error:', err);
        next();
      }
    };
  };

  return { auditLog, auditChange, addCorrelationId, addSessionId, clientInfoMiddleware };
};

// Default Export for Backward Compatibility
const defaultInstance = createAuditLogMiddleware();
export const auditLog = defaultInstance.auditLog;
export const auditChange = defaultInstance.auditChange;
export const addCorrelationId = defaultInstance.addCorrelationId;
export const addSessionId = defaultInstance.addSessionId;
export const clientInfoMiddleware = defaultInstance.clientInfoMiddleware;
export default defaultInstance;