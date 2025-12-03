// src/middleware/roleMiddleware.js
import { securityLogger } from '../utils/logger.js';
import { createError } from './errorHandler.js'; // ✅

export const createRoleMiddleware = (deps = {}) => {
  const logger = deps.securityLogger || securityLogger;

  // Middleware ตรวจสอบสิทธิ์ผู้ใช้งานตามบทบาท (Role-Based Access Control)
  const checkRole = (allowedRoles = []) => {
    return (req, res, next) => {
      const userRoleId = req.user?.role_id;

      if (!userRoleId) {
        return next(createError.forbidden('ไม่สามารถระบุสิทธิ์ผู้ใช้งานได้'));
      }

      if (!allowedRoles.includes(userRoleId)) {
        // Log suspicious activity
        logger.suspiciousActivity(
          'Insufficient permissions (RBAC)',
          req.clientInfo?.ipAddress || req.ip,
          req.clientInfo?.userAgent || 'unknown',
          { userId: req.user.user_id, required: allowedRoles, actual: userRoleId }
        );

        return next(createError.forbidden('ไม่ได้รับอนุญาต (Insufficient Role)'));
      }

      next();
    };
  };

  return { checkRole };
};

const defaultInstance = createRoleMiddleware();
export const checkRole = defaultInstance.checkRole;
export default defaultInstance;