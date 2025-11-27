import { body, param, query, validationResult } from "express-validator";
import { securityLogger } from '../utils/logger.js';

/**
 * Middleware to handle validation errors with security logging
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Log validation failures for security monitoring
    const errorDetails = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: typeof err.value === 'string' ? err.value.substring(0, 50) : err.value
    }));

    securityLogger.suspiciousActivity(
      'Validation failed',
      req.clientInfo?.ipAddress || req.ip,
      req.clientInfo?.userAgent || 'unknown',
      { 
        path: req.path,
        errors: errorDetails 
      }
    );

    return res.status(400).json({
      success: false,
      error: "ข้อมูลไม่ถูกต้อง",
      details: errorDetails
    });
  }
  
  next();
};

/**
 * Enhanced password validation
 */
const validatePasswordStrength = (password) => {
  if (!password || typeof password !== 'string') {
    throw new Error("รหัสผ่านต้องเป็นข้อความ");
  }

  const minLength = 8;
  const maxLength = 128;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(password);

  // Check for common weak passwords
  const commonPasswords = [
    'password', 'Password123', '12345678', 'admin123', 
    'qwerty123', 'abc123456', 'password1'
  ];
  
  if (commonPasswords.some(weak => password.toLowerCase().includes(weak.toLowerCase()))) {
    throw new Error("รหัสผ่านนี้ถูกใช้บ่อยเกินไป กรุณาเลือกรหัสผ่านที่ปลอดภัยกว่า");
  }

  // Check for sequential characters
  const hasSequential = /(?:abc|bcd|cde|def|012|123|234|345|456|567|678|789)/i.test(password);
  if (hasSequential) {
    throw new Error("รหัสผ่านไม่ควรมีตัวอักษรหรือตัวเลขที่ต่อเนื่องกัน");
  }

  if (password.length < minLength) {
    throw new Error(`รหัสผ่านต้องมีอย่างน้อย ${minLength} ตัวอักษร`);
  }

  if (password.length > maxLength) {
    throw new Error(`รหัสผ่านต้องไม่เกิน ${maxLength} ตัวอักษร`);
  }

  if (!hasUpperCase || !hasLowerCase) {
    throw new Error("รหัสผ่านต้องมีทั้งตัวพิมพ์ใหญ่และเล็ก");
  }

  if (!hasNumber) {
    throw new Error("รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว");
  }

  if (!hasSpecialChar) {
    throw new Error("รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว");
  }

  return true;
};

/**
 * Sanitize string input to prevent XSS and injection
 */
const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  
  // Remove potential XSS patterns
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

/**
 * Validation rules for user registration
 */
