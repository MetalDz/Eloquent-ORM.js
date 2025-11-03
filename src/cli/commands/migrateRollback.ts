import fs from "fs";
import * as path from "path";
import chalk from "chalk";
import { getConnection, closeAllConnections, ConnectionName } from "../../core/connection/ConnectionFactory";

/**
 * 🧱 migrate:rollback
 * Rolls back one or more recent migrations.
 * Supports:
 *  - `eloquent migrate:rollback`
 *  - `eloquent migrate:rollback --step=3`
 *  - `eloquent migrate:rollback --test`
 */
export async function migrateRollback(
  connectionName: ConnectionName = "mysql",
  options: { test?: boolean; step?: number } = {}
): Promise<void> {
  console.log(chalk.cyan("\n🔁 Rolling back migrations...\n"));

  const isTest = options.test === true;
  const step = Math.max(options.step ?? 1, 1);
  const migrationsDir = isTest
    ? path.resolve("src/test/database/migrations")
    : path.resolve("src/app/database/migrations");

  if (!fs.existsSync(migrationsDir)) {
    console.log(chalk.yellow("⚠️  No migrations directory found."));
    return;
  }

  // 1️⃣ Establish connection
  const db = await getConnection(connectionName);
  console.log(chalk.gray(`🔌 Connected to ${connectionName} (${isTest ? "TEST" : "DEV"})`));

  // 2️⃣ Determine dialect
  const dialect = connectionName;
  const wrap = (v: string) =>
    dialect === "pg" ? `"${v}"` : dialect === "sqlite" ? `"${v}"` : `\`${v}\``;

  // 3️⃣ Query helper (safe for all dialects)
  const runQuery = async (sql: string): Promise<void> => {
    if ("query" in db && typeof db.query === "function") {
      await db.query(sql);
      return;
    }
    if ("run" in db && typeof db.run === "function") {
      await db.run(sql);
      return;
    }
    throw new Error("❌ Unsupported database connection for rollback.");
  };

  // 4️⃣ Ensure migrations table exists
  await runQuery(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5️⃣ Get executed migrations (newest first)
  let executed: string[] = [];
  try {
    const result = await db.query?.("SELECT name FROM migrations ORDER BY id DESC");

    if (Array.isArray(result)) {
      executed = (result as Array<{ name: string }>).map((r) => r.name);
    } else if (
      typeof result === "object" &&
      result !== null &&
      "rows" in result &&
      Array.isArray((result as { rows: unknown[] }).rows)
    ) {
      executed = ((result as { rows: Array<{ name: string }> }).rows).map((r) => r.name);
    }
  } catch {
    console.log(chalk.yellow("⚠️  No executed migrations found."));
    return;
  }

  if (executed.length === 0) {
    console.log(chalk.yellow("✨ Nothing to rollback."));
    return;
  }

  // 6️⃣ Select migrations to rollback (step count)
  const toRollback = executed.slice(0, step);
  console.log(chalk.gray(`🧩 Preparing to rollback ${toRollback.length} migration(s):`));
  toRollback.forEach((m) => console.log(chalk.gray(`   • ${m}`)));

  // 7️⃣ Execute rollback in order
  for (const file of toRollback) {
    const filePath = path.join(migrationsDir, file);
    if (!fs.existsSync(filePath)) {
      console.log(chalk.red(`❌ Migration file missing: ${file}`));
      continue;
    }

    console.log(chalk.gray(`↩️  Rolling back: ${file}`));

    try {
      const migrationModule = (await import(path.resolve(filePath))) as {
        down?: (dbConn: { query: (sql: string) => Promise<void> }) => Promise<void>;
      };

      if (typeof migrationModule.down !== "function") {
        console.log(chalk.red(`❌ Invalid migration: ${file} (no down() function)`));
        continue;
      }

      await migrationModule.down({ query: runQuery });
      await runQuery(`DELETE FROM migrations WHERE name = '${file}'`);
      console.log(chalk.greenBright(`✅ Rolled back: ${file}`));
    } catch (err) {
      console.error(chalk.red(`❌ Failed to rollback: ${file}`));
      console.error(err);
      break; // Stop on failure
    }
  }

  // 8️⃣ Final summary
  console.log(
    chalk.greenBright(`\n🎉 Successfully rolled back ${toRollback.length} migration(s).`)
  );

  await closeAllConnections();
  console.log(chalk.gray("\n🔒 All database connections closed.\n"));
}
