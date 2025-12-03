// src/services/AuditLogService.js
import { AuditLogModel } from '../models/AuditLogModel.js';
import { v4 as uuidv4 } from 'uuid';
import { createError } from "../middleware/errorHandler.js"; // ✅ Import ไว้ก่อน

export const createAuditLogService = (deps = {}) => {
  const Model = deps.model || AuditLogModel;
  const generateUuid = deps.uuid || uuidv4;

  const sanitizeData = (data) => {
    if (!data || typeof data !== 'object') return data;
    const sensitiveFields = ['password', 'password_hash', 'token', 'refreshToken', 'accessToken', 'credit_card'];
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
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changes[key] = { old: oldData[key], new: newData[key] };
      }
    }
    return Object.keys(changes).length > 0 ? changes : null;
  };

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
      if (!logData.correlation_id && logData.generateCorrelationId) logData.correlation_id = generateUuid();

      return await Model.create(logData);
    } catch (error) {
      console.error('Failed to create audit log:', error);
      return null; // Audit log fail should not crash the app
    }
  };

  // ... (Wrapper functions like logAuth, logSecurity remain mostly the same) ...
  const logAuth = async (action, userId, userEmail, userName, ipAddress, userAgent, additionalData = {}) => {
    return await log({ user_id: userId, user_email: userEmail, user_name: userName, action, target_type: 'USER', target_id: userId, ip_address: ipAddress, user_agent: userAgent, category: 'SECURITY', severity: action.includes('FAILED') ? 'WARNING' : 'INFO', ...additionalData });
  };

  const logDataChange = async (action, targetType, targetId, targetTable, beforeData, afterData, userId, metadata = {}) => {
    return await log({ user_id: userId, action, target_type: targetType, target_id: targetId, target_table: targetTable, before_data: beforeData, after_data: afterData, category: 'BUSINESS', severity: 'INFO', ...metadata });
  };

  const logSecurity = async (action, description, userId, ipAddress, severity = 'WARNING', metadata = {}) => {
    return await log({ user_id: userId, action, action_description: description, ip_address: ipAddress, category: 'SECURITY', severity, tags: ['security', 'monitoring'], ...metadata });
  };

  const logSystem = async (action, description, severity = 'INFO', metadata = {}) => {
    return await log({ action, action_description: description, target_type: 'SYSTEM', category: 'SYSTEM', severity, ...metadata });
  };

  // ... Read methods ...
  const cleanup = async (retentionDays = 90) => {
    try {
      const deleted = await Model.deleteOldLogs(retentionDays);
      await logSystem('DATABASE_CLEANUP', `Cleaned up ${deleted} logs`, 'INFO', { deleted_count: deleted });
      return { deleted };
    } catch (error) {
      console.error('Audit log cleanup error:', error);
      throw error; // Cleanup failing IS an issue we should know about
    }
  };

  return { sanitizeData, calculateChanges, log, logAuth, logDataChange, logSecurity, logSystem, query: Model.query, getUserActivity: Model.findByUser, getRecentActivity: Model.findRecent, getSecurityEvents: Model.findSecurityEvents, getFailedActions: Model.findFailedActions, getStatistics: Model.getStats, cleanup, exportLogs: async (f, o) => (await Model.query(f, {...o, limit: 10000})).logs, getSuspiciousActivity: async(h) => Model.query({actions:['FAILED_LOGIN'], startDate: new Date(Date.now()-h*3600000), severity:'WARNING'},{limit:100}), trackSession: async(s,u) => Model.query({session_id:s, user_id:u},{sortBy:'created_at'}), getCorrelatedActions: async(c) => Model.query({correlation_id:c},{sortBy:'created_at'}) };
};

const defaultInstance = createAuditLogService();
export default defaultInstance;