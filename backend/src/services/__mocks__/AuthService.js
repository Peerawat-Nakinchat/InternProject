/**
 * Mock AuthService for Testing
 */

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refreshToken: jest.fn(),
  getProfile: jest.fn(),
  forgotPassword: jest.fn(),
  verifyResetToken: jest.fn(),
  resetPassword: jest.fn(),
  changeEmail: jest.fn(),
  changePassword: jest.fn(),
  updateProfile: jest.fn(),
  logout: jest.fn(),
  logoutAll: jest.fn(),
  googleAuthCallback: jest.fn()
};

export default mockAuthService;
