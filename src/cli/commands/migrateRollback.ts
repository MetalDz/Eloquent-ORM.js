import fs from "fs";
import path from "path";
import chalk from "chalk";
import { getAdapter, closeAllConnections, ConnectionName } from "../../core/connection/ConnectionFactory";
import { PathMap } from "../utils/PathMap";
import { dbConfig } from "../../config/database";
import { resolveConnectionName } from "../../core/connection/resolveConnectionName";
import {
  acquireMigrationLock,
  deleteAppliedMigration,
  ensureMigrationTables,
  releaseMigrationLock,
  validateMigrationHistory,
} from "../utils/migrations/MigrationTracker";

export async function migrateRollback(
  _dialect: ConnectionName = "mysql",
  options: { test?: boolean; step?: number } = {}
): Promise<void> {
  const isTest = !!options.test;
  const step = Math.max(1, Number(options.step || 1));

  console.log(
    chalk.cyan(
      `\nRolling back migrations in ${isTest ? "TEST" : "DEVELOPMENT"} mode (step ${step})...\n`
    )
  );

  const migrationsDir = PathMap.migrations(isTest);
  if (!fs.existsSync(migrationsDir)) {
    console.log(chalk.yellow("No migrations directory found."));
    return;
  }

  const connectionName = resolveConnectionName(undefined, { test: isTest });
  const driver = dbConfig.connections[connectionName]?.driver ?? connectionName;
  if (!driver || !["mysql", "pg", "sqlite"].includes(driver)) {
    console.warn(chalk.yellow(`Rollback skipped: "${connectionName}" is not SQL-based.`));
    return;
  }

  const db = await getAdapter(connectionName);
  console.log(chalk.gray(`Connected to ${connectionName}.`));
  const lockOwner = `migrate:rollback:${process.pid}:${Date.now()}`;

  const runQuery = async (sql: string, params: unknown[] = []): Promise<void> => {
    await db.execute(sql, params);
  };
  let lockAcquired = false;

  try {
    await ensureMigrationTables(db);
    await acquireMigrationLock(db, lockOwner);
    lockAcquired = true;

    let rows: { id?: number; name: string; batch: number }[] = [];
    rows = (await validateMigrationHistory(db, migrationsDir))
      .map((row) => ({ id: row.id, name: row.name, batch: row.batch }))
      .sort((a, b) => {
        if (b.batch !== a.batch) return b.batch - a.batch;
        return (b.id ?? 0) - (a.id ?? 0);
      });

    if (rows.length === 0) {
      console.log(chalk.yellow("No migrations found to roll back."));
      return;
    }

    const targetBatches = Array.from(new Set(rows.map((r) => r.batch))).slice(0, step);
    const toRollback = rows.filter((r) => targetBatches.includes(r.batch));

    if (toRollback.length === 0) {
      console.log(chalk.yellow("Nothing to roll back."));
      return;
    }

    console.log(chalk.gray(`Rolling back ${toRollback.length} migration(s)...`));

    let rolledBack = 0;
    for (const entry of toRollback) {
      const migrationFile = entry.name;
      const filePath = path.join(migrationsDir, migrationFile);

      if (!fs.existsSync(filePath)) {
        console.error(chalk.red(`Missing file: ${migrationFile}`));
        break;
      }

      try {
        const migrationModule = (await import(path.resolve(filePath))) as {
          down?: (db: { query(sql: string, params?: unknown[]): Promise<void> }) => Promise<void>;
        };

        if (typeof migrationModule.down !== "function") {
          console.log(chalk.gray(`No down() method: ${migrationFile}`));
          continue;
        }

        console.log(chalk.gray(`Reverting: ${migrationFile}`));
        await migrationModule.down({ query: runQuery });

        await deleteAppliedMigration(db, migrationFile);
        console.log(chalk.green(`Rolled back: ${migrationFile}`));
        rolledBack++;
      } catch (err) {
        console.error(chalk.red(`Error rolling back ${migrationFile}:`));
        console.error(err);
        break;
      }
    }

    console.log(chalk.greenBright(`\n${rolledBack} migration(s) rolled back successfully.\n`));
  } catch (err) {
    console.error(chalk.red("Unable to read or validate migrations table."));
    console.error(err);
  } finally {
    if (lockAcquired) {
      await releaseMigrationLock(db, lockOwner);
    }
    await closeAllConnections();
    console.log(chalk.gray("All database connections closed.\n"));
  }
}
