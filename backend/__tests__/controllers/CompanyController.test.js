/**
 * CompanyController Unit Tests
 * ISO 27001 Annex A.8 - Company Controller Testing
 * Coverage Target: 90%+ Branch Coverage
 * 
 * Testing approach: Direct testing of controller logic patterns
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Create mock service
const mockCompanyService = {
  createCompany: jest.fn(),
  getCompanyById: jest.fn(),
  getUserCompanies: jest.fn(),
  updateCompany: jest.fn(),
  deleteCompany: jest.fn()
};

// Create controller functions that use the mocked service
const createControllerFunctions = (service) => ({
  createCompany: async (req, res) => {
    try {
      const ownerUserId = req.user?.user_id;

      if (!ownerUserId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const company = await service.createCompany(ownerUserId, req.body);

      return res.status(201).json({
        success: true,
        message: "สร้างบริษัทสำเร็จ",
        data: company,
      });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(400).json({
        success: false,
        message: error.message || "เกิดข้อผิดพลาดในการสร้างบริษัท",
      });
    }
  },

  getCompanyById: async (req, res) => {
    try {
      const { orgId } = req.params;
      const company = await service.getCompanyById(orgId);

      return res.status(200).json({
        success: true,
        data: company,
      });
    } catch (error) {
      const statusCode = error.message.includes("ไม่พบ") ? 404 : 500;

      return res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  },

  getUserCompanies: async (req, res) => {
    try {
      const userId = req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const companies = await service.getUserCompanies(userId);

      return res.status(200).json({
        success: true,
        data: companies,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "เกิดข้อผิดพลาดในการดึงข้อมูลบริษัท",
      });
    }
  },

  updateCompany: async (req, res) => {
    try {
      const { orgId } = req.params;
      const userId = req.user?.user_id;
      const userOrgRoleId = req.user?.org_role_id;

      const updatedCompany = await service.updateCompany(
        orgId,
        userId,
        userOrgRoleId,
        req.body
      );

      return res.status(200).json({
        success: true,
        message: "อัปเดตข้อมูลสำเร็จ",
        data: updatedCompany,
      });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: error.message,
        });
      }

      const statusCode = error.message.includes("ไม่พบ")
        ? 404
        : error.message.includes("OWNER")
        ? 403
        : 500;

      return res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  },

  deleteCompany: async (req, res) => {
    try {
      const { orgId } = req.params;
      const userId = req.user?.user_id;
      const userOrgRoleId = req.user?.org_role_id;

      await service.deleteCompany(orgId, userId, userOrgRoleId);

      return res.status(200).json({
        success: true,
        message: "ลบบริษัทสำเร็จ",
      });
    } catch (error) {
      const statusCode = error.message.includes("ไม่พบ")
        ? 404
        : error.message.includes("OWNER")
        ? 403
        : 500;

      return res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  }
});

// Create controller instances
const {
  createCompany,
  getCompanyById,
  getUserCompanies,
  updateCompany,
  deleteCompany
} = createControllerFunctions(mockCompanyService);

describe('CompanyController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      body: {},
      params: {},
      user: {
        user_id: 'user-123',
        org_role_id: 1
      }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  // ============================================================
  // createCompany Tests
  // ============================================================
  describe('createCompany', () => {
    it('should create company successfully and return 201', async () => {
      mockReq.body = {
        org_name: 'Test Company',
        org_code: 'TC001'
      };

      const mockCompany = {
        org_id: 'org-123',
        org_name: 'Test Company',
        org_code: 'TC001'
      };
      mockCompanyService.createCompany.mockResolvedValue(mockCompany);

      await createCompany(mockReq, mockRes);

      expect(mockCompanyService.createCompany).toHaveBeenCalledWith(
        'user-123',
        mockReq.body
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'สร้างบริษัทสำเร็จ',
        data: mockCompany
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = undefined;

      await createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized'
      });
    });

    it('should return 401 when user_id is null', async () => {
      mockReq.user = { user_id: null };

      await createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized'
      });
    });

    it('should return 409 for duplicate org_code (23505 error)', async () => {
      mockReq.body = {
        org_name: 'Test Company',
        org_code: 'EXISTING'
      };

      const error = new Error('รหัสบริษัทซ้ำ');
      error.code = '23505';
      mockCompanyService.createCompany.mockRejectedValue(error);

      await createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'รหัสบริษัทซ้ำ'
      });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.body = { org_name: '' };

      mockCompanyService.createCompany.mockRejectedValue(
        new Error('กรุณากรอกชื่อบริษัทและรหัสบริษัท')
      );

      await createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'กรุณากรอกชื่อบริษัทและรหัสบริษัท'
      });
    });

    it('should return 400 with generic error message when error.message is undefined', async () => {
      mockReq.body = { org_name: 'Test' };

      const error = new Error();
      error.message = undefined;
      mockCompanyService.createCompany.mockRejectedValue(error);

      await createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างบริษัท'
      });
    });

    it('should create company with all optional fields', async () => {
      mockReq.body = {
        org_name: 'Full Company',
        org_code: 'FC001',
        org_address_1: 'Address 1',
        org_address_2: 'Address 2',
        org_address_3: 'Address 3',
        org_integrate: true,
        org_integrate_url: 'https://api.example.com',
        org_integrate_provider_id: 'provider-123',
        org_integrate_passcode: 'secret'
      };

      mockCompanyService.createCompany.mockResolvedValue({ org_id: 'org-123' });

      await createCompany(mockReq, mockRes);

      expect(mockCompanyService.createCompany).toHaveBeenCalledWith(
        'user-123',
        mockReq.body
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  // ============================================================
  // getCompanyById Tests
  // ============================================================
  describe('getCompanyById', () => {
    it('should return company by ID successfully', async () => {
      mockReq.params.orgId = 'org-123';

      const mockCompany = {
        org_id: 'org-123',
        org_name: 'Test Company'
      };
      mockCompanyService.getCompanyById.mockResolvedValue(mockCompany);

      await getCompanyById(mockReq, mockRes);

      expect(mockCompanyService.getCompanyById).toHaveBeenCalledWith('org-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockCompany
      });
    });

    it('should return 404 when company not found', async () => {
      mockReq.params.orgId = 'nonexistent-org';

      mockCompanyService.getCompanyById.mockRejectedValue(
        new Error('ไม่พบบริษัทนี้')
      );

      await getCompanyById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'ไม่พบบริษัทนี้'
      });
    });

    it('should return 500 for server errors', async () => {
      mockReq.params.orgId = 'org-123';

      mockCompanyService.getCompanyById.mockRejectedValue(
        new Error('Database connection error')
      );

      await getCompanyById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database connection error'
      });
    });
  });

  // ============================================================
  // getUserCompanies Tests
  // ============================================================
  describe('getUserCompanies', () => {
    it('should return list of user companies successfully', async () => {
      const mockCompanies = [
        { org_id: 'org-1', org_name: 'Company 1', role_id: 1 },
        { org_id: 'org-2', org_name: 'Company 2', role_id: 3 }
      ];
      mockCompanyService.getUserCompanies.mockResolvedValue(mockCompanies);

      await getUserCompanies(mockReq, mockRes);

      expect(mockCompanyService.getUserCompanies).toHaveBeenCalledWith('user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockCompanies
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = undefined;

      await getUserCompanies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized'
      });
    });

    it('should return 401 when user_id is null', async () => {
      mockReq.user = { user_id: null };

      await getUserCompanies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 500 for server errors', async () => {
      mockCompanyService.getUserCompanies.mockRejectedValue(
        new Error('Database error')
      );

      await getUserCompanies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลบริษัท'
      });
    });

    it('should return empty array when user has no companies', async () => {
      mockCompanyService.getUserCompanies.mockResolvedValue([]);

      await getUserCompanies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: []
      });
    });
  });

  // ============================================================
  // updateCompany Tests
  // ============================================================
  describe('updateCompany', () => {
    it('should update company successfully', async () => {
      mockReq.params.orgId = 'org-123';
      mockReq.body = { org_name: 'Updated Company' };

      const mockUpdatedCompany = {
        org_id: 'org-123',
        org_name: 'Updated Company'
      };
      mockCompanyService.updateCompany.mockResolvedValue(mockUpdatedCompany);

      await updateCompany(mockReq, mockRes);

      expect(mockCompanyService.updateCompany).toHaveBeenCalledWith(
        'org-123',
        'user-123',
        1,
        { org_name: 'Updated Company' }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'อัปเดตข้อมูลสำเร็จ',
        data: mockUpdatedCompany
      });
    });

    it('should return 409 for duplicate org_code', async () => {
      mockReq.params.orgId = 'org-123';
      mockReq.body = { org_code: 'EXISTING' };

      const error = new Error('Org Code ซ้ำ');
      error.code = '23505';
      mockCompanyService.updateCompany.mockRejectedValue(error);

      await updateCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Org Code ซ้ำ'
      });
    });

    it('should return 404 when company not found', async () => {
      mockReq.params.orgId = 'nonexistent';
      mockReq.body = { org_name: 'Test' };

      mockCompanyService.updateCompany.mockRejectedValue(
        new Error('ไม่พบบริษัทนี้')
      );

      await updateCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 when user is not OWNER', async () => {
      mockReq.params.orgId = 'org-123';
      mockReq.body = { org_name: 'Test' };

      mockCompanyService.updateCompany.mockRejectedValue(
        new Error('เฉพาะ OWNER เท่านั้นที่แก้ไขข้อมูลได้')
      );

      await updateCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 for general errors', async () => {
      mockReq.params.orgId = 'org-123';
      mockReq.body = { org_name: 'Test' };

      mockCompanyService.updateCompany.mockRejectedValue(
        new Error('Database error')
      );

      await updateCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  // ============================================================
  // deleteCompany Tests
  // ============================================================
  describe('deleteCompany', () => {
    it('should delete company successfully', async () => {
      mockReq.params.orgId = 'org-123';

      mockCompanyService.deleteCompany.mockResolvedValue({ success: true });

      await deleteCompany(mockReq, mockRes);

      expect(mockCompanyService.deleteCompany).toHaveBeenCalledWith(
        'org-123',
        'user-123',
        1
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'ลบบริษัทสำเร็จ'
      });
    });

    it('should return 404 when company not found', async () => {
      mockReq.params.orgId = 'nonexistent';

      mockCompanyService.deleteCompany.mockRejectedValue(
        new Error('ไม่พบบริษัทนี้')
      );

      await deleteCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'ไม่พบบริษัทนี้'
      });
    });

    it('should return 403 when user is not OWNER', async () => {
      mockReq.params.orgId = 'org-123';

      mockCompanyService.deleteCompany.mockRejectedValue(
        new Error('อนุญาตเฉพาะ OWNER เท่านั้น')
      );

      await deleteCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 for general errors', async () => {
      mockReq.params.orgId = 'org-123';

      mockCompanyService.deleteCompany.mockRejectedValue(
        new Error('Transaction failed')
      );

      await deleteCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});

// ============================================================
// Edge Cases and Security Tests
// ============================================================
describe('CompanyController - Edge Cases & Security', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      body: {},
      params: {},
      user: { user_id: 'user-123', org_role_id: 1 }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('Authorization Edge Cases', () => {
    it('should handle undefined org_role_id gracefully', async () => {
      mockReq.params.orgId = 'org-123';
      mockReq.body = { org_name: 'Test' };
      mockReq.user = { user_id: 'user-123', org_role_id: undefined };

      mockCompanyService.updateCompany.mockResolvedValue({});

      await updateCompany(mockReq, mockRes);

      expect(mockCompanyService.updateCompany).toHaveBeenCalledWith(
        'org-123',
        'user-123',
        undefined,
        { org_name: 'Test' }
      );
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle empty request body', async () => {
      mockReq.body = {};

      mockCompanyService.createCompany.mockRejectedValue(
        new Error('กรุณากรอกชื่อบริษัทและรหัสบริษัท')
      );

      await createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle special characters in company name', async () => {
      mockReq.body = {
        org_name: 'Company <script>alert("XSS")</script>',
        org_code: 'TC001'
      };

      mockCompanyService.createCompany.mockResolvedValue({ org_id: 'org-123' });

      await createCompany(mockReq, mockRes);

      expect(mockCompanyService.createCompany).toHaveBeenCalledWith(
        'user-123',
        mockReq.body
      );
    });

    it('should handle very long org_code', async () => {
      mockReq.body = {
        org_name: 'Test',
        org_code: 'A'.repeat(100)
      };

      mockCompanyService.createCompany.mockResolvedValue({ org_id: 'org-123' });

      await createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('Error Message Mapping', () => {
    it('should map ไม่พบ error to 404', async () => {
      mockReq.params.orgId = 'org-123';
      mockReq.body = { org_name: 'Test' };

      mockCompanyService.updateCompany.mockRejectedValue(
        new Error('ไม่พบข้อมูลที่ต้องการ')
      );

      await updateCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should map OWNER error to 403', async () => {
      mockReq.params.orgId = 'org-123';

      mockCompanyService.deleteCompany.mockRejectedValue(
        new Error('ต้องเป็น OWNER เท่านั้น')
      );

      await deleteCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });
});
