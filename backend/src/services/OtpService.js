// src/services/OtpService.js
import { sendEmail } from "../utils/mailer.js";
import { createError } from "../middleware/errorHandler.js";
import logger from "../utils/logger.js";
import redisClient from "../config/redis.js"; 

export const createOtpService = (deps = {}) => {
  const mailer = deps.sendEmail || sendEmail;

  // Generate numeric OTP
  const generateNumericOTP = (length = 6) => {
    let otp = "";
    for (let i = 0; i < length; i++) {
      otp += Math.floor(Math.random() * 10);
    }
    return otp;
  };

  /**
   * ✅ Check rate limit using Redis
   */
  const checkRateLimit = async (email, purpose) => {
    const limitKey = `ratelimit:otp:${purpose}:${email}`;
    const limitCount = 3;
    const limitWindow = 300; 

    const currentCount = await redisClient.incr(limitKey);

    if (currentCount === 1) {
      await redisClient.expire(limitKey, limitWindow);
    }

    if (currentCount > limitCount) {
      const ttl = await redisClient.ttl(limitKey);
      throw createError.tooManyRequests(`ขอ OTP บ่อยเกินไป กรุณารอ ${Math.ceil(ttl / 60)} นาที`);
    }

    return true; 
  };

  /**
   * ✅ Send OTP -> Store in Redis
   */
  const sendOtp = async (email, purpose = "email_verification") => {
    // 1. Check Rate Limit
    await checkRateLimit(email, purpose);

    const otpCode = generateNumericOTP(6);
    const ttl = 300; 
    const redisKey = `otp:${purpose}:${email}`;

    await redisClient.setEx(redisKey, ttl, otpCode);

    const subjectMap = {
      email_verification: "รหัส OTP ยืนยันอีเมล",
      change_email: "รหัส OTP ยืนยันการเปลี่ยนอีเมล",
    };
    
    const expiresAt = new Date(Date.now() + ttl * 1000);
    const subject = subjectMap[purpose] || "รหัส OTP";
    const html = generateOtpEmailHtml(otpCode, purpose, expiresAt);
    try {
        await mailer(email, subject, html);
    } catch (error) {
        logger.error(`Failed to send OTP email to ${email}:`, error);
        throw createError.serviceUnavailable("ไม่สามารถส่งอีเมลได้ในขณะนี้");
    }

    logger.info(`📧 OTP sent to ${email} for ${purpose} (TTL: ${ttl}s)`);

    return {
      success: true,
      message: "ส่งรหัส OTP เรียบร้อยแล้ว",
      email: email,
      expires_at: expiresAt,
    };
  };

  /**
   * ✅ Verify OTP from Redis
   */
  const verifyOtp = async (email, otpCode, purpose = "email_verification") => {
    if (!email || !otpCode) {
      throw createError.badRequest("กรุณากรอกอีเมลและรหัส OTP");
    }

    const redisKey = `otp:${purpose}:${email}`;
    const storedOtp = await redisClient.get(redisKey);

    if (!storedOtp) {
      throw createError.badRequest("รหัส OTP หมดอายุหรือไม่ถูกต้อง");
    }

    if (storedOtp !== otpCode) {
      throw createError.badRequest("รหัส OTP ไม่ถูกต้อง");
    }

    await redisClient.del(redisKey);

    return {
      success: true,
      message: "ยืนยัน OTP สำเร็จ",
      verified: true,
    };
  };

  /**
   * ✅ Resend OTP
   */
  const resendOtp = async (email, purpose = "email_verification") => {
    // การ Resend ก็ต้องติด Rate Limit เดียวกัน
    return await sendOtp(email, purpose);
  };

  /**
   * ✅ Generate HTML 
   */
  const generateOtpEmailHtml = (otpCode, purpose, expiresAt) => {
    const purposeText =
      purpose === "email_verification"
        ? "ยืนยันอีเมลของคุณ"
        : "ยืนยันการเปลี่ยนอีเมล";
    const expiryMinutes = 5;

    return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>รหัส OTP</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                🔐 รหัส OTP
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px;">
                กรุณาใช้รหัสนี้เพื่อ${purposeText}
              </p>
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px 40px; border-radius: 12px; margin: 25px 0;">
                <p style="margin: 0; color: #ffffff; font-size: 40px; font-weight: 700; letter-spacing: 12px; font-family: 'Courier New', monospace;">
                  ${otpCode}
                </p>
              </div>
              <div style="margin: 25px 0; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 6px; text-align: left;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  ⏱️ <strong>รหัสนี้จะหมดอายุใน ${expiryMinutes} นาที</strong>
                </p>
              </div>
              <p style="margin: 25px 0 0; color: #718096; font-size: 13px; line-height: 1.6;">
                หากคุณไม่ได้ร้องขอรหัสนี้ กรุณาเพิกเฉยอีเมลนี้<br>
                ห้ามแชร์รหัสนี้กับผู้อื่น
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f7fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                © ${new Date().getFullYear()} Intern Project. สงวนลิขสิทธิ์
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
  };

  return {
    sendOtp,
    verifyOtp,
    resendOtp,
    checkRateLimit,
  };
};

const defaultInstance = createOtpService();
export default defaultInstance;