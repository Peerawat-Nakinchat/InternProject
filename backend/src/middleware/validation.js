// src/middleware/validation.js
import { body, validationResult } from 'express-validator';
import { createError } from './errorHandler.js';

/**
 * Middleware to handle validation errors
 * จะแปลง Error จาก express-validator ให้เป็น Format ของ AppError
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));

    // โยนไปให้ Global Error Handler (จะได้ 400 Bad Request)
    return next(createError.validation('ข้อมูลไม่ถูกต้อง (Validation Error)', details));
  }
  next();
};

/**
 * Register validation
 */
export const validateRegister = [
  body('email')
    .isEmail().withMessage('กรุณากรอกอีเมลที่ถูกต้อง')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
  body('name')
    .trim().notEmpty().withMessage('กรุณากรอกชื่อ')
    .isLength({ max: 200 }).withMessage('ชื่อต้องไม่เกิน 200 ตัวอักษร'),
  body('surname')
    .trim().notEmpty().withMessage('กรุณากรอกนามสกุล')
    .isLength({ max: 200 }).withMessage('นามสกุลต้องไม่เกิน 200 ตัวอักษร'),
  body('sex')
    .isIn(['M', 'F', 'O']).withMessage('เพศต้องเป็น M, F, หรือ O'),
  handleValidationErrors,
];

/**
 * Login validation
 */
export const validateLogin = [
  body('email')
    .isEmail().withMessage('กรุณากรอกอีเมลที่ถูกต้อง')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('กรุณากรอกรหัสผ่าน'),
  handleValidationErrors,
];

/**
 * Forgot password validation
 */
export const validateForgotPassword = [
  body('email')
    .isEmail().withMessage('กรุณากรอกอีเมลที่ถูกต้อง')
    .normalizeEmail(),
  handleValidationErrors,
];

/**
 * Reset password validation
 */
export const validateResetPassword = [
  body('token')
    .notEmpty().withMessage('กรุณาระบุ token'),
  body('password')
    .isLength({ min: 6 }).withMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
  handleValidationErrors,
];

/**
 * Change email validation
 */
export const validateChangeEmail = [
  body('newEmail')
    .isEmail().withMessage('กรุณากรอกอีเมลที่ถูกต้อง')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('กรุณากรอกรหัสผ่านปัจจุบัน'),
  handleValidationErrors,
];

/**
 * Change password validation
 */
export const validateChangePassword = [
  body('oldPassword')
    .notEmpty().withMessage('กรุณากรอกรหัสผ่านเดิม'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'),
  handleValidationErrors,
];

/**
 * Update profile validation
 */
export const validateUpdateProfile = [
  body('name')
    .optional()
    .trim().isLength({ min: 1, max: 200 }).withMessage('ชื่อต้องมี 1-200 ตัวอักษร'),
  body('surname')
    .optional()
    .trim().isLength({ min: 1, max: 200 }).withMessage('นามสกุลต้องมี 1-200 ตัวอักษร'),
  body('sex')
    .optional()
    .isIn(['M', 'F', 'O', '']).withMessage('เพศต้องเป็น M, F, หรือ O'),
  body('profile_image_url')
    .optional({ values: 'falsy' })
    .custom((value) => {
      // Allow Base64 data URLs (will be processed by AuthService)
      if (value && value.startsWith('data:image/')) {
        return true;
      }
      // Allow regular URLs
      if (value && (value.startsWith('http://') || value.startsWith('https://'))) {
        return true;
      }
      // Allow empty/null values
      if (!value) {
        return true;
      }
      throw new Error('URL รูปโปรไฟล์ไม่ถูกต้อง');
    }),
  handleValidationErrors,
];

/**
 * Email validation (for invitations)
 */
export const validateEmail = [
  body('email')
    .isEmail().withMessage('กรุณากรอกอีเมลที่ถูกต้อง')
    .normalizeEmail(),
  handleValidationErrors,
];

/**
 * Company creation validation
 */
export const validateCompanyCreate = [
  body('org_name')
    .trim().notEmpty().withMessage('กรุณากรอกชื่อบริษัท')
    .isLength({ max: 1000 }).withMessage('ชื่อบริษัทต้องไม่เกิน 1000 ตัวอักษร'),
  body('org_code')
    .trim().notEmpty().withMessage('กรุณากรอกรหัสบริษัท')
    .isLength({ max: 50 }).withMessage('รหัสบริษัทต้องไม่เกิน 50 ตัวอักษร')
    .matches(/^[A-Z0-9_-]+$/i).withMessage('รหัสบริษัทต้องประกอบด้วยตัวอักษรภาษาอังกฤษ ตัวเลข _ และ - เท่านั้น'),
  body('org_integrate')
    .optional()
    .isIn(['Y', 'N']).withMessage('org_integrate ต้องเป็น Y หรือ N'),
  body('org_integrate_url')
    .optional({ values: 'falsy' }) // Allow empty string or null
    .isURL().withMessage('URL ไม่ถูกต้อง'),
  handleValidationErrors,
];

/**
 * Member role validation
 */
export const validateMemberRole = [
  body('roleId')
    .isInt({ min: 1, max: 5 }).withMessage('roleId ต้องเป็นตัวเลข 1-5'),
  handleValidationErrors,
];

export default {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangeEmail,
  validateChangePassword,
  validateUpdateProfile,
  validateEmail,
  validateCompanyCreate,
  validateMemberRole,
  handleValidationErrors,
};
