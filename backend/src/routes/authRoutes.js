// src/routes/authRoutes.js
import express from "express";
import {
  registerUser, loginUser, getProfile, logoutUser, refreshToken, logoutAllUser,
  googleAuthCallback, forgotPassword, verifyResetToken, resetPassword,
  changeEmail, changePassword, updateProfile
} from "../controllers/AuthController.js";
import passport from "passport";
import { refreshAccessToken } from "../middleware/refreshTokenMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  validateRegister, validateLogin, validateForgotPassword, validateResetPassword,
  validateChangeEmail, validateChangePassword, validateUpdateProfile,
} from "../middleware/validation.js";
import { auditLog, auditChange } from "../middleware/auditLogMiddleware.js";
import { AUDIT_ACTIONS } from "../constants/AuditActions.js";
import UserModel from "../models/UserModel.js";

export const createAuthRoutes = (deps = {}) => {
  const router = express.Router();

  const controller = deps.controller || {
    registerUser, loginUser, getProfile, logoutUser, refreshToken, logoutAllUser,
    googleAuthCallback, forgotPassword, verifyResetToken, resetPassword,
    changeEmail, changePassword, updateProfile
  };
  const authMw = deps.authMiddleware || { protect };
  const refreshMw = deps.refreshMiddleware || { refreshAccessToken };
  const valMw = deps.validationMiddleware || {
    validateRegister, validateLogin, validateForgotPassword, validateResetPassword,
    validateChangeEmail, validateChangePassword, validateUpdateProfile
  };
  const auditMw = deps.auditMiddleware || { auditLog, auditChange };
  const userModel = deps.UserModel || UserModel;
  const passportAuth = deps.passport || passport;

  // Public
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
  router.post("/register", valMw.validateRegister, auditMw.auditLog(AUDIT_ACTIONS.AUTH.REGISTER, "USER", { severity: "INFO", category: "AUTH" }), controller.registerUser);

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
  router.post("/login", valMw.validateLogin, auditMw.auditLog(AUDIT_ACTIONS.AUTH.LOGIN, "USER", { severity: "INFO", category: "AUTH" }), controller.loginUser);

  // Protected Logout
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
  router.post("/logout", authMw.protect, auditMw.auditLog(AUDIT_ACTIONS.AUTH.LOGOUT, "USER", { severity: "INFO", category: "AUTH" }), controller.logoutUser);

  // Password Reset
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
  router.post("/forgot-password", valMw.validateForgotPassword, auditMw.auditLog(AUDIT_ACTIONS.AUTH.FORGOT_PASSWORD, "USER", { severity: "MEDIUM", category: "SECURITY" }), controller.forgotPassword);

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
  router.get("/verify-reset-token", auditMw.auditLog(AUDIT_ACTIONS.AUTH.VERIFY_RESET_TOKEN, "USER", { severity: "MEDIUM", category: "SECURITY" }), controller.verifyResetToken);

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
  router.post("/reset-password", valMw.validateResetPassword, auditMw.auditLog(AUDIT_ACTIONS.AUTH.RESET_PASSWORD, "USER", { severity: "HIGH", category: "SECURITY" }), controller.resetPassword);

  // OAuth
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
  router.get("/google", auditMw.auditLog(AUDIT_ACTIONS.AUTH.GOOGLE_OAUTH_START, "USER"), passportAuth.authenticate("google", { scope: ["profile", "email"] }));

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
  router.get("/google/callback", passportAuth.authenticate("google", { session: false, failureRedirect: "/login" }), auditMw.auditLog(AUDIT_ACTIONS.AUTH.GOOGLE_OAUTH_CALLBACK, "USER"), controller.googleAuthCallback);

  // Tokens
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
  router.post("/refresh", auditMw.auditLog(AUDIT_ACTIONS.AUTH.REFRESH_TOKEN, "USER", { category: "AUTH" }), controller.refreshToken);

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
  router.post("/token", auditMw.auditLog(AUDIT_ACTIONS.AUTH.REFRESH_TOKEN_ALT, "USER", { category: "AUTH" }), refreshMw.refreshAccessToken);

  // Profile
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
  router.get("/profile", authMw.protect, auditMw.auditLog(AUDIT_ACTIONS.AUTH.GET_PROFILE, "USER"), controller.getProfile);

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
    authMw.protect,
    valMw.validateUpdateProfile,
    auditMw.auditChange("USER", (id) => userModel.findById(id)),
    auditMw.auditLog(AUDIT_ACTIONS.AUTH.UPDATE_PROFILE, "USER", { severity: "LOW", category: "PROFILE" }),
    controller.updateProfile
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
  router.put(
    "/change-email",
    authMw.protect,
    auditMw.auditChange("USER", (id) => userModel.findById(id)),
    auditMw.auditLog(AUDIT_ACTIONS.AUTH.CHANGE_EMAIL, "USER", { severity: "HIGH", category: "SECURITY" }),
    valMw.validateChangeEmail,
    controller.changeEmail
  );

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
  router.put("/change-password", authMw.protect, auditMw.auditLog(AUDIT_ACTIONS.AUTH.CHANGE_PASSWORD, "USER", { severity: "MEDIUM", category: "AUTH" }), valMw.validateChangePassword, controller.changePassword);

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
  router.post("/logout-all", authMw.protect, auditMw.auditLog(AUDIT_ACTIONS.AUTH.LOGOUT_ALL, "USER", { severity: "MEDIUM", category: "AUTH" }), controller.logoutAllUser);

  return router;
};

export default createAuthRoutes();