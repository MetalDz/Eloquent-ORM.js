import fs from "fs";
import chalk from "chalk";
import { getAdapter, closeAllConnections, ConnectionName } from "../../core/connection/ConnectionFactory";
import { PathMap } from "../utils/PathMap";
import { resolveConnectionName } from "../../core/connection/resolveConnectionName";
import { dbConfig } from "../../config/database";

export type MigrateStatusOptions = {
  test?: boolean;
  connectionNames?: ConnectionName[];
  allMigrations?: boolean;
};

async function showStatusForConnection(
  connectionName: ConnectionName,
  isTest: boolean
): Promise<boolean> {
  const driver = dbConfig.connections[connectionName]?.driver ?? connectionName;
  if (!["mysql", "pg", "sqlite"].includes(driver)) {
    console.warn(chalk.yellow(`Status skipped: "${connectionName}" is not SQL-based.`));
    return true;
  }

  const migrationsDir = PathMap.migrations(isTest, connectionName);

  if (!fs.existsSync(migrationsDir)) {
    console.log(chalk.yellow(`No migrations directory found for ${connectionName}.`));
    return true;
  }

  try {
    const db = await getAdapter(connectionName);
    console.log(chalk.gray(`Connected to ${connectionName}.`));

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".ts") || f.endsWith(".js"))
      .sort();

    type MigrationRow = { name: string; batch: number; run_at: string };
    let applied: MigrationRow[] = [];

    try {
      applied = await db.query<MigrationRow>(
        "SELECT name, batch, run_at FROM migrations ORDER BY batch, id"
      );
    } catch {
      console.log(chalk.yellow("No migrations table found."));
    }

    const appliedNames = applied.map((row) => row.name);

    console.log(chalk.cyan(`\nMigration Status (${connectionName}):\n`));
    console.table(
      files.map((file) => ({
        Migration: file,
        Status: appliedNames.includes(file) ? "Applied" : "Pending",
        Batch: applied.find((row) => row.name === file)?.batch ?? "-",
        RunAt: applied.find((row) => row.name === file)?.run_at ?? "-",
      }))
    );

    return true;
  } catch (error) {
    console.error(chalk.red(`Failed to fetch migration status for "${connectionName}".`));
    console.error(error);
    return false;
  } finally {
    await closeAllConnections();
  }
}

export async function migrateStatus(options: MigrateStatusOptions | boolean = {}): Promise<void> {
  const normalizedOptions =
    typeof options === "boolean" ? { test: options } : options;
  const isTest = !!normalizedOptions.test;
  const connectionNames =
    normalizedOptions.connectionNames && normalizedOptions.connectionNames.length > 0
      ? normalizedOptions.connectionNames
      : [resolveConnectionName(undefined, { test: isTest })];

  let hadFailure = false;
  for (const connectionName of connectionNames) {
    const success = await showStatusForConnection(connectionName, isTest);
    if (!success) hadFailure = true;
  }

  if (hadFailure) process.exitCode = 1;
}
