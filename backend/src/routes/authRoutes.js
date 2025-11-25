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
    changePassword
} from "../controllers/AuthController.js";
import passport from "passport";

import { refreshAccessToken } from "../middleware/refreshTokenMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post('/forgot-password', forgotPassword);
router.get('/verify-reset-token', verifyResetToken);
router.post('/reset-password', resetPassword);


// Google OAuth
router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
    "/google/callback",
    passport.authenticate("google", {
        session: false,
        failureRedirect: "/login",
    }),
    googleAuthCallback
);

// Refresh Token Route
router.post("/refresh", refreshToken);
router.post("/token", refreshAccessToken, (req, res) => {
    return res.json({
        success: true,
        accessToken: res.locals.newAccessToken,
    });
});

// Protected
router.post("/logout-all", protect, logoutAllUser);
router.get("/profile", protect, getProfile);
router.put("/change-email", protect, changeEmail);
router.put("/change-password", protect, changePassword);

export default router;
