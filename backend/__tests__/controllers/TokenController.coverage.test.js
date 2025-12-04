import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createTokenController } from '../../src/controllers/TokenController.js';

describe('TokenController (Full Coverage)', () => {
  let controller, mockAuthService, mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService = { refreshToken: jest.fn() };
    controller = createTokenController({ authService: mockAuthService });
    mockReq = { body: {}, query: {} };
    mockRes = { json: jest.fn() };
    mockNext = jest.fn();
  });

  describe('createNewAccessToken', () => {
    it('should accept token from req.body', async () => {
      mockReq.body.token = 'body-token';
      mockAuthService.refreshToken.mockResolvedValue({ accessToken: 'new' });

      await controller.createNewAccessToken(mockReq, mockRes, mockNext);

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('body-token');
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should accept token from req.query if body is empty', async () => {
      mockReq.body = {}; // Empty body
      mockReq.query.token = 'query-token'; // Token in query
      mockAuthService.refreshToken.mockResolvedValue({ accessToken: 'new' });

      await controller.createNewAccessToken(mockReq, mockRes, mockNext);

      // Verify it picked up the query token
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('query-token');
    });

    it('should call next() on service error', async () => {
      mockReq.body.token = 'bad';
      const error = new Error('Invalid');
      mockAuthService.refreshToken.mockRejectedValue(error);

      await controller.createNewAccessToken(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});