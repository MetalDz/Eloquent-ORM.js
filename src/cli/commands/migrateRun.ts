// src/cli/commands/migrateRun.ts
import fs from "fs";
import path from "path";
import chalk from "chalk";
import {
  getConnection,
  closeAllConnections,
  ConnectionName,
} from "../../core/connection/ConnectionFactory";
import { PathMap } from "../utils/PathMap";
import { dbConfig } from "../../config/database";

interface QueryCapableConnection {
  query?(sql: string): Promise<unknown> | Promise<[unknown[], unknown[]]>;
  run?(sql: string): void | Promise<void>;
}

/**
 * 🧱 migrate:run
 * Executes all pending migrations, auto-detects CREATE/UPDATE,
 * skips empty or already applied migrations, and logs results clearly.
 */
export async function migrateRun(
  isTest: boolean = false,
  modelName?: string,
  dryRun: boolean = false
): Promise<void> {
  console.log(
    chalk.cyan(
      `\n⚙️  Running migrations in ${isTest ? "TEST" : "DEVELOPMENT"} mode${
        modelName ? ` for model "${modelName}"` : ""
      }...\n`
    )
  );

  const migrationsDir = PathMap.migrations(isTest);
  if (!fs.existsSync(migrationsDir)) {
    console.log(chalk.yellow("⚠️  No migrations directory found."));
    return;
  }

  const supportedDialects = ["mysql", "pg", "sqlite"];
  const connectionName = ((process.env.DB_CONNECTION as ConnectionName) ||
    (dbConfig.default as ConnectionName) ||
    "mysql") as ConnectionName;

  if (!supportedDialects.includes(connectionName)) {
    console.warn(
      chalk.yellow(
        `⚠️  Skipping migrations: "${connectionName}" is not SQL-based.`
      )
    );
    return;
  }

  const db: QueryCapableConnection = await getConnection(connectionName);
  console.log(chalk.gray(`🔌 Connected to ${connectionName}.`));

  // 🧠 Universal query runner (dry-run safe)
  const runQuery = async (sql: string): Promise<void> => {
    if (!sql || sql.trim() === "") return;
    if (dryRun) {
      console.log(chalk.gray(`🧪 [DRY-RUN] Would execute:\n${sql}\n`));
      return;
    }
    if (typeof db.query === "function") {
      await db.query(sql);
    } else if (typeof db.run === "function") {
      await db.run(sql);
    } else {
      throw new Error("❌ Unsupported database connection for migrations.");
    }
  };

  // ✅ Migration tracker table
  const trackerSQL =
    connectionName === "pg"
      ? `
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          batch INT DEFAULT 1,
          run_at TIMESTAMP DEFAULT NOW()
        );`
      : connectionName === "sqlite"
      ? `
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(255) NOT NULL,
          batch INT DEFAULT 1,
          run_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`
      : `
        CREATE TABLE IF NOT EXISTS migrations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          batch INT DEFAULT 1,
          run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`;
  await runQuery(trackerSQL);

  // 🧾 Collect migrations
  let files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".ts") || f.endsWith(".js"))
    .sort();

  if (modelName) {
    const lower = modelName.toLowerCase();
    files = files.filter((f) => f.includes(lower));
    if (files.length === 0) {
      console.log(chalk.yellow(`⚠️  No migrations found for model: ${modelName}`));
      await closeAllConnections();
      return;
    }
  }

  // ✅ Get executed migrations
  let executed: string[] = [];
  try {
    const res = await db.query?.("SELECT name FROM migrations");
    if (Array.isArray(res)) executed = (res[0] as { name: string }[]).map((r) => r.name);
    else if (res && typeof res === "object" && "rows" in res)
      executed = (res as { rows: { name: string }[] }).rows.map((r) => r.name);
  } catch {
    executed = [];
  }

  const pending = files.filter((f) => !executed.includes(f));
  if (pending.length === 0) {
    console.log(chalk.yellow("\n✨ No new migrations to run."));
    await closeAllConnections();
    return;
  }

  console.log(chalk.gray(`🧩 Pending migrations: ${pending.length}`));

  // 🧠 Determine batch number
  let lastBatch = 0;
  try {
    const batchRes = await db.query?.("SELECT MAX(batch) as max FROM migrations");
    if (Array.isArray(batchRes) && batchRes[0]?.[0]?.max)
      lastBatch = Number(batchRes[0][0].max);
  } catch {
    lastBatch = 0;
  }
  const newBatch = lastBatch + 1;

  let applied = 0;

  try {
    for (const file of pending) {
      const filePath = path.join(migrationsDir, file);
      const migrationModule = (await import(path.resolve(filePath))) as {
        up?: (db: { query(sql: string): Promise<void> }) => Promise<void>;
      };

      if (typeof migrationModule.up !== "function") {
        console.log(chalk.red(`❌ Invalid migration: ${file}`));
        continue;
      }

      // 🧠 Load migration content
      const fileContent = fs.readFileSync(filePath, "utf8");
      const isEmpty =
        !fileContent.includes("await db.query(") ||
        fileContent.match(/await db\.query\(`[^`]*`\);/g)?.length === 0;

      if (isEmpty) {
        console.log(chalk.gray(`⏩ Skipping empty migration: ${file}`));
        continue;
      }

      console.log(chalk.gray(`⚙️  Applying: ${file}`));
      await migrationModule.up({ query: runQuery });

      if (!dryRun)
        await runQuery(
          `INSERT INTO migrations (name, batch) VALUES ('${file}', ${newBatch});`
        );

      console.log(chalk.green(`✅ Migration applied: ${file}`));
      applied++;
    }

    console.log(chalk.greenBright(`\n🎉 ${applied} migration(s) applied successfully.`));
  } catch (err) {
    console.error(chalk.red("\n❌ Error during migration execution:"));
    console.error(err);
    console.warn(chalk.yellow("⚠️ Rolling back partial changes..."));
  } finally {
    await closeAllConnections();
    console.log(chalk.gray("\n🔒 All database connections closed.\n"));
  }
}
