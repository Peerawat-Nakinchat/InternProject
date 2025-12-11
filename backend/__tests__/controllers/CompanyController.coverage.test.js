import { jest } from '@jest/globals';
import { createCompanyController } from '../../src/controllers/CompanyController.js';
import { createError } from '../../src/middleware/errorHandler.js';

// Mock dependencies
const mockCompanyService = {
  createCompany: jest.fn(),
  getUserCompanies: jest.fn(),
  getCompanyById: jest.fn(),
  updateCompany: jest.fn(),
  deleteCompany: jest.fn()
};

const mockRes = {
  json: jest.fn(),
  status: jest.fn().mockReturnThis(),
  send: jest.fn()
};

const mockNext = jest.fn();

describe('CompanyController (Full Coverage)', () => {
  let controller;
  let req;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = createCompanyController(mockCompanyService);
    req = {
      user: { user_id: 'user-123', org_role_id: 'admin' },
      body: {},
      params: {}
    };
  });

  describe('createCompany', () => {
    it('should throw Unauthorized if ownerUserId is missing', async () => {
      req.user = {}; // No user_id

      await controller.createCompany(req, mockRes, mockNext);

      // Expect Unauthorized Error
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ 
           message: expect.stringMatching(/Unauthorized/i),
           statusCode: 401 // createError.unauthorized usually returns 401
        })
      );
    });

    it('should create company successfully', async () => {
      req.body = { name: 'New Corp' };
      mockCompanyService.createCompany.mockResolvedValue({ id: 1, name: 'New Corp' });

      await controller.createCompany(req, mockRes, mockNext);

      expect(mockCompanyService.createCompany).toHaveBeenCalledWith('user-123', req.body);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('getUserCompanies', () => {
    it('should throw Unauthorized if userId is missing', async () => {
      req.user = {}; // No user_id

      await controller.getUserCompanies(req, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ 
          message: expect.stringMatching(/Unauthorized/i),
          statusCode: 401
        })
      );
    });

    it('should return companies', async () => {
      mockCompanyService.getUserCompanies.mockResolvedValue([]);

      await controller.getUserCompanies(req, mockRes, mockNext);

      expect(mockCompanyService.getUserCompanies).toHaveBeenCalledWith('user-123');
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  // Test cases อื่นๆ (getCompanyById, updateCompany, deleteCompany) เหมือนเดิม
  describe('getCompanyById', () => {
    it('should return company', async () => {
      req.params.orgId = 'org-1';
      mockCompanyService.getCompanyById.mockResolvedValue({});
      await controller.getCompanyById(req, mockRes, mockNext);
      expect(mockCompanyService.getCompanyById).toHaveBeenCalledWith('org-1');
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('updateCompany', () => {
    it('should update company', async () => {
      req.params.orgId = 'org-1';
      mockCompanyService.updateCompany.mockResolvedValue({});
      await controller.updateCompany(req, mockRes, mockNext);
      expect(mockCompanyService.updateCompany).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('deleteCompany', () => {
    it('should delete company', async () => {
      req.params.orgId = 'org-1';
      mockCompanyService.deleteCompany.mockResolvedValue(true);
      await controller.deleteCompany(req, mockRes, mockNext);
      expect(mockCompanyService.deleteCompany).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalled();
    });
  });
});