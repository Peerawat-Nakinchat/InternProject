// src/controllers/TokenController.js
import { asyncHandler } from '../middleware/errorHandler.js';
import AuthService from '../services/AuthService.js'; // ✅ Import Service

export const createTokenController = (deps = {}) => {
  const authService = deps.authService || AuthService;

  // POST /api/token/refresh
  const createNewAccessToken = asyncHandler(async (req, res) => {
    // Logic การเช็ค Token และ Refresh จะถูกโยนให้ Service จัดการ
    // ถ้า Token ไม่ผ่าน Service จะ throw error เอง
    const result = await authService.refreshToken(req.body.token || req.query.token);

    res.json({
      success: true,
      ...result
    });
  });

  return { createNewAccessToken };
};

const defaultController = createTokenController();
export const createNewAccessToken = defaultController.createNewAccessToken;