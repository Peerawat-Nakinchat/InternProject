// src/routes/auditLogRoutes.js
import express from 'express';
import {
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
} from '../controllers/AuditLogController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { auditLog } from '../middleware/auditLogMiddleware.js';

/**
 * Factory for Audit Log Routes
 * @param {Object} deps - Dependencies injection
 */
export const createAuditLogRoutes = (deps = {}) => {
  const router = express.Router();

  // Inject dependencies or use defaults
  const authMiddleware = deps.authMiddleware || { protect, authorize };
  const auditMiddleware = deps.auditMiddleware || { auditLog };
  const controller = deps.controller || {
    queryAuditLogs, getUserActivity, getMyActivity, getRecentActivity,
    getSecurityEvents, getFailedActions, getSuspiciousActivity,
    getStatistics, getCorrelatedActions, exportLogs, cleanupLogs
  };

  // Global protection
  router.use(authMiddleware.protect);

  // --- USER ROUTES ---
  /**
 * @swagger
 * /audit-logs/me:
 *   get:
 *     summary: Get my activity history
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: User activity logs
 */

  router.get(
    '/me',
    auditMiddleware.auditLog("VIEW_MY_ACTIVITY", "AUDIT_LOG", { severity: "LOW", category: "AUDIT" }),
    controller.getMyActivity
  );

  /**
 * @swagger
 * /audit-logs/user/{userId}:
 *   get:
 *     summary: Get user activity history (Admin or self only)
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User activity logs
 */
  router.get(
    '/user/:userId',
    auditMiddleware.auditLog("VIEW_USER_LOGS", "AUDIT_LOG", { severity: "MEDIUM", category: "AUDIT" }),
    controller.getUserActivity
  );

  // --- ADMIN ROUTES ---
  /**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: Query audit logs with filters (Admin only)
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: target_type
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Audit logs with pagination
 */

  router.get(
    '/',
    authMiddleware.authorize([1, 2]),
    auditMiddleware.auditLog("VIEW_ALL_LOGS", "AUDIT_LOG", { severity: "MEDIUM", category: "AUDIT" }),
    controller.queryAuditLogs
  );

  /**
 * @swagger
 * /audit-logs/recent:
 *   get:
 *     summary: Get recent activity (Admin only)
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Recent audit logs
 */
  router.get(
    '/recent',
    authMiddleware.authorize([1, 2]),
    auditMiddleware.auditLog("VIEW_RECENT_LOGS", "AUDIT_LOG", { severity: "LOW", category: "AUDIT" }),
    controller.getRecentActivity
  );

  /**
 * @swagger
 * /audit-logs/security:
 *   get:
 *     summary: Get security events (Admin only)
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Security event logs
 */
  router.get(
    '/security',
    authMiddleware.authorize([1, 2]),
    auditMiddleware.auditLog("VIEW_SECURITY_LOGS", "AUDIT_LOG", { severity: "MEDIUM", category: "SECURITY" }),
    controller.getSecurityEvents
  );

/**
 * @swagger
 * /audit-logs/failed:
 *   get:
 *     summary: Get failed actions (Admin only)
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Failed action logs
 */
  router.get(
    '/failed',
    authMiddleware.authorize([1, 2]),
    auditMiddleware.auditLog("VIEW_FAILED_LOGS", "AUDIT_LOG", { severity: "MEDIUM", category: "SECURITY" }),
    controller.getFailedActions
  );

/**
 * @swagger
 * /audit-logs/suspicious:
 *   get:
 *     summary: Get suspicious activity (Admin only)
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           default: 24
 *     responses:
 *       200:
 *         description: Suspicious activity logs
 */
  router.get(
    '/suspicious',
    authMiddleware.authorize([1, 2]),
    auditMiddleware.auditLog("VIEW_SUSPICIOUS_LOGS", "AUDIT_LOG", { severity: "HIGH", category: "SECURITY" }),
    controller.getSuspiciousActivity
  );

 /**
 * @swagger
 * /audit-logs/stats:
 *   get:
 *     summary: Get audit statistics (Admin only)
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Audit statistics
 */
  router.get(
    '/stats',
    authMiddleware.authorize([1, 2]),
    auditMiddleware.auditLog("VIEW_LOG_STATS", "AUDIT_LOG", { severity: "LOW", category: "AUDIT" }),
    controller.getStatistics
  );

/**
 * @swagger
 * /audit-logs/export:
 *   get:
 *     summary: Export audit logs (Admin only)
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: JSON file download
 */
  router.get(
    '/export',
    authMiddleware.authorize([1, 2]),
    auditMiddleware.auditLog("EXPORT_LOGS", "AUDIT_LOG", { severity: "HIGH", category: "SECURITY" }),
    controller.exportLogs
  );

/**
 * @swagger
 * /audit-logs/correlation/{correlationId}:
 *   get:
 *     summary: Get correlated actions (Admin only)
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: correlationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Correlated audit logs
 */
  router.get(
    '/correlation/:correlationId',
    authMiddleware.authorize([1, 2]),
    auditMiddleware.auditLog("VIEW_CORRELATED_LOGS", "AUDIT_LOG", { severity: "LOW", category: "AUDIT" }),
    controller.getCorrelatedActions
  );

/**
 * @swagger
 * /audit-logs/cleanup:
 *   post:
 *     summary: Cleanup old audit logs (Admin only)
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               retention_days:
 *                 type: integer
 *                 default: 90
 *     responses:
 *       200:
 *         description: Cleanup completed
 */
  router.post(
    '/cleanup',
    authMiddleware.authorize([1]),
    auditMiddleware.auditLog("CLEANUP_LOGS", "AUDIT_LOG", { severity: "CRITICAL", category: "SECURITY" }),
    controller.cleanupLogs
  );

  return router;
};

// Default Export
export default createAuditLogRoutes();