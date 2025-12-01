/**
 * Mock CompanyService for Testing
 */

const mockCompanyService = {
  createCompany: jest.fn(),
  getCompanyById: jest.fn(),
  getUserCompanies: jest.fn(),
  updateCompany: jest.fn(),
  deleteCompany: jest.fn()
};

export default mockCompanyService;
