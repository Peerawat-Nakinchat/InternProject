import { MemberModel } from '../models/MemberModel.js';
import { OrganizationModel } from '../models/CompanyModel.js';
import { securityLogger } from '../utils/logger.js';

/** Validate UUID v4 */
const isUUID = (v) => {
  if (!v || typeof v !== 'string') return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);
};

export const requireOrganization = async (req, res, next) => {
  try {
    const orgId =
      req.headers['x-org-id']?.trim() ||
      req.body.orgId?.trim() ||
      req.params.orgId?.trim() ||
      req.query.orgId?.trim();

    if (!orgId) {
      securityLogger.suspiciousActivity('Missing org ID', req.ip, req.headers['user-agent'], {
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
      securityLogger.suspiciousActivity('Invalid org ID format', req.ip, req.headers['user-agent'], {
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

    // ORM: Check organization exists
    const organization = await OrganizationModel.findByPk(orgId);

    if (!organization) {
      securityLogger.suspiciousActivity('Access to non-existent org', req.ip, req.headers['user-agent'], {
        orgId,
        userId,
      });

      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }

    // ORM: Check membership
    const member = await MemberModel.findOne({
      where: {
        org_id: orgId,
        user_id: userId,
      },
    });

    if (!member) {
      securityLogger.suspiciousActivity('Unauthorized org access', req.ip, req.headers['user-agent'], {
        orgId,
        userId,
      });

      return res.status(403).json({
        success: false,
        message: 'You are not a member of this organization',
      });
    }

    // Attach org context to req
    req.user.current_org_id = orgId;
    req.user.org_role_id = member.role_id;
    req.organization = organization;

    next();
  } catch (err) {
    console.error('❌ Organization middleware error:', err);

    securityLogger.suspiciousActivity('Org middleware error', req.ip, req.headers['user-agent'], {
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
 * Middleware: require ownership
 */
export const requireOwnership = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;
    const orgId = req.user?.current_org_id;

    if (!orgId) {
      return res.status(400).json({
        success: false,
        message: 'Organization context missing',
      });
    }

    const organization = await OrganizationModel.findByPk(orgId);

    if (!organization || organization.owner_user_id !== userId) {
      securityLogger.suspiciousActivity('Non-owner attempting owner-only action', req.ip, req.headers['user-agent'], {
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
 * Require specific org role(s)
 */
export const requireOrgRole = (allowedRoles = []) => {
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
      securityLogger.suspiciousActivity('Insufficient org permissions', req.ip, req.headers['user-agent'], {
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
 * Prevent modification of org owner
 */
export const preventOwnerModification = async (req, res, next) => {
  try {
    const targetUserId = req.params.memberId || req.body.userId;
    const orgId = req.user?.current_org_id;

    if (!targetUserId || !orgId) return next();

    const org = await OrganizationModel.findByPk(orgId);

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

export default {
  requireOrganization,
  requireOwnership,
  requireOrgRole,
  preventOwnerModification,
};
