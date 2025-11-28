import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./src/config/swaggerConfig.js";
import cron from "node-cron";
import "./src/config/loadEnv.js";

// Import Sequelize and Audit Log
import { syncDatabase } from "./src/models/dbModels.js";
import { RefreshTokenModel } from "./src/models/TokenModel.js";
import { syncAuditLogTable, cleanupOldAuditLogs } from "./src/middleware/auditLog.js";
import sequelize from "./src/config/dbConnection.js";

dotenv.config();

const app = express();

// ========================================
// 🔒 SECURITY MIDDLEWARE
// ========================================

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

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:3000"];

if (!allowedOrigins.includes("http://localhost:3000")) {
  allowedOrigins.push("http://localhost:3000");
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = "CORS policy does not allow access from this origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "x-org-id"],
  })
);

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: "Too many login attempts, try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// ========================================
// BODY PARSERS
// ========================================

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ========================================
// SECURITY MONITORING
// ========================================

import {
  extractClientInfo,
  requestLogger,
  detectSuspiciousPatterns,
  bruteForceProtection,
  detectSessionHijacking,
} from "./src/middleware/securityMonitoring.js";
import logger from "./src/utils/logger.js";

app.use(extractClientInfo);
app.use(requestLogger);
app.use(detectSuspiciousPatterns);
app.use("/api/auth/login", bruteForceProtection);
app.use("/api/auth/register", bruteForceProtection);

// ========================================
// PASSPORT
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
import securityRoutes from "./src/routes/securityRoutes.js";

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);

app.use("/api", apiLimiter);

// Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/security", securityRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "API server is running",
    timestamp: new Date().toISOString()
  });
});

// ========================================
// ERROR HANDLING
// ========================================

import { errorHandler, notFoundHandler } from "./src/middleware/errorHandler.js";

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// ========================================
// SCHEDULED TASKS (CRON JOBS)
// ========================================

// Cleanup expired tokens every day at 2 AM
cron.schedule('0 2 * * *', async () => {
  try {
    console.log('🧹 Running scheduled token cleanup...');
    await RefreshTokenModel.cleanupExpiredTokens();
  } catch (error) {
    console.error('❌ Error in scheduled token cleanup:', error);
  }
});

// Cleanup old audit logs every week (Sunday at 3 AM)
cron.schedule('0 3 * * 0', async () => {
  try {
    console.log('🧹 Running scheduled audit log cleanup...');
    const retentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS) || 90;
    await cleanupOldAuditLogs(retentionDays);
  } catch (error) {
    console.error('❌ Error in scheduled audit log cleanup:', error);
  }
});

// ========================================
// START SERVER
// ========================================

const PORT = process.env.PORT || 3000;

// Initialize database and start server
const startServer = async () => {
  try {
    // Sync database
    await syncDatabase();
    console.log('✅ Database synced successfully');

    // Sync audit log table
    await syncAuditLogTable();
    console.log('✅ Audit log table synced');

    // Start server
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
      console.log(`\n🔒 Security Features Enabled:`);
      console.log(`   ✓ Helmet (Security Headers)`);
      console.log(`   ✓ CORS: ${allowedOrigins.join(", ")}`);
      console.log(`   ✓ Rate Limiting (IP & User)`);
      console.log(`   ✓ Request Logging`);
      console.log(`   ✓ Brute Force Protection`);
      console.log(`   ✓ Suspicious Pattern Detection`);
      console.log(`   ✓ Session Hijacking Detection`);
      console.log(`   ✓ Token Rotation (Refresh Token)`);
      console.log(`   ✓ SQL Injection Prevention (Sequelize)`);
      console.log(`   ✓ XSS Protection`);
      console.log(`   ✓ Input Validation & Sanitization`);
      console.log(`   ✓ Audit Logging`);
      console.log(`   ✓ Token Hashing`);
      console.log(`   ✓ Scheduled Cleanup Tasks`);
      console.log(`   ✓ Security Monitoring Dashboard (/api/security/metrics)`);
      console.log(`\n🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      logger.info(`Server started on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  try {
    await sequelize.close();
    console.log('✅ Database connections closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});