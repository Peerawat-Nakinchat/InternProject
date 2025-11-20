// src/middleware/requireOrganization.js

import { MemberModel } from '../models/MemberModel.js';

// Simple UUID validator
const isUUID = (v) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);

export const requireOrganization = async (req, res, next) => {
    try {
        // ใช้ x-org-id หรือ ?org_id
        const orgId = req.body.orgId?.trim() ? req.body.orgId.trim() : req.params.orgId?.trim();


        if (!orgId) {
            return res.status(400).json({
                success: false,
                message: 'Organization ID (org_id) required (set x-org-id header or org_id query param)'
            });
        }

        // Validate UUID format
        if (!isUUID(orgId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid org_id format (must be UUID)'
            });
        }

        // ensure user exists (from protect)
        const userId = req.user?.user_id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized (User ID missing after authentication)'
            });
        }

        // Check user role in this org
        const roleId = await MemberModel.findMemberRole(orgId, userId);

        if (!roleId) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: You are not a member of this organization'
            });
        }

        // Attach organization context
        req.user.current_org_id = orgId; // UUID as string
        req.user.org_role_id = roleId;

        next();
    } catch (err) {
        console.error('Organization Context Middleware Error:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while checking organization context'
        });
    }
};
