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

const router = express.Router();

// All routes require authentication
router.use(protect);

// ==================== USER ROUTES ====================

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
  auditLog("VIEW_MY_ACTIVITY", "AUDIT_LOG", { severity: "LOW", category: "AUDIT" }),
  getMyActivity
);

// ==================== ADMIN ROUTES ====================
// These routes require ADMIN role (role_id = 1 or 2)

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
  authorize([1, 2]),
  auditLog("VIEW_ALL_LOGS", "AUDIT_LOG", { severity: "MEDIUM", category: "AUDIT" }),
  queryAuditLogs
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
  authorize([1, 2]),
  auditLog("VIEW_RECENT_LOGS", "AUDIT_LOG", { severity: "LOW", category: "AUDIT" }),
  getRecentActivity
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
  authorize([1, 2]),
  auditLog("VIEW_SECURITY_LOGS", "AUDIT_LOG", { severity: "MEDIUM", category: "SECURITY" }),
  getSecurityEvents
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
  authorize([1, 2]),
  auditLog("VIEW_FAILED_LOGS", "AUDIT_LOG", { severity: "MEDIUM", category: "SECURITY" }),
  getFailedActions
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
  authorize([1, 2]),
  auditLog("VIEW_SUSPICIOUS_LOGS", "AUDIT_LOG", { severity: "HIGH", category: "SECURITY" }),
  getSuspiciousActivity
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
  authorize([1, 2]),
  auditLog("VIEW_LOG_STATS", "AUDIT_LOG", { severity: "LOW", category: "AUDIT" }),
  getStatistics
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
  authorize([1, 2]),
  auditLog("EXPORT_LOGS", "AUDIT_LOG", { severity: "HIGH", category: "SECURITY" }),
  exportLogs
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
  auditLog("VIEW_USER_LOGS", "AUDIT_LOG", { severity: "MEDIUM", category: "AUDIT" }),
  getUserActivity
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
  authorize([1, 2]),
  auditLog("VIEW_CORRELATED_LOGS", "AUDIT_LOG", { severity: "LOW", category: "AUDIT" }),
  getCorrelatedActions
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
  authorize([1]),
  auditLog("CLEANUP_LOGS", "AUDIT_LOG", { severity: "CRITICAL", category: "SECURITY" }),
  cleanupLogs
);

export default router;