// src/routes/authRoutes.js
import express from "express";
import {
  registerUser,
  loginUser,
  getProfile,
  logoutUser,
  refreshToken,
  logoutAllUser,
  googleAuthCallback,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  changeEmail,
  changePassword,
  updateProfile,
} from "../controllers/AuthController.js";
import passport from "passport";
import { refreshAccessToken } from "../middleware/refreshTokenMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangeEmail,
  validateChangePassword,
  validateUpdateProfile,
} from "../middleware/validation.js";
import { auditLog, auditChange } from "../middleware/auditLogMiddleware.js";
import { AUDIT_ACTIONS } from "../constants/AuditActions.js";

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *               - surname
 *               - sex
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               name:
 *                 type: string
 *               surname:
 *                 type: string
 *               sex:
 *                 type: string
 *                 enum: [M, F, O]
 *               user_address_1:
 *                 type: string
 *               user_address_2:
 *                 type: string
 *               user_address_3:
 *                 type: string
 *               inviteToken:
 *                 type: string
 *                 description: Optional invite token to join organization
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or email already exists
 *       500:
 *         description: Internal server error
 */
router.post(
  "/register",
  validateRegister,
  auditLog(AUDIT_ACTIONS.AUTH.REGISTER, "USER", { severity: "INFO", category: "AUTH" }),
  registerUser
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Invalid credentials
 */
router.post(
  "/login",
  validateLogin,
  auditLog(AUDIT_ACTIONS.AUTH.LOGIN, "USER", { severity: "INFO", category: "AUTH" }),
  loginUser
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logout successful
 *       400:
 *         description: Missing refresh token
 */
router.post(
  "/logout",
  protect,
  auditLog(AUDIT_ACTIONS.AUTH.LOGOUT, "USER", { severity: "INFO", category: "AUTH" }),
  logoutUser
);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Reset email sent (always returns success for security)
 *       500:
 *         description: Internal server error
 */
router.post(
  "/forgot-password",
  validateForgotPassword,
  auditLog(AUDIT_ACTIONS.AUTH.FORGOT_PASSWORD, "USER", { severity: "MEDIUM", category: "SECURITY" }),
  forgotPassword
);

/**
 * @swagger
 * /auth/verify-reset-token:
 *   get:
 *     summary: Verify password reset token
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset token
 *     responses:
 *       200:
 *         description: Token is valid
 *       400:
 *         description: Invalid or expired token
 */
router.get(
  "/verify-reset-token",
  auditLog(AUDIT_ACTIONS.AUTH.VERIFY_RESET_TOKEN, "USER", { severity: "MEDIUM", category: "SECURITY" }),
  verifyResetToken
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid token or validation error
 */
router.post(
  "/reset-password",
  validateResetPassword,
  auditLog(AUDIT_ACTIONS.AUTH.RESET_PASSWORD, "USER", { severity: "HIGH", category: "SECURITY" }),
  resetPassword
);

// ==================== OAUTH ROUTES ====================

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Initiate Google OAuth login
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to Google authentication
 */
router.get(
  "/google",
  auditLog(AUDIT_ACTIONS.AUTH.GOOGLE_OAUTH_START, "USER"),
  passport.authenticate("google", { scope: ["profile", "email"] })
);

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to frontend with tokens
 */
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  auditLog(AUDIT_ACTIONS.AUTH.GOOGLE_OAUTH_CALLBACK, "USER"),
  googleAuthCallback
);

// ==================== TOKEN MANAGEMENT ====================

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post(
  "/refresh",
  auditLog(AUDIT_ACTIONS.AUTH.REFRESH_TOKEN, "USER", { category: "AUTH" }),
  refreshToken
);

/**
 * @swagger
 * /auth/token:
 *   post:
 *     summary: Alternative endpoint for token refresh
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New access token generated
 */
router.post(
  "/token",
  auditLog(AUDIT_ACTIONS.AUTH.REFRESH_TOKEN_ALT, "USER", { category: "AUTH" }),
  refreshAccessToken
);

// ==================== PROTECTED ROUTES ====================
// All routes below require authentication

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get(
  "/profile",
  protect,
  auditLog(AUDIT_ACTIONS.AUTH.GET_PROFILE, "USER"),
  getProfile
);

/**
 * @swagger
 * /auth/update-profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - surname
 *             properties:
 *               name:
 *                 type: string
 *               surname:
 *                 type: string
 *               sex:
 *                 type: string
 *                 enum: [M, F, O]
 *               user_address_1:
 *                 type: string
 *               user_address_2:
 *                 type: string
 *               user_address_3:
 *                 type: string
 *               profile_image_url:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put(
  "/update-profile",
  protect,
  validateUpdateProfile,
  auditChange("USER", (req) => req.user.user_id),
  auditLog(AUDIT_ACTIONS.AUTH.UPDATE_PROFILE, "USER", { severity: "LOW", category: "PROFILE" }),
  updateProfile
);

/**
 * @swagger
 * /auth/change-email:
 *   put:
 *     summary: Change user email address
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newEmail
 *               - password
 *             properties:
 *               newEmail:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 description: Current password for verification
 *     responses:
 *       200:
 *         description: Email changed successfully
 *       401:
 *         description: Invalid password
 *       409:
 *         description: Email already in use
 */
router.put("/change-email", protect, auditChange("USER", (req) => req.user.user_id), auditLog(AUDIT_ACTIONS.AUTH.CHANGE_EMAIL, "USER", { severity: "HIGH", category: "SECURITY" }), validateChangeEmail, changeEmail);

/**
 * @swagger
 * /auth/change-password:
 *   put:
 *     summary: Change user password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password changed successfully (all sessions invalidated)
 *       401:
 *         description: Invalid old password
 */
router.put("/change-password", protect, auditLog(AUDIT_ACTIONS.AUTH.CHANGE_PASSWORD, "USER", { severity: "MEDIUM", category: "AUTH" }), validateChangePassword, changePassword);

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     summary: Logout from all devices
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     description: Invalidates all refresh tokens for the user
 *     responses:
 *       200:
 *         description: Logged out from all devices successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/logout-all", protect, auditLog(AUDIT_ACTIONS.AUTH.LOGOUT_ALL, "USER", { severity: "MEDIUM", category: "AUTH" }), logoutAllUser);

export default router;