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
  allowedFilters.forEach(field => {
    if (query[field]) filters[field] = query[field];
  });

  if (query.start_date) filters.startDate = new Date(query.start_date);
  if (query.end_date) filters.endDate = new Date(query.end_date);

  return filters;
};

export const createAuditLogController = (service = AuditLogService) => {
  
  // GET /api/audit-logs
  const queryAuditLogs = asyncHandler(async (req, res) => {
    const filters = prepareFilters(req.query);
    const logs = await service.queryAuditLogs(filters, req.query); 
    return ResponseHandler.success(res, logs);
  });

  // GET /api/audit-logs/user/:userId
  const getUserActivity = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const isAdmin = req.user.role === 'admin' || req.user.org_role_id === 'admin' || req.user.role_id === 1;
    const isSelf = req.user.user_id === userId;

    if (!isAdmin && !isSelf) {
      throw createError.forbidden('ไม่มีสิทธิ์ดูประวัติของผู้ใช้อื่น');
    }

    const logs = await service.getUserActivity(userId, req.query);
    return ResponseHandler.success(res, { data: logs, total: logs.length });
  });

  // GET /api/audit-logs/me
  const getMyActivity = asyncHandler(async (req, res) => {
    const logs = await service.getMyActivity(req.user.user_id, req.query);
    return ResponseHandler.success(res, { data: logs, total: logs.length });
  });

  // GET /api/audit-logs/recent
  const getRecentActivity = asyncHandler(async (req, res) => {
    const logs = await service.getRecentActivity(req.query);
    return ResponseHandler.success(res, { data: logs, total: logs.length });
  });

  // GET /api/audit-logs/security
  const getSecurityEvents = asyncHandler(async (req, res) => {
    const logs = await service.getSecurityEvents(req.query);
    return ResponseHandler.success(res, { data: logs, total: logs.length });
  });

  // GET /api/audit-logs/failed
  const getFailedActions = asyncHandler(async (req, res) => {
    const logs = await service.getFailedActions(req.query);
    return ResponseHandler.success(res, { data: logs, total: logs.length });
  });

  // GET /api/audit-logs/suspicious
  const getSuspiciousActivity = asyncHandler(async (req, res) => {
    const result = await service.getSuspiciousActivity(req.query);
    return ResponseHandler.success(res, result);
  });

  // GET /api/audit-logs/stats
  const getStatistics = asyncHandler(async (req, res) => {
    const stats = await service.getStatistics(req.query);
    return ResponseHandler.success(res, stats);
  });

  // GET /api/audit-logs/correlation/:correlationId
  const getCorrelatedActions = asyncHandler(async (req, res) => {
    const result = await service.getCorrelatedActions(req.params.correlationId);
    return ResponseHandler.success(res, result);
  });

  // GET /api/audit-logs/export
  const exportLogs = asyncHandler(async (req, res) => {
    const logs = await service.exportLogs(req.query);
    return ResponseHandler.success(res, logs, "Export log data retrieved");
  });

  // POST /api/audit-logs/cleanup
  const cleanupLogs = asyncHandler(async (req, res) => {
    const retentionDays = parseInt(req.body.retention_days) || 90;
    const result = await service.cleanupLogs(retentionDays);
    
    return ResponseHandler.success(res, result, "ล้างข้อมูล Log เก่าสำเร็จ");
  });

  return {
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
};

const AuditLogController = createAuditLogController();

export const {
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
} = AuditLogController;

export default AuditLogController;