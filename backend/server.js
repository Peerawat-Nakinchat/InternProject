import { createServer } from 'http'; 
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./src/config/swaggerConfig.js";
import cron from "node-cron";

// Config & Utils
import "./src/config/loadEnv.js"; 
import sequelize from "./src/config/dbConnection.js";
import logger from "./src/utils/logger.js";

// Models & Middlewares
import { syncDatabase } from "./src/models/dbModels.js";
import { RefreshTokenModel } from "./src/models/TokenModel.js";
import { addCorrelationId, addSessionId, clientInfoMiddleware } from "./src/middleware/auditLogMiddleware.js";
import {
  extractClientInfo,
  requestLogger,
  detectSuspiciousPatterns,
  bruteForceProtection,
} from "./src/middleware/securityMonitoring.js";
import { errorHandler, notFoundHandler } from "./src/middleware/errorHandler.js";
import passport from "./src/config/passport.js";

// Routes
import userRoutes from "./src/routes/memberRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
import companyRoutes from "./src/routes/companyRoutes.js";
import invitationRoutes from "./src/routes/invitationRoutes.js";

const app = express();
const httpServer = createServer(app); 

// ========================================
// SECURITY & CONFIGURATION
// ========================================

app.use(helmet({
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
  hidePoweredBy: true 
}));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:3000").split(",");

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("CORS policy does not allow access from this origin."));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "x-org-id"],
}));

app.use(cookieParser());
app.use(express.json({ limit: "100kb" })); 
app.use(express.urlencoded({ limit: "100kb", extended: true }));

// ========================================
// RATE LIMITING
// ========================================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, 
  message: { success: false, error: "Too many login attempts, try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, 
});

// ========================================
// LOGGING & MONITORING
// ========================================

app.use(addCorrelationId);
app.use(addSessionId);
app.use(clientInfoMiddleware);
app.use(extractClientInfo);
app.use(requestLogger);
app.use(detectSuspiciousPatterns);

// ========================================
// AUTHENTICATION
// ========================================

app.use(passport.initialize());
app.use("/api/auth/login", bruteForceProtection, authLimiter);
app.use("/api/auth/register", bruteForceProtection, authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);

// ========================================
// ROUTES
// ========================================

app.use("/api", apiLimiter); // Global API limit

// Docs 
if (process.env.NODE_ENV !== 'production') {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/invitations", invitationRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ========================================
// ERROR HANDLING
// ========================================

app.use(notFoundHandler);
app.use(errorHandler);

// ========================================
// ⏰ CRON JOBS
// ========================================

cron.schedule('0 2 * * *', async () => {
  try {
    logger.info('🧹 Running scheduled token cleanup...');
    await RefreshTokenModel.cleanupExpiredTokens();
  } catch (error) {
    logger.error('❌ Error in token cleanup:', error);
  }
});

// ========================================
// START SERVER
// ========================================

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    if (process.env.NODE_ENV === 'development') {
      await syncDatabase();
      logger.info('✅ Database synced (Development mode)');
    }

    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
      }
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// ========================================
// GRACEFUL SHUTDOWN
// ========================================

const gracefulShutdown = async (signal) => {
  logger.info(`\n🛑 ${signal} received. Closing HTTP server...`);
  
  httpServer.close(async () => {
    logger.info('🛑 HTTP server closed.');
    
    try {
      await sequelize.close();
      logger.info('🔒 Database connection closed.');
      process.exit(0);
    } catch (error) {
      logger.error('💥 Error during database disconnection:', error);
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('💥 Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));