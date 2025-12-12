import AccessControlService from '../services/AccessControlService.js';
import { createError, asyncHandler } from './errorHandler.js';
import logger from '../utils/logger.js';

export const createPermissionGuardMiddleware = (deps = {}) => {
  const accessControl = deps.AccessControlService || AccessControlService;

  const requirePermission = (permissionCode) => asyncHandler(async (req, res, next) => {
    const userId = req.user?.user_id;
    // orgId ต้องมาจาก Token หรือ Context ก่อนหน้านี้
    const orgId = req.params.orgId || req.user?.current_org_id || req.body.orgId;

    if (!userId || !orgId) {
      throw createError.unauthorized("Unauthorized or missing organization context.");
    }

    const isAllowed = await accessControl.checkPermission(userId, orgId, permissionCode);

    if (isAllowed) {
      next();
    } else {
      logger.warn(`Access Denied: User ${userId} -> Permission ${permissionCode}`);
      throw createError.forbidden(`คุณไม่มีสิทธิ์ (${permissionCode}) ในการดำเนินการนี้`);
    }
  });

  return { requirePermission };
};

export const { requirePermission } = createPermissionGuardMiddleware();