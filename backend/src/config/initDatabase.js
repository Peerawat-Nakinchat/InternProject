import { pool } from "./db.js";

async function initializeDatabase() {
  console.log("Initializing DB...");
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sys_role (
        role_id INT PRIMARY KEY,
        role_name VARCHAR(50) UNIQUE NOT NULL,
        create_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      INSERT INTO sys_role (role_id, role_name)
      VALUES (1,'OWNER'), (2,'ADMIN'), (3,'USER'), (4,'VIEWER'), (5,'AUDITOR')
      ON CONFLICT (role_id) DO NOTHING;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sys_users (
        user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        name VARCHAR(200) NOT NULL,
        surname VARCHAR(200) NOT NULL,
        full_name VARCHAR(500),
        role_id INT DEFAULT 3 REFERENCES sys_role(role_id),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sys_organizations (
        org_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        org_name VARCHAR(1000) NOT NULL,
        org_code VARCHAR(50) UNIQUE NOT NULL,
        owner_user_id UUID NOT NULL REFERENCES sys_users(user_id),
        org_integrate VARCHAR(1) DEFAULT 'N',
        created_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sys_refresh_tokens (
        token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES sys_users(user_id),
        refresh_token TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("DB initialized");
    process.exitCode = 0;
  } catch (err) {
    console.error("DB init error", err);
    process.exit(1);
  }
}

if (
  process.argv[1].includes("initDatabase") ||
  process.argv[1].includes("initDatabase.js")
) {
  initializeDatabase();
}

export { initializeDatabase };
