const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const projectRoot = path.resolve(__dirname, "..");
const databasePath = path.join(projectRoot, "prisma", "dev.db");
const migrationPath = path.join(
  projectRoot,
  "prisma",
  "migrations",
  "20260323193000_init",
  "migration.sql",
);

const sql = fs.readFileSync(migrationPath, "utf8");
const database = new Database(databasePath);

database.exec(sql);
database.close();

console.log(`Applied local SQLite schema shell at ${databasePath}`);
