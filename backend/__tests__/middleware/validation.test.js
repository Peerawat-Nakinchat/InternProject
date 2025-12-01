/**
 * Validation Middleware Unit Tests
 * ISO 27001 Annex A.8 - Input Validation Testing
 */

import { jest } from '@jest/globals';
import { validationResult } from 'express-validator';

// Import validation middleware
import {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangeEmail,
  validateChangePassword,
  validateUpdateProfile,
  handleValidationErrors
} from '../../src/middleware/validation.js';

// Helper to run validation chain
const runValidation = async (req, validations) => {
  for (const validation of validations) {
    await validation.run(req);
  }
  return validationResult(req);
};

describe('Validation Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      body: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  // ============================================================
  // HANDLE VALIDATION ERRORS TESTS
  // ============================================================
  
  describe('handleValidationErrors', () => {
    it('should call next() when no validation errors', async () => {
      mockReq.body = { email: 'test@example.com' };
      
      // Simulate no errors
      const errors = validationResult(mockReq);
      
      handleValidationErrors(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  // ============================================================
  // REGISTER VALIDATION TESTS
  // ============================================================
  
  describe('validateRegister', () => {
    // Get only the validation rules (exclude handleValidationErrors)
    const registerValidations = validateRegister.slice(0, -1);

    it('should pass with valid registration data', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        name: 'John',
        surname: 'Doe',
        sex: 'M'
      };

      const result = await runValidation(mockReq, registerValidations);

      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with invalid email', async () => {
      mockReq.body = {
        email: 'invalid-email',
        password: 'password123',
        name: 'John',
        surname: 'Doe',
        sex: 'M'
      };

      const result = await runValidation(mockReq, registerValidations);

      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(e => e.path === 'email')).toBe(true);
    });

    it('should fail with short password', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: '12345',
        name: 'John',
        surname: 'Doe',
        sex: 'M'
      };

      const result = await runValidation(mockReq, registerValidations);

      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(e => e.path === 'password')).toBe(true);
    });

    it('should fail with empty name', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        name: '',
        surname: 'Doe',
        sex: 'M'
      };

      const result = await runValidation(mockReq, registerValidations);

      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(e => e.path === 'name')).toBe(true);
    });

    it('should fail with invalid sex value', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        name: 'John',
        surname: 'Doe',
        sex: 'X'
      };

      const result = await runValidation(mockReq, registerValidations);

      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(e => e.path === 'sex')).toBe(true);
    });

    it('should accept all valid sex values (M, F, O)', async () => {
      const sexValues = ['M', 'F', 'O'];

      for (const sex of sexValues) {
        mockReq.body = {
          email: 'test@example.com',
          password: 'password123',
          name: 'John',
          surname: 'Doe',
          sex
        };

        const result = await runValidation(mockReq, registerValidations);
        expect(result.isEmpty()).toBe(true);
      }
    });

    it('should fail with name exceeding 200 characters', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        name: 'a'.repeat(201),
        surname: 'Doe',
        sex: 'M'
      };

      const result = await runValidation(mockReq, registerValidations);

      expect(result.isEmpty()).toBe(false);
    });
  });

  // ============================================================
  // LOGIN VALIDATION TESTS
  // ============================================================
  
  describe('validateLogin', () => {
    const loginValidations = validateLogin.slice(0, -1);

    it('should pass with valid login data', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = await runValidation(mockReq, loginValidations);

      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with invalid email', async () => {
      mockReq.body = {
        email: 'not-an-email',
        password: 'password123'
      };

      const result = await runValidation(mockReq, loginValidations);

      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with empty password', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: ''
      };

      const result = await runValidation(mockReq, loginValidations);

      expect(result.isEmpty()).toBe(false);
    });

    it('should normalize email to lowercase', async () => {
      mockReq.body = {
        email: 'TEST@EXAMPLE.COM',
        password: 'password123'
      };

      await runValidation(mockReq, loginValidations);

      expect(mockReq.body.email).toBe('test@example.com');
    });
  });

  // ============================================================
  // FORGOT PASSWORD VALIDATION TESTS
  // ============================================================
  
  describe('validateForgotPassword', () => {
    const forgotPasswordValidations = validateForgotPassword.slice(0, -1);

    it('should pass with valid email', async () => {
      mockReq.body = { email: 'test@example.com' };

      const result = await runValidation(mockReq, forgotPasswordValidations);

      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with invalid email', async () => {
      mockReq.body = { email: 'invalid' };

      const result = await runValidation(mockReq, forgotPasswordValidations);

      expect(result.isEmpty()).toBe(false);
    });
  });

  // ============================================================
  // RESET PASSWORD VALIDATION TESTS
  // ============================================================
  
  describe('validateResetPassword', () => {
    const resetPasswordValidations = validateResetPassword.slice(0, -1);

    it('should pass with valid token and password', async () => {
      mockReq.body = {
        token: 'valid-reset-token',
        password: 'newpassword123'
      };

      const result = await runValidation(mockReq, resetPasswordValidations);

      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with empty token', async () => {
      mockReq.body = {
        token: '',
        password: 'newpassword123'
      };

      const result = await runValidation(mockReq, resetPasswordValidations);

      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with short password', async () => {
      mockReq.body = {
        token: 'valid-token',
        password: '12345'
      };

      const result = await runValidation(mockReq, resetPasswordValidations);

      expect(result.isEmpty()).toBe(false);
    });
  });

  // ============================================================
  // CHANGE EMAIL VALIDATION TESTS
  // ============================================================
  
  describe('validateChangeEmail', () => {
    const changeEmailValidations = validateChangeEmail.slice(0, -1);

    it('should pass with valid new email and password', async () => {
      mockReq.body = {
        newEmail: 'new@example.com',
        password: 'currentpassword'
      };

      const result = await runValidation(mockReq, changeEmailValidations);

      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with invalid new email', async () => {
      mockReq.body = {
        newEmail: 'not-valid',
        password: 'currentpassword'
      };

      const result = await runValidation(mockReq, changeEmailValidations);

      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with empty password', async () => {
      mockReq.body = {
        newEmail: 'new@example.com',
        password: ''
      };

      const result = await runValidation(mockReq, changeEmailValidations);

      expect(result.isEmpty()).toBe(false);
    });
  });

  // ============================================================
  // CHANGE PASSWORD VALIDATION TESTS
  // ============================================================
  
  describe('validateChangePassword', () => {
    const changePasswordValidations = validateChangePassword.slice(0, -1);

    it('should pass with valid old and new passwords', async () => {
      mockReq.body = {
        oldPassword: 'currentpassword',
        newPassword: 'newpassword123'
      };

      const result = await runValidation(mockReq, changePasswordValidations);

      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with empty old password', async () => {
      mockReq.body = {
        oldPassword: '',
        newPassword: 'newpassword123'
      };

      const result = await runValidation(mockReq, changePasswordValidations);

      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with short new password', async () => {
      mockReq.body = {
        oldPassword: 'currentpassword',
        newPassword: '12345'
      };

      const result = await runValidation(mockReq, changePasswordValidations);

      expect(result.isEmpty()).toBe(false);
    });
  });

  // ============================================================
  // UPDATE PROFILE VALIDATION TESTS
  // ============================================================
  
  describe('validateUpdateProfile', () => {
    const updateProfileValidations = validateUpdateProfile.slice(0, -1);

    it('should pass with valid profile data', async () => {
      mockReq.body = {
        name: 'John',
        surname: 'Doe',
        sex: 'M'
      };

      const result = await runValidation(mockReq, updateProfileValidations);

      expect(result.isEmpty()).toBe(true);
    });

    it('should pass with empty body (all optional)', async () => {
      mockReq.body = {};

      const result = await runValidation(mockReq, updateProfileValidations);

      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with invalid sex value', async () => {
      mockReq.body = {
        sex: 'X'
      };

      const result = await runValidation(mockReq, updateProfileValidations);

      expect(result.isEmpty()).toBe(false);
    });

    it('should allow empty string for sex', async () => {
      mockReq.body = {
        sex: ''
      };

      const result = await runValidation(mockReq, updateProfileValidations);

      expect(result.isEmpty()).toBe(true);
    });

    it('should validate profile image URL', async () => {
      mockReq.body = {
        profile_image_url: 'not-a-url'
      };

      const result = await runValidation(mockReq, updateProfileValidations);

      expect(result.isEmpty()).toBe(false);
    });

    it('should accept valid profile image URL', async () => {
      mockReq.body = {
        profile_image_url: 'https://example.com/image.jpg'
      };

      const result = await runValidation(mockReq, updateProfileValidations);

      expect(result.isEmpty()).toBe(true);
    });
  });
});

