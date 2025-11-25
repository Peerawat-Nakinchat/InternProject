import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Configuration for PostgreSQL connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

/**
 * Initializes the database by creating all tables and default roles
 * based on the provided document schema.
 */
async function initializeDatabase() {
    console.log('--- Initializing Database Schema ---');
    try {
        await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        
        // 1. Create sys_role table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sys_role (
                role_id INT PRIMARY KEY,
                role_name VARCHAR(50) UNIQUE NOT NULL,
                create_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // Insert roles
        await pool.query(`
            INSERT INTO sys_role (role_id, role_name)
            VALUES (1, 'OWNER'), (2, 'ADMIN'), (3, 'USER'), (4, 'VIEWER'), (5, 'AUDITOR')
            ON CONFLICT (role_id) DO NOTHING;
        `);

        // 2. Create sys_users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sys_users (
                user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NULL,
                name VARCHAR(200) NOT NULL,
                surname VARCHAR(200) NOT NULL,
                full_name VARCHAR(500) NULL,
                sex VARCHAR(10) NULL,
                user_address_1 VARCHAR(1000) NULL,
                user_address_2 VARCHAR(1000) NULL,
                user_address_3 VARCHAR(1000) NULL,
                profile_image_url TEXT,
                auth_provider VARCHAR(50) DEFAULT 'local',
                provider_id VARCHAR(255) NULL,
                role_id INT DEFAULT 3 NOT NULL REFERENCES sys_role(role_id),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                reset_token VARCHAR(255) NULL,
                reset_token_expire TIMESTAMPTZ NULL
            );
        `);
        
        // 3. Create sys_organizations table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sys_organizations (
                org_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                org_name VARCHAR(1000) NOT NULL,
                org_code VARCHAR(50) UNIQUE NOT NULL,
                owner_user_id UUID NOT NULL REFERENCES sys_users(user_id),
                org_address_1 VARCHAR(1000) NULL,
                org_address_2 VARCHAR(1000) NULL,
                org_address_3 VARCHAR(1000) NULL,
                org_integrate VARCHAR(1) DEFAULT 'N',
                org_integrate_url VARCHAR(1500),
                org_integrate_provider_id VARCHAR(100),
                org_integrate_passcode VARCHAR(50),
                created_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 4. Create sys_organization_members table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sys_organization_members (
                membership_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                org_id UUID NOT NULL REFERENCES sys_organizations(org_id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES sys_users(user_id) ON DELETE CASCADE,
                role_id INT NOT NULL REFERENCES sys_role(role_id),
                joined_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(org_id, user_id)
            );
        `);

        // ✅ FIX 3: เพิ่มตาราง sys_refresh_tokens
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sys_refresh_tokens (
                token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID NOT NULL REFERENCES sys_users(user_id),
                refresh_token TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('PostgreSQL: All tables (roles, users, orgs, members, refresh_tokens) checked/created successfully.');

    } catch (error) {
        console.error('PostgreSQL: Error during database initialization:', error.message);
        process.exit(1);
    }
}

// Export the query helper and initialization function
const query = (text, params) => pool.query(text, params);

export {
  query,
  pool,
  initializeDatabase,
};