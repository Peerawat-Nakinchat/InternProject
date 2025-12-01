/**
 * Mock MemberService for Testing
 */

const mockMemberService = {
  getMembers: jest.fn(),
  inviteMember: jest.fn(),
  changeMemberRole: jest.fn(),
  removeMember: jest.fn(),
  transferOwner: jest.fn()
};

export default mockMemberService;
