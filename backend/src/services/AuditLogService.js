// src/services/AuditLogService.js
import { AuditLogModel } from '../models/AuditLogModel.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Factory for AuditLogService
 * @param {Object} deps - Dependencies injection
 */
export const createAuditLogService = (deps = {}) => {
  const Model = deps.model || AuditLogModel;
  const generateUuid = deps.uuid || uuidv4;

  // --- Helpers ---

  const sanitizeData = (data) => {
    if (!data || typeof data !== 'object') return data;

    const sensitiveFields = [
      'password', 'password_hash', 'oldPassword', 'newPassword',
      'token', 'refreshToken', 'accessToken', 'reset_token',
      'credit_card', 'cvv', 'ssn', 'api_key', 'secret'
    ];

    const sanitized = Array.isArray(data) ? [] : {};

    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          sanitized[key] = '***REDACTED***';
        } else if (typeof data[key] === 'object' && data[key] !== null) {
          sanitized[key] = sanitizeData(data[key]);
        } else {
          sanitized[key] = data[key];
        }
      }
    }
    return sanitized;
  };

  const calculateChanges = (oldData, newData) => {
    if (!oldData || !newData) return null;
    const changes = {};
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of allKeys) {
      // Simple equality check (can be enhanced with deep equality if needed)
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changes[key] = {
          old: oldData[key],
          new: newData[key]
        };
      }
    }
    return Object.keys(changes).length > 0 ? changes : null;
  };

  // --- Core Methods ---

  const log = async (logData) => {
    try {
      if (logData.before_data) logData.before_data = sanitizeData(logData.before_data);
      if (logData.after_data) logData.after_data = sanitizeData(logData.after_data);
      if (logData.request_body) logData.request_body = sanitizeData(logData.request_body);

      if (logData.before_data && logData.after_data && !logData.changes) {
        logData.changes = calculateChanges(logData.before_data, logData.after_data);
      }

      logData.status = logData.status || 'SUCCESS';
      logData.severity = logData.severity || 'INFO';
      logData.created_at = logData.created_at || new Date();

      if (!logData.correlation_id && logData.generateCorrelationId) {
        logData.correlation_id = generateUuid();
      }

      const logEntry = await Model.create(logData);
      return logEntry;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      return null;
    }
  };

  const logAuth = async (action, userId, userEmail, userName, ipAddress, userAgent, additionalData = {}) => {
    return await log({
      user_id: userId,
      user_email: userEmail,
      user_name: userName,
      action,
      target_type: 'USER',
      target_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      category: 'SECURITY',
      severity: action.includes('FAILED') ? 'WARNING' : 'INFO',
      ...additionalData
    });
  };

  const logDataChange = async (action, targetType, targetId, targetTable, beforeData, afterData, userId, metadata = {}) => {
    return await log({
      user_id: userId,
      action,
      target_type: targetType,
      target_id: targetId,
      target_table: targetTable,
      before_data: beforeData,
      after_data: afterData,
      category: 'BUSINESS',
      severity: 'INFO',
      ...metadata
    });
  };

  const logSecurity = async (action, description, userId, ipAddress, severity = 'WARNING', metadata = {}) => {
    return await log({
      user_id: userId,
      action,
      action_description: description,
      ip_address: ipAddress,
      category: 'SECURITY',
      severity,
      tags: ['security', 'monitoring'],
      ...metadata
    });
  };

  const logSystem = async (action, description, severity = 'INFO', metadata = {}) => {
    return await log({
      action,
      action_description: description,
      target_type: 'SYSTEM',
      category: 'SYSTEM',
      severity,
      ...metadata
    });
  };

  // --- Read Methods ---

  const query = async (filters = {}, options = {}) => {
    return await Model.query(filters, options);
  };

  const getUserActivity = async (userId, limit = 50) => {
    return await Model.findByUser(userId, limit);
  };

  const getRecentActivity = async (limit = 100) => {
    return await Model.findRecent(limit);
  };

  const getSecurityEvents = async (startDate, endDate, limit = 100) => {
    return await Model.findSecurityEvents(startDate, endDate, limit);
  };

  const getFailedActions = async (limit = 100) => {
    return await Model.findFailedActions(limit);
  };

  const getStatistics = async (startDate, endDate) => {
    return await Model.getStats(startDate, endDate);
  };

  const cleanup = async (retentionDays = 90) => {
    try {
      const deleted = await Model.deleteOldLogs(retentionDays);
      await logSystem(
        'DATABASE_CLEANUP',
        `Cleaned up ${deleted} audit logs older than ${retentionDays} days`,
        'INFO',
        { deleted_count: deleted, retention_days: retentionDays }
      );
      return { deleted };
    } catch (error) {
      console.error('Audit log cleanup error:', error);
      throw error;
    }
  };

  const exportLogs = async (filters = {}, options = {}) => {
    const result = await query(filters, { ...options, limit: 10000 });
    return result.logs;
  };

  const getSuspiciousActivity = async (hours = 24) => {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    return await query({
      actions: ['FAILED_LOGIN', 'SUSPICIOUS_ACTIVITY'],
      startDate,
      severity: 'WARNING'
    }, {
      limit: 100,
      sortBy: 'created_at',
      sortOrder: 'DESC'
    });
  };

  const trackSession = async (sessionId, userId) => {
    return await query({
      session_id: sessionId,
      user_id: userId
    }, {
      sortBy: 'created_at',
      sortOrder: 'ASC'
    });
  };

  const getCorrelatedActions = async (correlationId) => {
    return await query({
      correlation_id: correlationId
    }, {
      sortBy: 'created_at',
      sortOrder: 'ASC'
    });
  };

  return {
    sanitizeData,
    calculateChanges,
    log,
    logAuth,
    logDataChange,
    logSecurity,
    logSystem,
    query,
    getUserActivity,
    getRecentActivity,
    getSecurityEvents,
    getFailedActions,
    getStatistics,
    cleanup,
    exportLogs,
    getSuspiciousActivity,
    trackSession,
    getCorrelatedActions
  };
};

// Default Instance
const defaultInstance = createAuditLogService();
export default defaultInstance;