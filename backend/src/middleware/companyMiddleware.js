// src/middleware/requireOrganization.js

import { MemberModel } from '../models/MemberModel.js';

export const requireOrganization = async (req, res, next) => {
    try {
        // Prefer header x-org-id to avoid spoof via body
        const headerOrgId = req.headers['x-org-id'];
        const queryOrgId = req.query.org_id;
        // orgId คือ company_id ในตารางฐานข้อมูล
        const orgId = headerOrgId ? String(headerOrgId).trim() : (queryOrgId ? String(queryOrgId).trim() : null);

        if (!orgId) {
            // แจ้งให้ใช้ x-org-id header เพื่อความปลอดภัยที่ดีกว่า
            return res.status(400).json({ success: false, message: 'Organization ID (org_id) required (set x-org-id header or org_id query param)' });
        }

        // user_id ถูกกำหนดไว้ใน req.user จาก authMiddleware.js
        const userId = req.user?.user_id; 
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized (User ID missing after authentication)' });
        }

        // Get member role for this org (สมมติว่า MemberModel.findMemberRole คืนค่า role string: 'owner', 'admin', 'user', 'views')
        const roleString = await MemberModel.findMemberRole(orgId, userId);

        if (!roleString) {
            return res.status(403).json({ success: false, message: 'Forbidden: Not a member of this organization or role not found' });
        }

        // Attach organization context to request
        // 1. เก็บ ID องค์กรปัจจุบันไว้
        req.user.current_org_id = orgId;
        
        // 2. **CRITICAL FIX:** กำหนด Role ให้กับ req.user.role 
        //    เพื่อให้ทำงานร่วมกับ roleMiddleware.js ได้อย่างถูกต้อง
        req.user.role = roleString; 

        return next();
    } catch (err) {
        console.error('Organization Context Middleware Error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error while checking organization context' });
    }
};