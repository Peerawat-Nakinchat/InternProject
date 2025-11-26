import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Resolve the path to the secrets directory
// Assuming this file is in src/config, we go up two levels to backend root
const secretsPath = path.resolve(process.cwd(), "secrets/.env");

// Try loading from secrets directory first (Vault Agent)
if (fs.existsSync(secretsPath)) {
  //console.log(`Loading environment variables from ${secretsPath}`);
  dotenv.config({ path: secretsPath });
} else {
  // Fallback to default .env (Local Dev without Vault)
  console.log("Loading environment variables from default .env");
  dotenv.config();
}
