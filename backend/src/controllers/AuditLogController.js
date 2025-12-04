import AuditLogService from '../services/AuditLogService.js';
import { ResponseHandler } from '../utils/responseHandler.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';

// Helper: แปลง Query Params เป็น Filter Object
const prepareFilters = (query) => {
  const allowedFilters = [
    'user_id', 'user_email', 'action', 'target_type', 'target_id',
    'status', 'severity', 'category', 'organization_id', 'ip_address', 'correlation_id'
  ];

  const filters = {};
  
  // 1. Map basic fields
  allowedFilters.forEach(field => {
    if (query[field]) filters[field] = query[field];
  });

  // 2. Handle Dates
  if (query.start_date) filters.startDate = new Date(query.start_date);
  if (query.end_date) filters.endDate = new Date(query.end_date);

  return filters;
};

export const createAuditLogController = (service = AuditLogService) => {
  
  // GET /api/audit-logs
  const queryAuditLogs = asyncHandler(async (req, res) => {
    const filters = prepareFilters(req.query);
    
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      sortBy: req.query.sort_by || 'created_at',
      sortOrder: req.query.sort_order || 'DESC'
    };

    const result = await service.query(filters, options);
    return ResponseHandler.success(res, result);
  });

  // GET /api/audit-logs/user/:userId
  const getUserActivity = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    // Security Check (ควรย้ายไป Middleware แต่ถ้ายังไม่มี ให้คงไว้ที่นี่)
    if (req.user.user_id !== userId && req.user.role_id !== 1) { 
      throw createError.forbidden('ไม่มีสิทธิ์ดูประวัติของผู้ใช้อื่น');
    }

    const logs = await service.getUserActivity(userId, parseInt(req.query.limit) || 50);
    return ResponseHandler.success(res, { data: logs, total: logs.length });
  });

  // GET /api/audit-logs/me
  const getMyActivity = asyncHandler(async (req, res) => {
    const logs = await service.getUserActivity(req.user.user_id, parseInt(req.query.limit) || 50);
    return ResponseHandler.success(res, { data: logs, total: logs.length });
  });

  // GET /api/audit-logs/recent
  const getRecentActivity = asyncHandler(async (req, res) => {
    const logs = await service.getRecentActivity(parseInt(req.query.limit) || 100);
    return ResponseHandler.success(res, { data: logs, total: logs.length });
  });

  // GET /api/audit-logs/security
  const getSecurityEvents = asyncHandler(async (req, res) => {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 7 * 86400000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    
    const logs = await service.getSecurityEvents(startDate, endDate, parseInt(req.query.limit) || 100);
    return ResponseHandler.success(res, { data: logs, total: logs.length });
  });

  // GET /api/audit-logs/failed
  const getFailedActions = asyncHandler(async (req, res) => {
    const logs = await service.getFailedActions(parseInt(req.query.limit) || 100);
    return ResponseHandler.success(res, { data: logs, total: logs.length });
  });

  // GET /api/audit-logs/suspicious
  const getSuspiciousActivity = asyncHandler(async (req, res) => {
    const result = await service.getSuspiciousActivity(parseInt(req.query.hours) || 24);
    return ResponseHandler.success(res, result);
  });

  // GET /api/audit-logs/stats
  const getStatistics = asyncHandler(async (req, res) => {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 30 * 86400000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();

    const stats = await service.getStatistics(startDate, endDate);
    return ResponseHandler.success(res, stats);
  });

  // GET /api/audit-logs/correlation/:correlationId
  const getCorrelatedActions = asyncHandler(async (req, res) => {
    const result = await service.getCorrelatedActions(req.params.correlationId);
    return ResponseHandler.success(res, result);
  });

  // GET /api/audit-logs/export
  const exportLogs = asyncHandler(async (req, res) => {
    const filters = prepareFilters(req.query);
    const logs = await service.exportLogs(filters);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.json`);
    
    // สำหรับ File Download ส่งเป็น json ตรงๆ หรือ stream จะดีกว่า ResponseHandler
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
    
    return ResponseHandler.success(res, { deleted: result.deleted }, result.message);
  });

  return {
    queryAuditLogs, getUserActivity, getMyActivity, getRecentActivity,
    getSecurityEvents, getFailedActions, getSuspiciousActivity, getStatistics,
    getCorrelatedActions, exportLogs, cleanupLogs
  };
};

const AuditLogController = createAuditLogController();

export const {
    queryAuditLogs, getUserActivity, getMyActivity, getRecentActivity,
    getSecurityEvents, getFailedActions, getSuspiciousActivity, getStatistics,
    getCorrelatedActions, exportLogs, cleanupLogs
} = AuditLogController

export default AuditLogController