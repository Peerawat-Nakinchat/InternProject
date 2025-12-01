/**
 * Mock InvitationService for Testing
 */

const mockInvitationService = {
  sendInvitation: jest.fn(),
  getInvitationInfo: jest.fn(),
  acceptInvitation: jest.fn(),
  cancelInvitation: jest.fn(),
  resendInvitation: jest.fn(),
  getOrganizationInvitations: jest.fn()
};

export default mockInvitationService;
