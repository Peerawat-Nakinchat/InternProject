// src/controllers/CompanyController.js
import { OrganizationModel } from '../models/CompanyModel.js';
import { MemberModel } from '../models/MemberModel.js';
import { sequelize } from '../models/dbModels.js'; // สำหรับ transaction

// POST /api/company/create
const createCompany = async (req, res) => {
  const ownerUserId = req.user?.user_id;
  if (!ownerUserId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const {
    org_name,
    org_code,
    org_address_1,
    org_address_2,
    org_address_3,
    org_integrate,
    org_integrate_url,
    org_integrate_provider_id,
    org_integrate_passcode
  } = req.body;

  if (!org_name || !org_code) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อบริษัทและรหัสบริษัท' });
  }

  const t = await sequelize.transaction();
  try {
    // สร้างบริษัท
    const company = await OrganizationModel.createOrganization(
      {
        org_name,
        org_code,
        owner_user_id: ownerUserId,
        org_address_1,
        org_address_2,
        org_address_3,
        org_integrate,
        org_integrate_url,
        org_integrate_provider_id,
        org_integrate_passcode
      },
      t
    );

    // สร้าง member เป็น OWNER
    await MemberModel.addMemberToOrganization(company.org_id, ownerUserId, 1, t); // role_id = 1 (OWNER)

    await t.commit();
    return res.status(201).json({
      success: true,
      message: 'สร้างบริษัทสำเร็จ',
      data: company
    });
  } catch (error) {
    await t.rollback();
    console.error('Create company error:', error);
    if (error?.code === '23505') return res.status(409).json({ success: false, message: 'รหัสบริษัทซ้ำ' });
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างบริษัท' });
  }
};

// GET /api/company/:orgId
const getCompanyById = async (req, res) => {
  const { orgId } = req.params;
  try {
    const company = await OrganizationModel.findOrganizationById(orgId);
    if (!company) return res.status(404).json({ success: false, message: 'ไม่พบบริษัทนี้' });

    return res.status(200).json({ success: true, data: company });
  } catch (error) {
    console.error('Get company error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
  }
};

// GET /api/company/list
const getUserCompanies = async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const companies = await OrganizationModel.findOrganizationsByUser(userId);
    return res.status(200).json({ success: true, data: companies });
  } catch (error) {
    console.error('List companies error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลบริษัท' });
  }
};

// PUT /api/company/:orgId
const updateCompany = async (req, res) => {
  const { orgId } = req.params;
  if (req.user?.org_role_id !== 1) { // OWNER เท่านั้น
    return res.status(403).json({ success: false, message: 'เฉพาะ OWNER เท่านั้นที่แก้ไขข้อมูลได้' });
  }

  try {
    const updatedCompany = await OrganizationModel.updateOrganization(orgId, req.body);
    if (!updatedCompany) return res.status(404).json({ success: false, message: 'ไม่พบบริษัทนี้' });

    return res.status(200).json({ success: true, message: 'อัปเดตข้อมูลสำเร็จ', data: updatedCompany });
  } catch (error) {
    console.error('Update company error:', error);
    if (error?.code === '23505') return res.status(409).json({ success: false, message: 'Org Code ซ้ำ' });
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' });
  }
};

// DELETE /api/company/:orgId
const deleteCompany = async (req, res) => {
  const { orgId } = req.params;
  if (req.user?.org_role_id !== 1) {
    return res.status(403).json({ success: false, message: 'อนุญาตเฉพาะ OWNER เท่านั้น' });
  }

  const t = await sequelize.transaction();
  try {
    const deleted = await OrganizationModel.deleteOrganization(orgId, t);
    if (!deleted) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'ไม่พบบริษัทนี้' });
    }

    // ลบสมาชิกทั้งหมดในบริษัท
    await MemberModel.bulkRemoveMembers(orgId, [], t);

    await t.commit();
    return res.status(200).json({ success: true, message: 'ลบบริษัทสำเร็จ' });
  } catch (error) {
    await t.rollback();
    console.error('Delete company error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบบริษัท' });
  }
};

export {
  createCompany,
  getCompanyById,
  getUserCompanies,
  updateCompany,
  deleteCompany
};
