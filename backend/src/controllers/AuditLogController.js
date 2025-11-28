// src/controllers/AuditLogController.js
import AuditLogService from '../services/AuditLogService.js';

/**
 * Query audit logs with filters
 * GET /api/audit-logs
 */
export const queryAuditLogs = async (req, res) => {
  try {
    const filters = {
      user_id: req.query.user_id,
      user_email: req.query.user_email,
      action: req.query.action,
      target_type: req.query.target_type,
      target_id: req.query.target_id,
      status: req.query.status,
      severity: req.query.severity,
      category: req.query.category,
      organization_id: req.query.organization_id,
      ip_address: req.query.ip_address,
      startDate: req.query.start_date ? new Date(req.query.start_date) : null,
      endDate: req.query.end_date ? new Date(req.query.end_date) : null,
      correlation_id: req.query.correlation_id
    };

    // Remove null/undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key] === null || filters[key] === undefined) {
        delete filters[key];
      }
    });

    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      sortBy: req.query.sort_by || 'created_at',
      sortOrder: req.query.sort_order || 'DESC'
    };

    const result = await AuditLogService.query(filters, options);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Query audit logs error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get user activity history
 * GET /api/audit-logs/user/:userId
 */
export const getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    // Check permission: users can only view their own logs unless admin
    if (req.user.user_id !== userId && req.user.role_id !== 1) {
      return res.status(403).json({
        success: false,
        error: 'ไม่มีสิทธิ์ดูประวัติของผู้ใช้อื่น'
      });
    }

    const logs = await AuditLogService.getUserActivity(userId, limit);

    res.json({
      success: true,
      data: logs,
      total: logs.length
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get my activity
 * GET /api/audit-logs/me
 */
export const getMyActivity = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await AuditLogService.getUserActivity(req.user.user_id, limit);

    res.json({
      success: true,
      data: logs,
      total: logs.length
    });
  } catch (error) {
    console.error('Get my activity error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get recent activity
 * GET /api/audit-logs/recent
 */
export const getRecentActivity = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = await AuditLogService.getRecentActivity(limit);

    res.json({
      success: true,
      data: logs,
      total: logs.length
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get security events
 * GET /api/audit-logs/security
 */
export const getSecurityEvents = async (req, res) => {
  try {
    const startDate = req.query.start_date 
      ? new Date(req.query.start_date) 
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
    
    const endDate = req.query.end_date 
      ? new Date(req.query.end_date) 
      : new Date();

    const limit = parseInt(req.query.limit) || 100;

    const logs = await AuditLogService.getSecurityEvents(startDate, endDate, limit);

    res.json({
      success: true,
      data: logs,
      total: logs.length
    });
  } catch (error) {
    console.error('Get security events error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get failed actions
 * GET /api/audit-logs/failed
 */
export const getFailedActions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = await AuditLogService.getFailedActions(limit);

    res.json({
      success: true,
      data: logs,
      total: logs.length
    });
  } catch (error) {
    console.error('Get failed actions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get suspicious activity
 * GET /api/audit-logs/suspicious
 */
export const getSuspiciousActivity = async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const result = await AuditLogService.getSuspiciousActivity(hours);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Get suspicious activity error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get audit statistics
 * GET /api/audit-logs/stats
 */
export const getStatistics = async (req, res) => {
  try {
    const startDate = req.query.start_date 
      ? new Date(req.query.start_date) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    
    const endDate = req.query.end_date 
      ? new Date(req.query.end_date) 
      : new Date();

    const stats = await AuditLogService.getStatistics(startDate, endDate);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get correlated actions
 * GET /api/audit-logs/correlation/:correlationId
 */
export const getCorrelatedActions = async (req, res) => {
  try {
    const { correlationId } = req.params;
    const result = await AuditLogService.getCorrelatedActions(correlationId);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Get correlated actions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Export audit logs
 * GET /api/audit-logs/export
 */
export const exportLogs = async (req, res) => {
  try {
    const filters = {
      startDate: req.query.start_date ? new Date(req.query.start_date) : null,
      endDate: req.query.end_date ? new Date(req.query.end_date) : null,
      user_id: req.query.user_id,
      action: req.query.action,
      organization_id: req.query.organization_id
    };

    // Remove null values
    Object.keys(filters).forEach(key => {
      if (!filters[key]) delete filters[key];
    });

    const logs = await AuditLogService.exportLogs(filters);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.json`);
    
    res.json({
      success: true,
      exported_at: new Date(),
      total: logs.length,
      logs
    });
  } catch (error) {
    console.error('Export logs error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Cleanup old logs (Admin only)
 * POST /api/audit-logs/cleanup
 */
export const cleanupLogs = async (req, res) => {
  try {
    const retentionDays = parseInt(req.body.retention_days) || 90;
    
    const result = await AuditLogService.cleanup(retentionDays);

    res.json({
      success: true,
      message: `ลบ audit logs ที่เก่ากว่า ${retentionDays} วัน สำเร็จ`,
      deleted: result.deleted
    });
  } catch (error) {
    console.error('Cleanup logs error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export default {
  queryAuditLogs,
  getUserActivity,
  getMyActivity,
  getRecentActivity,
  getSecurityEvents,
  getFailedActions,
  getSuspiciousActivity,
  getStatistics,
  getCorrelatedActions,
  exportLogs,
  cleanupLogs
};