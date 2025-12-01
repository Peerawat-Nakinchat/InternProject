/**
 * CompanyController Coverage Tests
 * Tests the REAL CompanyController using dependency injection
 * This ensures actual code execution for coverage metrics (90%+ branch coverage)
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createCompanyController } from '../../src/controllers/CompanyController.js';

describe('CompanyController (Real Coverage Tests)', () => {
  let controller;
  let mockCompanyService;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock service
    mockCompanyService = {
      createCompany: jest.fn(),
      getCompanyById: jest.fn(),
      getUserCompanies: jest.fn(),
      updateCompany: jest.fn(),
      deleteCompany: jest.fn()
    };

    // Create controller with mock service using dependency injection
    controller = createCompanyController(mockCompanyService);

    mockReq = {
      user: { user_id: 'user-123', org_role_id: 1 },
      body: {},
      params: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('createCompany', () => {
    it('should return 401 if user is not authenticated (user is null)', async () => {
      mockReq.user = null;

      await controller.createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized'
      });
    });

    it('should return 401 if user_id is missing (user exists but no user_id)', async () => {
      mockReq.user = {};

      await controller.createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized'
      });
    });

    it('should return 401 if user_id is undefined', async () => {
      mockReq.user = { user_id: undefined };

      await controller.createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized'
      });
    });

    it('should create company successfully', async () => {
      const companyData = { org_name: 'Test Company' };
      const createdCompany = { org_id: 'org-123', ...companyData };
      
      mockReq.body = companyData;
      mockCompanyService.createCompany.mockResolvedValue(createdCompany);

      await controller.createCompany(mockReq, mockRes);

      expect(mockCompanyService.createCompany).toHaveBeenCalledWith('user-123', companyData);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'สร้างบริษัทสำเร็จ',
        data: createdCompany
      });
    });

    it('should return 409 for duplicate company (error code 23505)', async () => {
      mockReq.body = { org_name: 'Duplicate Company' };
      const error = new Error('Company already exists');
      error.code = '23505';
      mockCompanyService.createCompany.mockRejectedValue(error);

      await controller.createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Company already exists'
      });
    });

    it('should return 400 for general errors with message', async () => {
      mockReq.body = { org_name: 'Test Company' };
      mockCompanyService.createCompany.mockRejectedValue(new Error('Validation error'));

      await controller.createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error'
      });
    });

    it('should return default error message when error.message is empty', async () => {
      mockReq.body = { org_name: 'Test Company' };
      mockCompanyService.createCompany.mockRejectedValue(new Error(''));

      await controller.createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างบริษัท'
      });
    });

    it('should return default error message when error has no message property', async () => {
      mockReq.body = { org_name: 'Test Company' };
      const error = {};
      mockCompanyService.createCompany.mockRejectedValue(error);

      await controller.createCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างบริษัท'
      });
    });
  });

  describe('getCompanyById', () => {
    it('should get company successfully', async () => {
      const company = { org_id: 'org-123', org_name: 'Test Company' };
      mockReq.params = { orgId: 'org-123' };
      mockCompanyService.getCompanyById.mockResolvedValue(company);

      await controller.getCompanyById(mockReq, mockRes);

      expect(mockCompanyService.getCompanyById).toHaveBeenCalledWith('org-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: company
      });
    });

    it('should return 404 when company not found (message contains ไม่พบ)', async () => {
      mockReq.params = { orgId: 'non-existent' };
      mockCompanyService.getCompanyById.mockRejectedValue(new Error('ไม่พบบริษัท'));

      await controller.getCompanyById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'ไม่พบบริษัท'
      });
    });

    it('should return 500 for server errors (message does not contain ไม่พบ)', async () => {
      mockReq.params = { orgId: 'org-123' };
      mockCompanyService.getCompanyById.mockRejectedValue(new Error('Database error'));

      await controller.getCompanyById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error'
      });
    });
  });

  describe('getUserCompanies', () => {
    it('should return 401 if user is not authenticated (user is null)', async () => {
      mockReq.user = null;

      await controller.getUserCompanies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized'
      });
    });

    it('should return 401 if user_id is missing', async () => {
      mockReq.user = {};

      await controller.getUserCompanies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized'
      });
    });

    it('should return 401 if user_id is undefined', async () => {
      mockReq.user = { user_id: undefined };

      await controller.getUserCompanies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized'
      });
    });

    it('should get user companies successfully', async () => {
      const companies = [
        { org_id: 'org-1', org_name: 'Company 1' },
        { org_id: 'org-2', org_name: 'Company 2' }
      ];
      mockCompanyService.getUserCompanies.mockResolvedValue(companies);

      await controller.getUserCompanies(mockReq, mockRes);

      expect(mockCompanyService.getUserCompanies).toHaveBeenCalledWith('user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: companies
      });
    });

    it('should return 500 for server errors', async () => {
      mockCompanyService.getUserCompanies.mockRejectedValue(new Error('Database error'));

      await controller.getUserCompanies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลบริษัท'
      });
    });
  });

  describe('updateCompany', () => {
    it('should update company successfully', async () => {
      const updateData = { org_name: 'Updated Company' };
      const updatedCompany = { org_id: 'org-123', ...updateData };
      
      mockReq.params = { orgId: 'org-123' };
      mockReq.body = updateData;
      mockCompanyService.updateCompany.mockResolvedValue(updatedCompany);

      await controller.updateCompany(mockReq, mockRes);

      expect(mockCompanyService.updateCompany).toHaveBeenCalledWith(
        'org-123',
        'user-123',
        1,
        updateData
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'อัปเดตข้อมูลสำเร็จ',
        data: updatedCompany
      });
    });

    it('should return 409 for duplicate company name (error code 23505)', async () => {
      mockReq.params = { orgId: 'org-123' };
      mockReq.body = { org_name: 'Duplicate Name' };
      
      const error = new Error('Duplicate company name');
      error.code = '23505';
      mockCompanyService.updateCompany.mockRejectedValue(error);

      await controller.updateCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Duplicate company name'
      });
    });

    it('should return 404 when company not found (message contains ไม่พบ)', async () => {
      mockReq.params = { orgId: 'non-existent' };
      mockReq.body = { org_name: 'Updated Company' };
      mockCompanyService.updateCompany.mockRejectedValue(new Error('ไม่พบบริษัท'));

      await controller.updateCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'ไม่พบบริษัท'
      });
    });

    it('should return 403 when user is not OWNER (message contains OWNER)', async () => {
      mockReq.params = { orgId: 'org-123' };
      mockReq.body = { org_name: 'Updated Company' };
      mockCompanyService.updateCompany.mockRejectedValue(new Error('Only OWNER can update'));

      await controller.updateCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Only OWNER can update'
      });
    });

    it('should return 500 for other server errors', async () => {
      mockReq.params = { orgId: 'org-123' };
      mockReq.body = { org_name: 'Updated Company' };
      mockCompanyService.updateCompany.mockRejectedValue(new Error('Database error'));

      await controller.updateCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error'
      });
    });
  });

  describe('deleteCompany', () => {
    it('should delete company successfully', async () => {
      mockReq.params = { orgId: 'org-123' };
      mockCompanyService.deleteCompany.mockResolvedValue();

      await controller.deleteCompany(mockReq, mockRes);

      expect(mockCompanyService.deleteCompany).toHaveBeenCalledWith('org-123', 'user-123', 1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'ลบบริษัทสำเร็จ'
      });
    });

    it('should return 404 when company not found (message contains ไม่พบ)', async () => {
      mockReq.params = { orgId: 'non-existent' };
      mockCompanyService.deleteCompany.mockRejectedValue(new Error('ไม่พบบริษัท'));

      await controller.deleteCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'ไม่พบบริษัท'
      });
    });

    it('should return 403 when user is not OWNER (message contains OWNER)', async () => {
      mockReq.params = { orgId: 'org-123' };
      mockCompanyService.deleteCompany.mockRejectedValue(new Error('Only OWNER can delete'));

      await controller.deleteCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Only OWNER can delete'
      });
    });

    it('should return 500 for other server errors', async () => {
      mockReq.params = { orgId: 'org-123' };
      mockCompanyService.deleteCompany.mockRejectedValue(new Error('Database error'));

      await controller.deleteCompany(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error'
      });
    });
  });
});
