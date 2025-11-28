// src/services/AuditLogService.js
import { AuditLogModel } from '../models/AuditLogModel.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * AuditLogService - Business Logic for Audit Logging
 */
class AuditLogService {
  /**
   * Sanitize sensitive data before logging
   */
  sanitizeData(data) {
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
      'ssn',
      'api_key',
      'secret'
    ];

    const sanitized = Array.isArray(data) ? [] : {};

    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          sanitized[key] = '***REDACTED***';
        } else if (typeof data[key] === 'object' && data[key] !== null) {
          sanitized[key] = this.sanitizeData(data[key]);
        } else {
          sanitized[key] = data[key];
        }
      }
    }

    return sanitized;
  }

  /**
   * Calculate diff between old and new data
   */
  calculateChanges(oldData, newData) {
    if (!oldData || !newData) return null;

    const changes = {};
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of allKeys) {
      if (oldData[key] !== newData[key]) {
        changes[key] = {
          old: oldData[key],
          new: newData[key]
        };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  /**
   * Log an action
   */
  async log(logData) {
    try {
      // Sanitize sensitive data
      if (logData.before_data) {
        logData.before_data = this.sanitizeData(logData.before_data);
      }
      if (logData.after_data) {
        logData.after_data = this.sanitizeData(logData.after_data);
      }
      if (logData.request_body) {
        logData.request_body = this.sanitizeData(logData.request_body);
      }

      // Calculate changes if both before and after data exist
      if (logData.before_data && logData.after_data && !logData.changes) {
        logData.changes = this.calculateChanges(
          logData.before_data,
          logData.after_data
        );
      }

      // Set default values
      logData.status = logData.status || 'SUCCESS';
      logData.severity = logData.severity || 'INFO';
      logData.created_at = logData.created_at || new Date();

      // Generate correlation ID if not provided
      if (!logData.correlation_id && logData.generateCorrelationId) {
        logData.correlation_id = uuidv4();
      }

      const log = await AuditLogModel.create(logData);
      return log;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - logging should never break the app
      return null;
    }
  }

  /**
   * Log authentication events
   */
  async logAuth(action, userId, userEmail, userName, ipAddress, userAgent, additionalData = {}) {
    return await this.log({
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
  }

  /**
   * Log data changes (CREATE/UPDATE/DELETE)
   */
  async logDataChange(action, targetType, targetId, targetTable, beforeData, afterData, userId, metadata = {}) {
    return await this.log({
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
  }

  /**
   * Log security events
   */
  async logSecurity(action, description, userId, ipAddress, severity = 'WARNING', metadata = {}) {
    return await this.log({
      user_id: userId,
      action,
      action_description: description,
      ip_address: ipAddress,
      category: 'SECURITY',
      severity,
      tags: ['security', 'monitoring'],
      ...metadata
    });
  }

  /**
   * Log system events
   */
  async logSystem(action, description, severity = 'INFO', metadata = {}) {
    return await this.log({
      action,
      action_description: description,
      target_type: 'SYSTEM',
      category: 'SYSTEM',
      severity,
      ...metadata
    });
  }

  /**
   * Query audit logs with filters
   */
  async query(filters = {}, options = {}) {
    return await AuditLogModel.query(filters, options);
  }

  /**
   * Get user activity history
   */
  async getUserActivity(userId, limit = 50) {
    return await AuditLogModel.findByUser(userId, limit);
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(limit = 100) {
    return await AuditLogModel.findRecent(limit);
  }

  /**
   * Get security events in date range
   */
  async getSecurityEvents(startDate, endDate, limit = 100) {
    return await AuditLogModel.findSecurityEvents(startDate, endDate, limit);
  }

  /**
   * Get failed actions
   */
  async getFailedActions(limit = 100) {
    return await AuditLogModel.findFailedActions(limit);
  }

  /**
   * Get audit statistics
   */
  async getStatistics(startDate, endDate) {
    return await AuditLogModel.getStats(startDate, endDate);
  }

  /**
   * Cleanup old logs based on retention policy
   */
  async cleanup(retentionDays = 90) {
    try {
      const deleted = await AuditLogModel.deleteOldLogs(retentionDays);
      
      await this.logSystem(
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
  }

  /**
   * Export logs to JSON
   */
  async exportLogs(filters = {}, options = {}) {
    const result = await this.query(filters, { ...options, limit: 10000 });
    return result.logs;
  }

  /**
   * Get suspicious activity
   */
  async getSuspiciousActivity(hours = 24) {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return await AuditLogModel.query({
      actions: ['FAILED_LOGIN', 'SUSPICIOUS_ACTIVITY'],
      startDate,
      severity: 'WARNING'
    }, {
      limit: 100,
      sortBy: 'created_at',
      sortOrder: 'DESC'
    });
  }

  /**
   * Track user session activity
   */
  async trackSession(sessionId, userId) {
    return await AuditLogModel.query({
      session_id: sessionId,
      user_id: userId
    }, {
      sortBy: 'created_at',
      sortOrder: 'ASC'
    });
  }

  /**
   * Get correlated actions
   */
  async getCorrelatedActions(correlationId) {
    return await AuditLogModel.query({
      correlation_id: correlationId
    }, {
      sortBy: 'created_at',
      sortOrder: 'ASC'
    });
  }
}

export default new AuditLogService();