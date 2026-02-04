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

/**
 * 🧩 Universal query result type for SQL engines
 */
type SQLResult<T> =
  | [T[], unknown[]] // MySQL / SQLite (array-based)
  | { rows: T[] } // PostgreSQL
  | undefined;

/**
 * 🧱 migrate:status
 * Displays all migrations with their applied/pending status.
 */
export async function migrateStatus(isTest = false): Promise<void> {
  const migrationsDir = PathMap.migrations(isTest);
  const connectionName = resolveConnectionName(undefined, { test: isTest });

  const db = await getConnection(connectionName);
  console.log(chalk.gray(`🔌 Connected to ${connectionName}.`));

  // 📄 Collect all migration files
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".ts") || f.endsWith(".js"))
    .sort();

  type MigrationRow = { name: string; batch: number; run_at: string };
  let applied: MigrationRow[] = [];

  try {
    const res = (await db.query?.(
      "SELECT name, batch, run_at FROM migrations ORDER BY batch, id"
    )) as SQLResult<MigrationRow>;

    if (Array.isArray(res)) {
      applied = res[0];
    } else if (res && "rows" in res) {
      applied = res.rows;
    }
  } catch {
    console.log(chalk.yellow("⚠️  No migrations table found."));
  }

  // 🧠 Map migration statuses
  const appliedNames = applied.map((r) => r.name);

  console.log(chalk.cyan("\n📜 Migration Status:\n"));
  console.table(
    files.map((file) => ({
      Migration: file,
      Status: appliedNames.includes(file) ? "✅ Applied" : "❌ Pending",
      Batch: applied.find((a) => a.name === file)?.batch ?? "-",
      RunAt: applied.find((a) => a.name === file)?.run_at ?? "-",
    }))
  );

  await closeAllConnections();
}