export const validateRegister = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("กรุณากรอกอีเมล")
    .isEmail()
    .withMessage("รูปแบบอีเมลไม่ถูกต้อง")
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage("อีเมลยาวเกินไป")
    .customSanitizer(sanitizeString),

  body("password")
    .custom((value) => validatePasswordStrength(value))
    .withMessage("รหัสผ่านไม่ตรงตามข้อกำหนด"),

  body("name")
    .trim()
    .notEmpty()
    .withMessage("กรุณากรอกชื่อ")
    .isLength({ min: 1, max: 200 })
    .withMessage("ชื่อต้องมีความยาว 1-200 ตัวอักษร")
    .matches(/^[a-zA-Zก-๙\s\-']+$/)
    .withMessage("ชื่อมีอักขระที่ไม่อนุญาต")
    .customSanitizer(sanitizeString),

  body("surname")
    .trim()
    .notEmpty()
    .withMessage("กรุณากรอกนามสกุล")
    .isLength({ min: 1, max: 200 })
    .withMessage("นามสกุลต้องมีความยาว 1-200 ตัวอักษร")
    .matches(/^[a-zA-Zก-๙\s\-']+$/)
    .withMessage("นามสกุลมีอักขระที่ไม่อนุญาต")
    .customSanitizer(sanitizeString),

  body("sex")
    .isIn(["M", "F", "O"])
    .withMessage("เพศต้องเป็น M, F หรือ O เท่านั้น"),

  body("user_address_1")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("ที่อยู่ยาวเกินไป")
    .customSanitizer(sanitizeString),

  body("user_address_2")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("ที่อยู่ยาวเกินไป")
    .customSanitizer(sanitizeString),

  body("user_address_3")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("ที่อยู่ยาวเกินไป")
    .customSanitizer(sanitizeString),

  handleValidationErrors,
];

/**
 * Validation rules for user login
 */
export const validateLogin = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("กรุณากรอกอีเมล")
    .isEmail()
    .withMessage("รูปแบบอีเมลไม่ถูกต้อง")
    .normalizeEmail()
    .customSanitizer(sanitizeString),

  body("password")
    .notEmpty()
    .withMessage("กรุณากรอกรหัสผ่าน")
    .isLength({ min: 1, max: 128 })
    .withMessage("รหัสผ่านไม่ถูกต้อง"),

  handleValidationErrors,
];

/**
 * Validation rules for forgot password
 */
export const validateForgotPassword = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("กรุณากรอกอีเมล")
    .isEmail()
    .withMessage("รูปแบบอีเมลไม่ถูกต้อง")
    .normalizeEmail()
    .customSanitizer(sanitizeString),

  handleValidationErrors,
];

/**
 * Validation rules for reset password
 */
export const validateResetPassword = [
  body("token")
    .notEmpty()
    .withMessage("กรุณากรอก token")
    .isUUID()
    .withMessage("Token ไม่ถูกต้อง"),

  body("password")
    .custom((value) => validatePasswordStrength(value))
    .withMessage("รหัสผ่านไม่ตรงตามข้อกำหนด"),

  handleValidationErrors,
];

/**
 * Validation rules for change email
 */
export const validateChangeEmail = [
  body("newEmail")
    .trim()
    .notEmpty()
    .withMessage("กรุณากรอกอีเมลใหม่")
    .isEmail()
    .withMessage("รูปแบบอีเมลใหม่ไม่ถูกต้อง")
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage("อีเมลยาวเกินไป")
    .customSanitizer(sanitizeString),

  body("password")
    .notEmpty()
    .withMessage("กรุณากรอกรหัสผ่านเพื่อยืนยัน"),

  handleValidationErrors,
];

/**
 * Validation rules for change password
 */
export const validateChangePassword = [
  body("oldPassword")
    .notEmpty()
    .withMessage("กรุณากรอกรหัสผ่านเดิม"),

  body("newPassword")
    .custom((value) => validatePasswordStrength(value))
    .withMessage("รหัสผ่านใหม่ไม่ตรงตามข้อกำหนด"),

  // Ensure new password is different from old
  body("newPassword")
    .custom((value, { req }) => value !== req.body.oldPassword)
    .withMessage("รหัสผ่านใหม่ต้องไม่เหมือนรหัสผ่านเดิม"),

  handleValidationErrors,
];

/**
 * Validation rules for UUID parameters
 */
export const validateUUID = (paramName = 'id') => [
  param(paramName)
    .isUUID()
    .withMessage(`${paramName} ต้องเป็น UUID ที่ถูกต้อง`),

  handleValidationErrors,
];

/**
 * Validation rules for organization creation
 */
export const validateCreateOrganization = [
  body("org_name")
    .trim()
    .notEmpty()
    .withMessage("กรุณากรอกชื่อบริษัท")
    .isLength({ min: 1, max: 1000 })
    .withMessage("ชื่อบริษัทต้องมีความยาว 1-1000 ตัวอักษร")
    .customSanitizer(sanitizeString),

  body("org_code")
    .trim()
    .notEmpty()
    .withMessage("กรุณากรอกรหัสบริษัท")
    .isLength({ min: 1, max: 50 })
    .withMessage("รหัสบริษัทต้องมีความยาว 1-50 ตัวอักษร")
    .matches(/^[A-Z0-9_-]+$/i)
    .withMessage("รหัสบริษัทต้องเป็นตัวอักษร ตัวเลข _ หรือ - เท่านั้น")
    .customSanitizer((value) => value.toUpperCase()),

  body("org_address_1")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("ที่อยู่ยาวเกินไป")
    .customSanitizer(sanitizeString),

  handleValidationErrors,
];

/**
 * Validation rules for member invitation
 */
export const validateInviteMember = [
  body("invitedUserId")
    .notEmpty()
    .withMessage("กรุณาระบุ User ID")
    .isUUID()
    .withMessage("User ID ต้องเป็น UUID ที่ถูกต้อง"),

  body("roleId")
    .notEmpty()
    .withMessage("กรุณาระบุบทบาท")
    .isInt({ min: 1, max: 5 })
    .withMessage("บทบาทต้องเป็นตัวเลข 1-5")
    .isIn([3, 4, 5])
    .withMessage("บทบาทต้องเป็น USER(3), VIEWER(4) หรือ AUDITOR(5)"),

  handleValidationErrors,
];

/**
 * Validation rules for pagination
 */
export const validatePagination = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("หน้าต้องเป็นตัวเลขมากกว่า 0")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("จำนวนต่อหน้าต้องอยู่ระหว่าง 1-100")
    .toInt(),

  handleValidationErrors,
];

/**
 * Validation rules for update profile
 */
export const validateUpdateProfile = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("ชื่อต้องไม่ว่าง")
    .isLength({ min: 1, max: 200 })
    .withMessage("ชื่อต้องมีความยาว 1-200 ตัวอักษร")
    .matches(/^[a-zA-Zก-๙\s\-']+$/)
    .withMessage("ชื่อมีอักขระที่ไม่อนุญาต")
    .customSanitizer(sanitizeString),

  body("surname")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("นามสกุลต้องไม่ว่าง")
    .isLength({ min: 1, max: 200 })
    .withMessage("นามสกุลต้องมีความยาว 1-200 ตัวอักษร")
    .matches(/^[a-zA-Zก-๙\s\-']+$/)
    .withMessage("นามสกุลมีอักขระที่ไม่อนุญาต")
    .customSanitizer(sanitizeString),

  body("sex")
    .optional()
    .isIn(["M", "F", "O"])
    .withMessage("เพศต้องเป็น M, F หรือ O เท่านั้น"),

  body("profile_image_url")
    .optional()
    .trim()
    .isURL({ protocols: ['http', 'https'] })
    .withMessage("URL รูปภาพไม่ถูกต้อง")
    .isLength({ max: 2000 })
    .withMessage("URL ยาวเกินไป"),

  handleValidationErrors,
];

export default {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangeEmail,
  validateChangePassword,
  validateUUID,
  validateCreateOrganization,
  validateInviteMember,
  validatePagination,
  validateUpdateProfile
};