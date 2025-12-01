/**
 * Mock AuditLogService for Testing
 */

const mockAuditLogService = {
  query: jest.fn(),
  getUserActivity: jest.fn(),
  getRecentActivity: jest.fn(),
  getSecurityEvents: jest.fn(),
  getFailedActions: jest.fn(),
  getSuspiciousActivity: jest.fn(),
  getStatistics: jest.fn(),
  getCorrelatedActions: jest.fn(),
  exportLogs: jest.fn(),
  cleanup: jest.fn()
};

export default mockAuditLogService;
