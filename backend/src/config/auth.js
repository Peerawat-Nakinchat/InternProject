import dotenv from 'dotenv';
import logger from '../utils/logger.js';
dotenv.config();

/**
 * Better Auth Configuration (ESM Compatible)
 */
export const AUTH_CONFIG = {
    // JWT Secrets and Expiration
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
    ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
    REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    

    // Hashing
    BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
    
    // Cookie/Token Names (if using cookies)
    ACCESS_TOKEN_NAME: 'accessToken',
    REFRESH_TOKEN_NAME: 'refreshToken',
};

// Validate required secrets
if (!AUTH_CONFIG.ACCESS_TOKEN_SECRET || !AUTH_CONFIG.REFRESH_TOKEN_SECRET) {
    logger.error("FATAL ERROR: ACCESS_TOKEN_SECRET or REFRESH_TOKEN_SECRET not defined in .env");
    process.exit(1);
}

// Default export for easier importing
export default AUTH_CONFIG;