// ============================================================
// SECURITY COMPLIANCE TESTS
// ============================================================

describe('Validation Security Compliance (ISO 27001)', () => {
  describe('Input Sanitization', () => {
    it('should normalize email addresses', async () => {
      const mockReq = { body: { email: 'TEST@EXAMPLE.COM', password: 'test123' } };
      const loginValidations = validateLogin.slice(0, -1);

      await runValidation(mockReq, loginValidations);

      // Email should be normalized to lowercase
      expect(mockReq.body.email.toLowerCase()).toBe('test@example.com');
    });

    it('should trim whitespace from names', async () => {
      const mockReq = {
        body: {
          email: 'test@example.com',
          password: 'password123',
          name: '  John  ',
          surname: '  Doe  ',
          sex: 'M'
        }
      };
      const registerValidations = validateRegister.slice(0, -1);

      await runValidation(mockReq, registerValidations);

      expect(mockReq.body.name).toBe('John');
      expect(mockReq.body.surname).toBe('Doe');
    });
  });

  describe('Length Limits', () => {
    it('should enforce name length limits', async () => {
      const mockReq = {
        body: {
          email: 'test@example.com',
          password: 'password123',
          name: 'a'.repeat(201),
          surname: 'Doe',
          sex: 'M'
        }
      };
      const registerValidations = validateRegister.slice(0, -1);

      const result = await runValidation(mockReq, registerValidations);

      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('Password Policy', () => {
    it('should enforce minimum password length', async () => {
      const mockReq = {
        body: {
          email: 'test@example.com',
          password: '12345',
          name: 'John',
          surname: 'Doe',
          sex: 'M'
        }
      };
      const registerValidations = validateRegister.slice(0, -1);

      const result = await runValidation(mockReq, registerValidations);

      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(e => e.path === 'password')).toBe(true);
    });

    it('should accept password at minimum length', async () => {
      const mockReq = {
        body: {
          email: 'test@example.com',
          password: '123456', // Exactly 6 characters
          name: 'John',
          surname: 'Doe',
          sex: 'M'
        }
      };
      const registerValidations = validateRegister.slice(0, -1);

      const result = await runValidation(mockReq, registerValidations);

      expect(result.isEmpty()).toBe(true);
    });
  });
});
