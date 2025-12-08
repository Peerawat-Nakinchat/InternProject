// src/controllers/OtpController.js
import OtpService from "../services/OtpService.js";
import { UserModel } from "../models/UserModel.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { ResponseHandler } from "../utils/responseHandler.js";

export const createOtpController = (deps = {}) => {
  const otpService = deps.OtpService || OtpService;
  const userModel = deps.UserModel || UserModel;

  /**
   * POST /auth/send-otp
   * ส่ง OTP ไปยังอีเมล (สำหรับ email verification หรือ change email)
   */
  const sendOtp = asyncHandler(async (req, res) => {
    const { email, purpose = "email_verification" } = req.body;

    if (!email) {
      return ResponseHandler.error(res, "กรุณากรอกอีเมล", 400);
    }

    // Validate purpose
    if (!["email_verification", "change_email"].includes(purpose)) {
      return ResponseHandler.error(res, "Purpose ไม่ถูกต้อง", 400);
    }

    const result = await otpService.sendOtp(email, purpose);

    return ResponseHandler.success(
      res,
      {
        message: result.message,
        email: result.email,
        expires_at: result.expires_at,
      },
      result.message,
    );
  });

  /**
   * POST /auth/verify-otp
   * ยืนยัน OTP
   */
  const verifyOtp = asyncHandler(async (req, res) => {
    const { email, otp, purpose = "email_verification" } = req.body;

    if (!email || !otp) {
      return ResponseHandler.error(res, "กรุณากรอกอีเมลและรหัส OTP", 400);
    }

    // Verify OTP
    const result = await otpService.verifyOtp(email, otp, purpose);

    // If verification successful and purpose is email_verification, update user
    if (result.verified && purpose === "email_verification") {
      // Find user by email and set as verified
      const user = await userModel.findByEmail(email);
      if (user) {
        await userModel.setEmailVerified(user.user_id, true);
      }
    }

    return ResponseHandler.success(
      res,
      {
        verified: true,
        purpose,
      },
      result.message,
    );
  });

  /**
   * POST /auth/resend-otp
   * ส่ง OTP ใหม่
   */
  const resendOtp = asyncHandler(async (req, res) => {
    const { email, purpose = "email_verification" } = req.body;

    if (!email) {
      return ResponseHandler.error(res, "กรุณากรอกอีเมล", 400);
    }

    const result = await otpService.resendOtp(email, purpose);

    return ResponseHandler.success(
      res,
      {
        message: result.message,
        email: result.email,
        expires_at: result.expires_at,
      },
      result.message,
    );
  });

  return {
    sendOtp,
    verifyOtp,
    resendOtp,
  };
};

const defaultController = createOtpController();

export const { sendOtp, verifyOtp, resendOtp } = defaultController;

export default defaultController;
