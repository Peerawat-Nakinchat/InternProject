// src/middleware/authMiddleware.js
import { verifyAccessToken } from '../utils/token.js';
import { User, OrganizationMember } from '../models/dbModels.js';
import { getAccessToken } from '../utils/cookieUtils.js';
import { createError, asyncHandler } from './errorHandler.js';

export const createAuthMiddleware = (deps = {}) => {
  const verifyToken = deps.verifyAccessToken || verifyAccessToken;
  const getToken = deps.getAccessToken || getAccessToken;
  const UserModel = deps.User || User;
  const OrgMemberModel = deps.OrganizationMember || OrganizationMember;

  // Middleware ตรวจสอบการยืนยันตัวตน (Authentication)
  const protect = asyncHandler(async (req, res, next) => {
    const token = getToken(req);

    if (!token) {
      throw createError.unauthorized('ไม่พบ Token, กรุณาเข้าสู่ระบบ'); // ✅ 401
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      throw createError.unauthorized('Token ไม่ถูกต้องหรือหมดอายุ');
    }

    if (!decoded?.user_id) {
      throw createError.unauthorized('Token ไม่ถูกต้อง (Invalid Payload)');
    }

    const user = await UserModel.findByPk(decoded.user_id, {
      attributes: [
        'user_id', 'email', 'name', 'surname', 'full_name', 'sex',                    
        'profile_image_url', 'auth_provider', 'role_id', 'is_active'
      ]
    });

    if (!user) {
      throw createError.unauthorized('ไม่พบผู้ใช้งานในระบบ');
    }

    if (!user.is_active) {
      throw createError.unauthorized('บัญชีนี้ถูกระงับการใช้งาน');
    }

    req.user = user; // Attach user to request
    next();
  });

  // Middleware ตรวจสอบสิทธิ์ผู้ใช้งานในองค์กร
  const checkOrgRole = (allowedRoles = []) => {
    return asyncHandler(async (req, res, next) => {
      // รองรับทั้ง URL param และ context ที่อาจถูก set มาก่อนหน้า
      const orgId = req.params.orgId || req.user.current_org_id || req.body.orgId; 
      
      if (!orgId) {
        throw createError.badRequest('orgId required');
      }

      const membership = await OrgMemberModel.findOne({
        where: { org_id: orgId, user_id: req.user.user_id }
      });

      if (!membership) {
        throw createError.forbidden('คุณไม่ได้เป็นสมาชิกขององค์กรนี้'); // ✅ 403
      }

      // Save context for controller
      req.user.current_org_id = orgId;
      req.user.org_role_id = membership.role_id;

      if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role_id)) {
         throw createError.forbidden('คุณไม่มีสิทธิ์ดำเนินการในองค์กรนี้ (Insufficient Role)');
      }

      next();
    });
  };

  // Middleware ตรวจสอบสิทธิ์ผู้ใช้งานตามบทบาท (Role-Based Access Control)
  const authorize = (roles = []) => {
    if (typeof roles === 'string') roles = [roles];

    return (req, res, next) => {
      if (!req.user) {
        return next(createError.unauthorized('ไม่พบผู้ใช้งาน'));
      }

      if (!roles.includes(req.user.role_id)) {
        return next(createError.forbidden('คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ (System Role)'));
      }
      next();
    };
  };

  return { protect, checkOrgRole, authorize };
};

const defaultInstance = createAuthMiddleware();
export const { protect, checkOrgRole, authorize } = defaultInstance;
export default defaultInstance;