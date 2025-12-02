// src/middleware/authMiddleware.js
import { verifyAccessToken } from '../utils/token.js';
import { User, OrganizationMember } from '../models/dbModels.js';
import { getAccessToken } from '../utils/cookieUtils.js';

/**
 * Factory Function for Auth Middleware
 * @param {Object} deps - Dependencies injection
 */
export const createAuthMiddleware = (deps = {}) => {
  // Inject Dependencies (Default to real implementations)
  const verifyToken = deps.verifyAccessToken || verifyAccessToken;
  const getToken = deps.getAccessToken || getAccessToken;
  const UserModel = deps.User || User;
  const OrgMemberModel = deps.OrganizationMember || OrganizationMember;

  /**
   * Middleware: Protect Route with Access Token
   */
  const protect = async (req, res, next) => {
    const token = getToken(req);

    if (!token) {
      console.error('❌ ไม่มี Token (ไม่พบทั้งใน cookie และ header)');
      return res.status(401).json({ 
        success: false, 
        message: 'ไม่พบ Token, กรุณาเข้าสู่ระบบ' 
      });
    }

    try {
      const decoded = verifyToken(token);

      if (!decoded?.user_id) {
        console.error('❌ Token decode ไม่สำเร็จหรือไม่มี user_id');
        return res.status(401).json({ 
          success: false, 
          message: 'Token ไม่ถูกต้องหรือหมดอายุ' 
        });
      }

      const user = await UserModel.findByPk(decoded.user_id, {
        attributes: [
          'user_id', 'email', 'name', 'surname', 'full_name', 'sex',                    
          'user_address_1', 'user_address_2', 'user_address_3',         
          'profile_image_url', 'auth_provider', 'provider_id',
          'role_id', 'is_active', 'created_at'
        ]
      });

      if (!user) {
        console.error('❌ ไม่พบ user ในฐานข้อมูล');
        return res.status(401).json({ 
          success: false, 
          message: 'ไม่พบผู้ใช้งานในระบบ' 
        });
      }

      if (!user.is_active) {
        console.error('❌ Account inactive:', user.email);
        return res.status(401).json({ 
          success: false, 
          message: 'บัญชีนี้ถูกระงับการใช้งาน' 
        });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('💥 Auth check error:', error);
      return res.status(401).json({ 
        success: false, 
        message: 'ไม่ได้รับอนุญาตให้เข้าถึง',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

  /**
   * Middleware: Check Organization Role
   * @param {Array} allowedRoles 
   */
  const checkOrgRole = (allowedRoles = []) => {
    return async (req, res, next) => {
      try {
        const orgId = req.params.orgId || req.user.current_org_id;
        if (!orgId) {
          return res.status(400).json({ success: false, message: 'orgId required' });
        }

        const membership = await OrgMemberModel.findOne({
          where: {
            org_id: orgId,
            user_id: req.user.user_id
          }
        });

        if (!membership) {
          console.error('❌ ไม่พบสมาชิกในองค์กร');
          return res.status(403).json({ success: false, message: 'คุณไม่ได้เป็นสมาชิกองค์กรนี้' });
        }

        req.user.org_role_id = membership.role_id;

        if (!allowedRoles.includes(membership.role_id)) {
          console.error('❌ org_role_id ไม่ตรงกับที่กำหนด:', {
            userRole: membership.role_id,
            allowedRoles
          });
          return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์ในองค์กรนี้' });
        }

        console.log('✅ Organization role check passed');
        next();
      } catch (error) {
        console.error('💥 checkOrgRole error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์องค์กร' });
      }
    };
  };

  /**
   * Middleware: System Role Authorization (RBAC)
   * @param {Array|String} roles 
   */
  const authorize = (roles = []) => {
    if (typeof roles === 'string') roles = [roles];

    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'ไม่พบผู้ใช้งาน' });
      }

      if (!roles.includes(req.user.role_id)) {
        console.error('❌ System role ไม่ตรงกับที่กำหนด:', {
          userRole: req.user.role_id,
          allowedRoles: roles
        });
        return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้' });
      }

      console.log('✅ System role check passed');
      next();
    };
  };

  return { protect, checkOrgRole, authorize };
};

// Default Export for Backward Compatibility
const defaultInstance = createAuthMiddleware();
export const protect = defaultInstance.protect;
export const checkOrgRole = defaultInstance.checkOrgRole;
export const authorize = defaultInstance.authorize;
export default defaultInstance;