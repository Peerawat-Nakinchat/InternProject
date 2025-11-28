import dotenv from "dotenv";
import fs from "fs";
import path from "path";

const secretsPath = path.resolve(process.cwd(), "secrets/.env");

if (fs.existsSync(secretsPath)) {
  dotenv.config({ path: secretsPath });
} else {
  console.log("Loading environment variables from default .env");
  dotenv.config();
}
