// src/middleware/roleMiddleware.js
import { securityLogger } from '../utils/logger.js';

/**
 * Factory for Role Middleware
 * @param {Object} deps - Dependencies
 */
export const createRoleMiddleware = (deps = {}) => {
  const logger = deps.securityLogger || securityLogger;

  /**
   * Middleware: Check User Role (RBAC)
   * @param {Array} allowedRoles - List of allowed role IDs
   */
  const checkRole = (allowedRoles = []) => {
    return (req, res, next) => {
      const userRoleId = req.user?.role_id;
      const userId = req.user?.user_id;

      if (!userRoleId && userRoleId !== 0) { // Check strict undefined/null but allow 0 if valid role
        // For security, missing role is treated as Access Denied
        return res.status(403).json({
          success: false,
          message: 'ไม่สามารถระบุสิทธิ์ผู้ใช้งานได้'
        });
      }

      if (!allowedRoles.includes(userRoleId)) {
        logger.suspiciousActivity(
          'Insufficient permissions for action',
          req.clientInfo?.ipAddress || req.ip,
          req.clientInfo?.userAgent || 'unknown',
          {
            userId,
            userRoleId,
            requiredRoles: allowedRoles,
            path: req.path,
            method: req.method
          }
        );

        return res.status(403).json({
          success: false,
          message: 'ไม่ได้รับอนุญาต'
        });
      }

      next();
    };
  };

  return { checkRole };
};

// Default Export
const defaultInstance = createRoleMiddleware();
export const checkRole = defaultInstance.checkRole;
export default defaultInstance;