// backend/scripts/migrate_trusted_devices.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Load env using the project's standard loader
import "../src/config/loadEnv.js";

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrate = async () => {
  try {
    console.log("🔄 Starting migration...");

    // Dynamic import to ensure env variables are loaded BEFORE db connection
    const { default: sequelize } = await import(
      "../src/config/dbConnection.js"
    );

    // Read SQL file
    const sqlPath = path.join(
      __dirname,
      "../src/database/migrations/create_trusted_devices.sql",
    );
    const sql = fs.readFileSync(sqlPath, "utf8");

    // Execute SQL
    await sequelize.authenticate();
    console.log("✅ Database connected.");

    await sequelize.query(sql);
    console.log("✅ Migration executed successfully.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

migrate();
