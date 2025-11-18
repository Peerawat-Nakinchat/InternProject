// src/middleware/requireOrganization.js

import { MemberModel } from '../models/MemberModel.js';

export const requireOrganization = async (req, res, next) => {
    try {
        // Prefer header x-org-id to avoid spoof via body
        const headerOrgId = req.headers['x-org-id'];
        const queryOrgId = req.query.org_id;
        const orgId = headerOrgId ? String(headerOrgId).trim() : (queryOrgId ? String(queryOrgId).trim() : null);

        if (!orgId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Organization ID (org_id) required (set x-org-id header or org_id query param)' 
            });
        }

        const userId = req.user?.user_id; 
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized (User ID missing after authentication)' 
            });
        }

        // ✅ FIX 2: เปลี่ยนชื่อตัวแปรเป็น roleId และใช้ org_role_id
        const roleId = await MemberModel.findMemberRole(orgId, userId);

        if (!roleId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Forbidden: Not a member of this organization or role not found' 
            });
        }

        // Attach organization context to request
        req.user.current_org_id = orgId;
        
        // ✅ FIX 2: ใช้ org_role_id แทน role เพื่อให้สอดคล้องกับ Controller
        req.user.org_role_id = roleId; 

        return next();
    } catch (err) {
        console.error('Organization Context Middleware Error:', err);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error while checking organization context' 
        });
    }
};