// src/controllers/AuditLogController.js
import AuditLogService from '../services/AuditLogService.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';

export const createAuditLogController = (service = AuditLogService) => {
  
  // GET /api/audit-logs
  const queryAuditLogs = asyncHandler(async (req, res) => {
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
      if (filters[key] == null) delete filters[key];
    });

    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      sortBy: req.query.sort_by || 'created_at',
      sortOrder: req.query.sort_order || 'DESC'
    };

    const result = await service.query(filters, options);
    res.json({ success: true, ...result });
  });

  // GET /api/audit-logs/user/:userId
  const getUserActivity = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    // Check permission
    if (req.user.user_id !== userId && req.user.role_id !== 1) {
      throw createError.forbidden('ไม่มีสิทธิ์ดูประวัติของผู้ใช้อื่น');
    }

    const logs = await service.getUserActivity(userId, limit);
    res.json({ success: true, data: logs, total: logs.length });
  });

  // GET /api/audit-logs/me
  const getMyActivity = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await service.getUserActivity(req.user.user_id, limit);
    res.json({ success: true, data: logs, total: logs.length });
  });

  // GET /api/audit-logs/recent
  const getRecentActivity = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const logs = await service.getRecentActivity(limit);
    res.json({ success: true, data: logs, total: logs.length });
  });

  // GET /api/audit-logs/security
  const getSecurityEvents = asyncHandler(async (req, res) => {
    const startDate = req.query.start_date 
      ? new Date(req.query.start_date) 
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const endDate = req.query.end_date 
      ? new Date(req.query.end_date) 
      : new Date();

    const limit = parseInt(req.query.limit) || 100;
    const logs = await service.getSecurityEvents(startDate, endDate, limit);
    res.json({ success: true, data: logs, total: logs.length });
  });

  // GET /api/audit-logs/failed
  const getFailedActions = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const logs = await service.getFailedActions(limit);
    res.json({ success: true, data: logs, total: logs.length });
  });

  // GET /api/audit-logs/suspicious
  const getSuspiciousActivity = asyncHandler(async (req, res) => {
    const hours = parseInt(req.query.hours) || 24;
    const result = await service.getSuspiciousActivity(hours);
    res.json({ success: true, ...result });
  });

  // GET /api/audit-logs/stats
  const getStatistics = asyncHandler(async (req, res) => {
    const startDate = req.query.start_date 
      ? new Date(req.query.start_date) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const endDate = req.query.end_date 
      ? new Date(req.query.end_date) 
      : new Date();

    const stats = await service.getStatistics(startDate, endDate);
    res.json({ success: true, data: stats });
  });

  // GET /api/audit-logs/correlation/:correlationId
  const getCorrelatedActions = asyncHandler(async (req, res) => {
    const { correlationId } = req.params;
    const result = await service.getCorrelatedActions(correlationId);
    res.json({ success: true, ...result });
  });

  // GET /api/audit-logs/export
  const exportLogs = asyncHandler(async (req, res) => {
    const filters = {
      startDate: req.query.start_date ? new Date(req.query.start_date) : null,
      endDate: req.query.end_date ? new Date(req.query.end_date) : null,
      user_id: req.query.user_id,
      action: req.query.action,
      organization_id: req.query.organization_id
    };

    Object.keys(filters).forEach(key => {
      if (!filters[key]) delete filters[key];
    });

    const logs = await service.exportLogs(filters);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.json`);
    
    res.json({
      success: true,
      exported_at: new Date(),
      total: logs.length,
      logs
    });
  });

  // POST /api/audit-logs/cleanup
  const cleanupLogs = asyncHandler(async (req, res) => {
    const retentionDays = parseInt(req.body.retention_days) || 90;
    const result = await service.cleanup(retentionDays);

    res.json({
      success: true,
      message: `ลบ audit logs ที่เก่ากว่า ${retentionDays} วัน สำเร็จ`,
      deleted: result.deleted
    });
  });

  return {
    queryAuditLogs, getUserActivity, getMyActivity, getRecentActivity,
    getSecurityEvents, getFailedActions, getSuspiciousActivity, getStatistics,
    getCorrelatedActions, exportLogs, cleanupLogs
  };
};

const defaultController = createAuditLogController();

export const {
  queryAuditLogs, getUserActivity, getMyActivity, getRecentActivity,
  getSecurityEvents, getFailedActions, getSuspiciousActivity, getStatistics,
  getCorrelatedActions, exportLogs, cleanupLogs
} = defaultController;

export default defaultController;