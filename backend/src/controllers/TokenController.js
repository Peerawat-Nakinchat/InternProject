import AuthService from '../services/AuthService.js'; 
import { ResponseHandler } from "../utils/responseHandler.js";
import { asyncHandler } from '../middleware/errorHandler.js';

export const createTokenController = (deps = {}) => {
  const authService = deps.authService || AuthService;

  // POST /api/token/refresh
  const createNewAccessToken = asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken || req.body.token;
    
    if (!token) {
       return ResponseHandler.error(res, "Refresh Token Required", 401);
    }

    const result = await authService.refreshToken(token);

    return ResponseHandler.success(res, result);
  });

  return { createNewAccessToken };
};

const TokenController = createTokenController();

export const {
  createNewAccessToken
} = TokenController

export default TokenController