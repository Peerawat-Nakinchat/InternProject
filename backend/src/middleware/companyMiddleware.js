// src/middleware/companyMiddleware.js
import { MemberModel } from '../models/MemberModel.js';
import { OrganizationModel } from '../models/CompanyModel.js';
import { securityLogger } from '../utils/logger.js';
import { createError, asyncHandler } from './errorHandler.js';

export const isUUID = (v) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);

export const createCompanyMiddleware = (deps = {}) => {
  const Member = deps.MemberModel || MemberModel;
  const Org = deps.OrganizationModel || OrganizationModel;
  const logger = deps.securityLogger || securityLogger;

  /**
   * Middleware: Require Organization Context
   * เช็คว่า User เป็นสมาชิกของบริษัทนี้หรือไม่
   */
  const requireOrganization = asyncHandler(async (req, res, next) => {
    const orgId = req.headers['x-org-id']?.trim() || req.body.orgId?.trim() || req.params.orgId?.trim() || req.query.orgId?.trim();

    if (!orgId) throw createError.badRequest('Organization ID required');
    if (!isUUID(orgId)) throw createError.badRequest('Invalid organization ID format');

    const userId = req.user?.user_id;
    if (!userId) throw createError.unauthorized('Authentication required');

    const organization = await Org.findById(orgId);
    if (!organization) throw createError.notFound('Organization not found');

    const member = await Member.findOne(orgId, userId);

    if (!member) {
      logger.suspiciousActivity('Unauthorized org access', req.ip, req.headers['user-agent'], { orgId, userId });
      throw createError.forbidden('You are not a member of this organization');
    }

    // Save context to request
    req.user.current_org_id = orgId;
    req.user.org_role_id = member.role_id;
    req.organization = organization;

    next();
  });

  /**
   * Middleware: Require Ownership
   * เช็คว่าเป็นเจ้าของบริษัท (OWNER) เท่านั้น
   */
  const requireOwnership = asyncHandler(async (req, res, next) => {
    const userId = req.user?.user_id;
    const orgId = req.user?.current_org_id;

    if (!orgId) throw createError.badRequest('Organization context missing');

    const isOwner = await Org.isOwner(orgId, userId);
    if (!isOwner) {
       throw createError.forbidden('Only organization owner can perform this action');
    }
    next();
  });

  /**
   * Middleware: Require Specific Org Role
   * เช็คว่ามี Role ในบริษัทตรงตามที่กำหนดหรือไม่ (เช่น [1, 2] คือ OWNER หรือ ADMIN)
   */
  const requireOrgRole = (allowedRoles = []) => {
    return (req, res, next) => {
      const roleId = req.user?.org_role_id;

      if (!roleId) {
        return next(createError.forbidden('Organization role not found'));
      }

      if (!allowedRoles.includes(roleId)) {
        return next(createError.forbidden('Insufficient permissions for this action'));
      }

      next();
    };
  };

  return { requireOrganization, requireOwnership, requireOrgRole };
};

const defaultInstance = createCompanyMiddleware();
export const { requireOrganization, requireOwnership, requireOrgRole } = defaultInstance;
export default defaultInstance;