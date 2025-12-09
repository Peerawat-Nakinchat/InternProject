// src/services/OtpService.js
import { OtpModel } from "../models/OtpModel.js";
import { sendEmail } from "../utils/mailer.js";
import { createError } from "../middleware/errorHandler.js";
import logger from "../utils/logger.js";

export const createOtpService = (deps = {}) => {
  const otpModel = deps.OtpModel || OtpModel;
  const mailer = deps.sendEmail || sendEmail;
  const env = deps.env || process.env;

  /**
   * ✅ Check rate limit before sending OTP
   */
  const checkRateLimit = async (email, purpose) => {
    const recentCount = await otpModel.getRecentCount(email, purpose, 15);
    if (recentCount >= 3) {
      throw createError.tooManyRequests("คุณขอ OTP บ่อยเกินไป กรุณารอ 15 นาที");
    }
    return true;
  };

  /**
   * ✅ Send OTP to email
   */
  const sendOtp = async (email, purpose = "email_verification") => {
    // Check rate limit
    await checkRateLimit(email, purpose);

    // Create OTP
    const { plainOtp, expires_at } = await otpModel.create(email, purpose);

    // Prepare email content
    const subjectMap = {
      email_verification: "รหัส OTP ยืนยันอีเมล",
      change_email: "รหัส OTP ยืนยันการเปลี่ยนอีเมล",
    };

    const subject = subjectMap[purpose] || "รหัส OTP";

    const html = generateOtpEmailHtml(plainOtp, purpose, expires_at);

    // Send email
    await mailer(email, subject, html);

    logger.info(`📧 OTP sent to ${email} for ${purpose}`);

    return {
      success: true,
      message: "ส่งรหัส OTP ไปยังอีเมลเรียบร้อยแล้ว",
      email: email,
      expires_at: expires_at,
    };
  };

  /**
   * ✅ Verify OTP
   */
  const verifyOtp = async (email, otpCode, purpose = "email_verification") => {
    if (!email || !otpCode) {
      throw createError.badRequest("กรุณากรอกอีเมลและรหัส OTP");
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otpCode)) {
      throw createError.badRequest("รหัส OTP ต้องเป็นตัวเลข 6 หลัก");
    }

    const result = await otpModel.verify(email, otpCode, purpose);

    if (!result.valid) {
      const error = createError.badRequest(result.reason);
      error.attemptsLeft = result.attemptsLeft;
      throw error;
    }

    return {
      success: true,
      message: "ยืนยัน OTP สำเร็จ",
      verified: true,
    };
  };

  /**
   * ✅ Resend OTP (same as sendOtp but with different message)
   */
  const resendOtp = async (email, purpose = "email_verification") => {
    const result = await sendOtp(email, purpose);
    return {
      ...result,
      message: "ส่งรหัส OTP ใหม่เรียบร้อยแล้ว",
    };
  };

  /**
   * ✅ Generate OTP Email HTML
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

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                🔐 รหัส OTP
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              
              <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px;">
                กรุณาใช้รหัสนี้เพื่อ${purposeText}
              </p>

              <!-- OTP Code Box -->
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

          <!-- Footer -->
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
</html>
    `.trim();
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
