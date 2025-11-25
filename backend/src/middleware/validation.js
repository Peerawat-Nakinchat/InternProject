// src/middleware/validation.js
import { body, validationResult } from "express-validator";

/**
 * Middleware สำหรับตรวจสอบผลลัพธ์การ validate
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: "ข้อมูลไม่ถูกต้อง",
      details: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

/**
 * Password validation helper
 */
const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    throw new Error("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
  }
  if (!hasUpperCase || !hasLowerCase) {
    throw new Error("รหัสผ่านต้องมีทั้งตัวพิมพ์ใหญ่และเล็ก");
  }
  if (!hasNumber) {
    throw new Error("รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว");
  }
  if (!hasSpecialChar) {
    throw new Error(
      'รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว (!@#$%^&*(),.?":{}|<>)'
    );
  }

  return true;
};

/**
 * Validation rules for user registration
 */
export const validateRegister = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("รูปแบบอีเมลไม่ถูกต้อง")
    .normalizeEmail(),

  body("password")
    .custom((value) => validatePasswordStrength(value))
    .withMessage("รหัสผ่านไม่ตรงตามข้อกำหนด"),

  body("name")
    .trim()
    .notEmpty()
    .withMessage("กรุณากรอกชื่อ")
    .isLength({ min: 1, max: 200 })
    .withMessage("ชื่อต้องมีความยาว 1-200 ตัวอักษร"),

  body("surname")
    .trim()
    .notEmpty()
    .withMessage("กรุณากรอกนามสกุล")
    .isLength({ min: 1, max: 200 })
    .withMessage("นามสกุลต้องมีความยาว 1-200 ตัวอักษร"),

  body("sex")
    .isIn(["M", "F", "O"])
    .withMessage("เพศต้องเป็น M, F หรือ O เท่านั้น"),

  handleValidationErrors,
];

/**
 * Validation rules for user login
 */
export const validateLogin = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("รูปแบบอีเมลไม่ถูกต้อง")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("กรุณากรอกรหัสผ่าน"),

  handleValidationErrors,
];

/**
 * Validation rules for forgot password
 */
export const validateForgotPassword = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("รูปแบบอีเมลไม่ถูกต้อง")
    .normalizeEmail(),

  handleValidationErrors,
];

/**
 * Validation rules for reset password
 */
export const validateResetPassword = [
  body("token").notEmpty().withMessage("กรุณากรอก token"),

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
    .isEmail()
    .withMessage("รูปแบบอีเมลใหม่ไม่ถูกต้อง")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("กรุณากรอกรหัสผ่านเพื่อยืนยัน"),

  handleValidationErrors,
];

/**
 * Validation rules for change password
 */
export const validateChangePassword = [
  body("oldPassword").notEmpty().withMessage("กรุณากรอกรหัสผ่านเดิม"),

  body("newPassword")
    .custom((value) => validatePasswordStrength(value))
    .withMessage("รหัสผ่านใหม่ไม่ตรงตามข้อกำหนด"),

  handleValidationErrors,
];
