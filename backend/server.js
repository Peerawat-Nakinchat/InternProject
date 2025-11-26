import "./src/config/loadEnv.js"; // Must be the first import
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./src/config/swaggerConfig.js";

const app = express();

// ========================================
// 🔒 SECURITY MIDDLEWARE
// ========================================

//  Helmet - Security Headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

//  CORS - Configured with specific origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:3000"];

// Ensure Swagger UI origin is allowed
if (!allowedOrigins.includes("http://localhost:3000")) {
  allowedOrigins.push("http://localhost:3000");
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "x-org-id"],
  })
);

//  Rate Limiting - General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // จำกัด 100 requests ต่อ IP ต่อ 15 นาที
  message: {
    success: false,
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

//  Rate Limiting - Strict limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // จำกัด 5 attempts ต่อ IP ต่อ 15 นาที
  message: {
    success: false,
    error: "Too many login attempts, please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // ไม่นับ requests ที่สำเร็จ
});

// ========================================
// BODY PARSERS
// ========================================

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ========================================
// SECURITY MONITORING MIDDLEWARE
// ========================================

import {
  extractClientInfo,
  requestLogger,
  detectSuspiciousPatterns,
  bruteForceProtection,
} from "./src/middleware/securityMonitoring.js";
import logger from "./src/utils/logger.js";

// Extract client information for all requests
app.use(extractClientInfo);

// Log all requests
app.use(requestLogger);

// Detect suspicious patterns
app.use(detectSuspiciousPatterns);

// Apply brute force protection to auth endpoints
app.use("/api/auth/login", bruteForceProtection);
app.use("/api/auth/register", bruteForceProtection);

// ========================================
// PASSPORT INITIALIZATION
// ========================================

import passport from "./src/config/passport.js";
app.use(passport.initialize());

// ========================================
// ROUTES
// ========================================

import userRoutes from "./src/routes/memberRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
import companyRoutes from "./src/routes/companyRoutes.js";
import invitationRoutes from "./src/routes/invitationRoutes.js";

// Apply rate limiters
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);

// Apply general API rate limiter
app.use("/api", apiLimiter);

// Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/invitations", invitationRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.send("API server is running");
});

// ========================================
// ERROR HANDLING
// ========================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  res.status(err.status || 500).json({
    success: false,
    error:
      process.env.NODE_ENV === "production" ? "An error occurred" : err.message,
  });
});

// ========================================
// START SERVER
// ========================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔒 Security: Helmet enabled`);
  console.log(`🔒 Security: CORS configured for ${allowedOrigins.join(", ")}`);
  console.log(`🔒 Security: Rate limiting enabled`);
  console.log(`🔒 Security: Request logging enabled`);
  console.log(`🔒 Security: Brute force protection enabled`);
  console.log(`🔒 Security: Suspicious pattern detection enabled`);
  logger.info(`Server started on port ${PORT}`);
});
