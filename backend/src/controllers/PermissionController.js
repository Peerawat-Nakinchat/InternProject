import PermissionAdminService from '../services/PermissionAdminService.js';
import { ResponseHandler } from '../utils/responseHandler.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const createPermissionController = (deps = {}) => {
  const service = deps.service || PermissionAdminService;

  const getUsersAndModuleRights = asyncHandler(async (req, res) => {
    const { orgId } = req.params;
    const data = await service.getUsersAndModuleRights(orgId);
    return ResponseHandler.success(res, data);
  });

  const toggleModuleAccess = asyncHandler(async (req, res) => {
    const { orgId, targetUserId } = req.params;
    const { moduleCode, isEnabled } = req.body;

    await service.toggleModuleAccess(targetUserId, orgId, moduleCode, isEnabled);
    
    return ResponseHandler.success(res, null, `Updated access for ${moduleCode}.`);
  });

  return { getUsersAndModuleRights, toggleModuleAccess };
};

const defaultController = createPermissionController();
export const { getUsersAndModuleRights, toggleModuleAccess } = defaultController;