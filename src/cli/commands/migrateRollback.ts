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
import { resolveConnectionName } from "../../core/connection/resolveConnectionName";

interface QueryCapableConnection {
  query?(sql: string, params?: unknown[]): Promise<unknown> | Promise<[unknown[], unknown[]]>;
  run?(sql: string, params?: unknown[]): void | Promise<void>;
}

/**
 * 🧱 migrate:rollback
 * Reverts the latest migration batch(es).
 *
 * Usage:
 *   eloquent migrate:rollback
 *   eloquent migrate:rollback --step 2
 *   eloquent migrate:rollback --test
 */
export async function migrateRollback(
  dialect: ConnectionName = "mysql",
  options: { test?: boolean; step?: number } = {}
): Promise<void> {
  const isTest = !!options.test;
  const step = Math.max(1, Number(options.step || 1));

  console.log(
    chalk.cyan(
      `\n↩️  Rolling back migrations in ${isTest ? "TEST" : "DEVELOPMENT"} mode (step ${step})...\n`
    )
  );

  const migrationsDir = PathMap.migrations(isTest);
  if (!fs.existsSync(migrationsDir)) {
    console.log(chalk.yellow("⚠️  No migrations directory found."));
    return;
  }

  const connectionName = resolveConnectionName(undefined, { test: isTest });
  const driver =
    dbConfig.connections[connectionName as keyof typeof dbConfig.connections]?.driver ??
    connectionName;
  const supportedDialects = ["mysql", "pg", "sqlite"];

  if (!driver || !supportedDialects.includes(driver)) {
    console.warn(
      chalk.yellow(`⚠️  Rollback skipped: "${connectionName}" is not SQL-based.`)
    );
    return;
  }

  const db: QueryCapableConnection = await getConnection(connectionName);
  console.log(chalk.gray(`🔌 Connected to ${connectionName}.`));

  // ✅ Universal query runner
  const runQuery = async (sql: string, params: unknown[] = []): Promise<void> => {
    if (typeof db.query === "function") {
      await db.query(sql, params);
    } else if (typeof db.run === "function") {
      await db.run(sql, params);
    } else {
      throw new Error("❌ Unsupported database connection for rollback.");
    }
  };

  // ✅ Ensure migrations tracker exists
  const trackerSQL =
    driver === "pg"
      ? `CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            batch INT DEFAULT 1,
            run_at TIMESTAMP DEFAULT NOW()
         );`
      : driver === "sqlite"
      ? `CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(255) NOT NULL,
            batch INT DEFAULT 1,
            run_at DATETIME DEFAULT CURRENT_TIMESTAMP
         );`
      : `CREATE TABLE IF NOT EXISTS migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            batch INT DEFAULT 1,
            run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
         );`;

  await runQuery(trackerSQL);

  // 🧩 Fetch batches
  let rows: { name: string; batch: number }[] = [];
  try {
    const res = await db.query?.("SELECT name, batch FROM migrations ORDER BY batch DESC, id DESC");

    if (Array.isArray(res)) {
      rows = res[0] as { name: string; batch: number }[];
    } else if (typeof res === "object" && res !== null && "rows" in res) {
      rows = (res as { rows: { name: string; batch: number }[] }).rows;
    }
  } catch (err) {
    console.error(chalk.red("❌ Unable to read migrations table."));
    console.error(err);
    await closeAllConnections();
    return;
  }

  if (rows.length === 0) {
    console.log(chalk.yellow("✨ No migrations found to roll back."));
    await closeAllConnections();
    return;
  }

  // 🧠 Determine which batches to roll back
  const latestBatch = rows[0].batch;
  const targetBatches = Array.from(
    new Set(rows.map((r) => r.batch))
  ).slice(0, step); // rollback N latest batches

  const toRollback = rows.filter((r) =>
    targetBatches.includes(r.batch)
  );

  if (toRollback.length === 0) {
    console.log(chalk.yellow("✨ Nothing to roll back."));
    await closeAllConnections();
    return;
  }

  console.log(chalk.gray(`🧩 Rolling back ${toRollback.length} migration(s)...`));

  let rolledBack = 0;
  for (const entry of toRollback) {
    const migrationFile = entry.name;
    const filePath = path.join(migrationsDir, migrationFile);

    if (!fs.existsSync(filePath)) {
      console.warn(chalk.yellow(`⚠️  Missing file: ${migrationFile} (skipping)`));
      continue;
    }

    try {
      const migrationModule = (await import(path.resolve(filePath))) as {
        down?: (db: { query(sql: string): Promise<void> }) => Promise<void>;
      };

      if (typeof migrationModule.down !== "function") {
        console.log(chalk.gray(`⏭️  No down() method: ${migrationFile}`));
        continue;
      }

      console.log(chalk.gray(`↩️  Reverting: ${migrationFile}`));
      await migrationModule.down({ query: runQuery });

      const deleteSql =
        driver === "pg"
          ? "DELETE FROM migrations WHERE name = $1;"
          : "DELETE FROM migrations WHERE name = ?;";
      await runQuery(deleteSql, [migrationFile]);
      console.log(chalk.green(`✅ Rolled back: ${migrationFile}`));
      rolledBack++;
    } catch (err) {
      console.error(chalk.red(`❌ Error rolling back ${migrationFile}:`));
      console.error(err);
      break;
    }
  }

  console.log(
    chalk.greenBright(
      `\n🎉 ${rolledBack} migration(s) rolled back successfully.\n`
    )
  );

  await closeAllConnections();
  console.log(chalk.gray("🔒 All database connections closed.\n"));
}
