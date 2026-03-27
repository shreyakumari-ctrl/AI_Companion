const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const dotenv = require("dotenv");

const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..");
const envFiles = [
  path.join(repoRoot, ".env"),
  path.join(projectRoot, ".env"),
  path.join(repoRoot, ".env.local"),
  path.join(projectRoot, ".env.local"),
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

const rawDatabaseUrl = (process.env.DATABASE_URL || "file:./prisma/dev.db")
  .trim()
  .replace(/^"(.*)"$/, "$1");

if (!rawDatabaseUrl.startsWith("file:")) {
  throw new Error(
    `Local migration runner only supports SQLite file DATABASE_URL values. Received: ${rawDatabaseUrl}`,
  );
}

const sqliteRelativePath = rawDatabaseUrl.slice("file:".length);
const databasePath = path.resolve(projectRoot, sqliteRelativePath);
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const database = new Database(databasePath);

const migrationsRoot = path.join(projectRoot, "prisma", "migrations");
const migrationDirectories = fs
  .readdirSync(migrationsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

database.exec(`
  CREATE TABLE IF NOT EXISTS "_LocalMigration" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const selectAppliedMigration = database.prepare(
  'SELECT 1 FROM "_LocalMigration" WHERE "name" = ?',
);
const insertAppliedMigration = database.prepare(
  'INSERT INTO "_LocalMigration" ("name") VALUES (?)',
);
const applyMigration = database.transaction((migrationName, sql) => {
  database.exec(sql);
  insertAppliedMigration.run(migrationName);
});

let appliedCount = 0;
let skippedCount = 0;

for (const directory of migrationDirectories) {
  if (selectAppliedMigration.get(directory)) {
    skippedCount += 1;
    continue;
  }

  const migrationPath = path.join(migrationsRoot, directory, "migration.sql");
  const sql = fs.readFileSync(migrationPath, "utf8");

  applyMigration(directory, sql);
  appliedCount += 1;
}

database.close();

console.log(
  `Applied ${appliedCount} local migration(s), skipped ${skippedCount}, database at ${databasePath}`,
);
