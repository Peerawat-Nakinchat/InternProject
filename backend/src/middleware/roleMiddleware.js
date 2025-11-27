import { securityLogger } from '../utils/logger.js';

export const checkRole = (allowedRoles = []) => {
  return (req, res, next) => {

    const userRoleId = req.user?.role_id;
    const userId = req.user?.user_id;

    if (!userRoleId) {
      return res.status(403).json({
        success: false,
        message: 'ไม่สามารถระบุสิทธิ์ผู้ใช้งานได้'
      });
    }

    if (!allowedRoles.includes(userRoleId)) {

      // Log ความพยายามเข้าถึงโดย role ไม่พอ
      securityLogger.suspiciousActivity(
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
