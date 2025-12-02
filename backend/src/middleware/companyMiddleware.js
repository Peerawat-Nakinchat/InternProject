// src/middleware/companyMiddleware.js
import { MemberModel } from '../models/MemberModel.js';
import { OrganizationModel } from '../models/CompanyModel.js';
import { securityLogger } from '../utils/logger.js';

// --- Pure Helper Functions ---

export const isUUID = (v) => {
  if (!v || typeof v !== 'string') return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);
};

// --- Factory Function ---

/**
 * Factory for Company Middleware
 */
export const createCompanyMiddleware = (deps = {}) => {
  // Inject Dependencies (Default to real implementation)
  const Member = deps.MemberModel || MemberModel;
  const Org = deps.OrganizationModel || OrganizationModel;
  const logger = deps.securityLogger || securityLogger;

  /**
   * Middleware: Require Organization Context
   */
  const requireOrganization = async (req, res, next) => {
    try {
      const orgId =
        req.headers['x-org-id']?.trim() ||
        req.body.orgId?.trim() ||
        req.params.orgId?.trim() ||
        req.query.orgId?.trim();

      if (!orgId) {
        logger.suspiciousActivity('Missing org ID', req.ip, req.headers['user-agent'], {
          path: req.path,
          method: req.method,
          userId: req.user?.user_id,
        });

        return res.status(400).json({
          success: false,
          message: 'Organization ID required.',
        });
      }

      if (!isUUID(orgId)) {
        logger.suspiciousActivity('Invalid org ID format', req.ip, req.headers['user-agent'], {
          orgId,
          path: req.path,
          userId: req.user?.user_id,
        });

        return res.status(400).json({
          success: false,
          message: 'Invalid organization ID format',
        });
      }

      const userId = req.user?.user_id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Check organization exists
      const organization = await Org.findOrganizationById(orgId);

      if (!organization) {
        logger.suspiciousActivity('Access to non-existent org', req.ip, req.headers['user-agent'], {
          orgId,
          userId,
        });

        return res.status(404).json({
          success: false,
          message: 'Organization not found',
        });
      }

      // Check membership
      const member = await Member.findOne({
        where: {
          org_id: orgId,
          user_id: userId,
        },
      });

      if (!member) {
        logger.suspiciousActivity('Unauthorized org access', req.ip, req.headers['user-agent'], {
          orgId,
          userId,
        });

        return res.status(403).json({
          success: false,
          message: 'You are not a member of this organization',
        });
      }

      req.user.current_org_id = orgId;
      req.user.org_role_id = member.role_id;
      req.organization = organization;

      next();
    } catch (err) {
      console.error('❌ Organization middleware error:', err);

      logger.suspiciousActivity('Org middleware error', req.ip, req.headers['user-agent'], {
        error: err.message,
        path: req.path,
        userId: req.user?.user_id,
      });

      return res.status(500).json({
        success: false,
        message: 'Internal server error validating organization',
      });
    }
  };

  /**
   * Middleware: Require Ownership
   */
  const requireOwnership = async (req, res, next) => {
    try {
      const userId = req.user?.user_id;
      const orgId = req.user?.current_org_id;

      if (!orgId) {
        return res.status(400).json({
          success: false,
          message: 'Organization context missing',
        });
      }

      const organization = await Org.findOrganizationById(orgId);

      if (!organization || organization.owner_user_id !== userId) {
        logger.suspiciousActivity('Non-owner attempting owner-only action', req.ip, req.headers['user-agent'], {
          orgId,
          userId,
          actualOwner: organization?.owner_user_id,
        });

        return res.status(403).json({
          success: false,
          message: 'Only organization owner can perform this action',
        });
      }

      next();
    } catch (err) {
      console.error('❌ requireOwnership error:', err);

      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };

  /**
   * Middleware: Require Specific Org Role
   */
  const requireOrgRole = (allowedRoles = []) => {
    return (req, res, next) => {
      const roleId = req.user?.org_role_id;
      const userId = req.user?.user_id;
      const orgId = req.user?.current_org_id;

      if (!roleId) {
        return res.status(403).json({
          success: false,
          message: 'Organization role not found',
        });
      }

      if (!allowedRoles.includes(roleId)) {
        logger.suspiciousActivity('Insufficient org permissions', req.ip, req.headers['user-agent'], {
          userId,
          orgId,
          roleId,
          required: allowedRoles,
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions for this action',
        });
      }

      next();
    };
  };

  /**
   * Middleware: Prevent Owner Modification
   */
  const preventOwnerModification = async (req, res, next) => {
    try {
      const targetUserId = req.params.memberId || req.body.userId;
      const orgId = req.user?.current_org_id;

      if (!targetUserId || !orgId) return next();

      const org = await Org.findOrganizationById(orgId);

      if (org && org.owner_user_id === targetUserId) {
        return res.status(403).json({
          success: false,
          message: 'Cannot modify organization owner. Use transfer ownership.',
        });
      }

      next();
    } catch (err) {
      console.error('❌ preventOwnerModification error:', err);

      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };

  return {
    requireOrganization,
    requireOwnership,
    requireOrgRole,
    preventOwnerModification
  };
};

// Default Export
const defaultInstance = createCompanyMiddleware();
export const requireOrganization = defaultInstance.requireOrganization;
export const requireOwnership = defaultInstance.requireOwnership;
export const requireOrgRole = defaultInstance.requireOrgRole;
export const preventOwnerModification = defaultInstance.preventOwnerModification;
export default defaultInstance;