// src/controllers/CompanyController.js
import { CompanyService } from '../services/CompanyService.js';

/**
 * POST /api/companies
 */
const createCompany = async (req, res) => {
    const ownerUserId = req.user?.user_id;
    let { orgName, orgCode } = req.body;

    if (!ownerUserId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!orgName || !orgCode) {
        return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อและรหัสบริษัท' });
    }

    try {
        const company = await CompanyService.createCompanyAndAssignOwner(orgName, orgCode, ownerUserId);
        return res.status(201).json({
            success: true,
            message: 'สร้างบริษัทและกำหนดสิทธิ์เจ้าของสำเร็จ',
            company
        });
    } catch (error) {
        console.error('Create company error:', error);

        // Handle unique constraint violation (Postgres 23505)
        if (error?.code === '23505') {
            return res.status(409).json({ success: false, message: 'รหัสบริษัท (Org Code) นี้ถูกใช้แล้ว' });
        }

        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างบริษัท' });
    }
};

/**
 * GET /api/companies
 */
const getUserCompanies = async (req, res) => {
    const userId = req.user?.user_id;
    if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
        const companies = await CompanyService.getCompaniesForUser(userId);
        return res.status(200).json({
            success: true,
            data: companies
        });
    } catch (error) {
        console.error('Get companies error:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลบริษัท' });
    }
};

const deleteCompany = async (req, res) => {
    const orgId = req.params.orgId;
    const role = req.user.org_role_id; // from requireOrganization

    if (!orgId) {
        return res.status(400).json({ success: false, message: 'Organization ID required' });
    }

    if (role !== 1) {
        return res.status(403).json({ success: false, message: 'Allowed only for organization OWNER' });
    }

    try {
        const deleted = await CompanyService.deleteCompany(orgId);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Organization deleted successfully',
        });
    } catch (err) {
        console.error('Delete company error:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while deleting organization',
        });
    }
};

export {
    createCompany,
    getUserCompanies,
    deleteCompany,
};
