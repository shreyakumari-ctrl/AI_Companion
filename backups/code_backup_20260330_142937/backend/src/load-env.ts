import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const backendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(backendRoot, "..");

const envFiles = [
  path.join(repoRoot, ".env"),
  path.join(backendRoot, ".env"),
  path.join(repoRoot, ".env.local"),
  path.join(backendRoot, ".env.local"),
];

for (const envFile of envFiles) {
  if (!fs.existsSync(envFile)) {
    continue;
  }

  dotenv.config({
    path: envFile,
    override: true,
  });
}
