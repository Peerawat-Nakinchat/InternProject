import express from 'express';
import { getUsersAndModuleRights, toggleModuleAccess } from '../controllers/PermissionController.js';
import { protect } from '../middleware/authMiddleware.js';
// อย่าลืม import middleware ที่เช็ค org context ถ้ามี (เช่น authorizeOrg)
import { requirePermission } from '../middleware/permissionGuardMiddleware.js';

const router = express.Router();
const MANAGE_PERMISSION = 'MOD_USER_ACCESS_MANAGE'; 

// Get Grid Data
router.get(
  '/org/:orgId/users-and-modules',
  protect,
  requirePermission(MANAGE_PERMISSION),
  getUsersAndModuleRights
);

// Toggle Action
router.put(
  '/org/:orgId/user/:targetUserId/toggle-module',
  protect,
  requirePermission(MANAGE_PERMISSION),
  toggleModuleAccess
);

export default router;