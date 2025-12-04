import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createCompanyController } from '../../src/controllers/CompanyController.js';

describe('CompanyController (Full Coverage)', () => {
  let controller, mockService, mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockService = {
      createCompany: jest.fn(),
      getCompanyById: jest.fn(),
      getUserCompanies: jest.fn(),
      updateCompany: jest.fn(),
      deleteCompany: jest.fn()
    };
    controller = createCompanyController(mockService);
    mockReq = {
      user: { user_id: 'u1', org_role_id: 1 },
      body: {},
      params: {}
    };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    mockNext = jest.fn();
  });

  describe('createCompany', () => {
    it('should throw Unauthorized if ownerUserId is missing', async () => {
      mockReq.user = {}; // No user_id
      
      await controller.createCompany(mockReq, mockRes, mockNext);

      // Verify it hit the `if (!ownerUserId)` branch
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringMatching(/Unauthorized/i)
      }));
    });

    it('should create company successfully', async () => {
      mockReq.body = { name: 'Comp' };
      mockService.createCompany.mockResolvedValue({ id: 'c1' });

      await controller.createCompany(mockReq, mockRes, mockNext);

      expect(mockService.createCompany).toHaveBeenCalledWith('u1', { name: 'Comp' });
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getUserCompanies', () => {
    it('should throw Unauthorized if userId is missing', async () => {
      mockReq.user = {}; // No user_id
      await controller.getUserCompanies(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringMatching(/Unauthorized/i)
      }));
    });

    it('should return companies', async () => {
      mockService.getUserCompanies.mockResolvedValue([]);
      await controller.getUserCompanies(mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  // Basic coverage for others
  describe('getCompanyById', () => {
    it('should return company', async () => {
      mockReq.params.orgId = 'o1';
      mockService.getCompanyById.mockResolvedValue({});
      await controller.getCompanyById(mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('updateCompany', () => {
    it('should update company', async () => {
      mockReq.params.orgId = 'o1';
      mockService.updateCompany.mockResolvedValue({});
      await controller.updateCompany(mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('deleteCompany', () => {
    it('should delete company', async () => {
      mockReq.params.orgId = 'o1';
      mockService.deleteCompany.mockResolvedValue();
      await controller.deleteCompany(mockReq, mockRes, mockNext);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });
});