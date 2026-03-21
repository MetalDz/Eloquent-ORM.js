import fs from "fs";
import chalk from "chalk";
import {
  getAdapter,
  getConnection,
  closeAllConnections,
  ConnectionName,
} from "../../core/connection/ConnectionFactory";
import { PathMap } from "../utils/PathMap";
import { resolveConnectionName } from "../../core/connection/resolveConnectionName";
import { dbConfig } from "../../config/database";
import {
  ensureMigrationCollection,
  readAppliedMigrations as readMongoAppliedMigrations,
} from "../utils/migrations/MongoMigrationTracker";
import type { Db } from "mongodb";

export type MigrateStatusOptions = {
  test?: boolean;
  connectionNames?: ConnectionName[];
  allMigrations?: boolean;
};

async function getMongoConnection(connectionName: ConnectionName): Promise<Db> {
  if (typeof getConnection === "function") {
    return (await getConnection(connectionName)) as Db;
  }

  // Test harness compatibility: some command-level mocks only provide getAdapter.
  return (await (getAdapter as unknown as (name: ConnectionName) => Promise<unknown>)(
    connectionName
  )) as Db;
}

async function finalizeStatusResult(
  connectionName: ConnectionName,
  success: boolean,
  error?: unknown
): Promise<boolean> {
  if (!success) {
    console.error(chalk.red(`Failed to fetch migration status for "${connectionName}".`));
    console.error(error);
  }

  await closeAllConnections();
  return success;
}

async function showStatusForConnection(
  connectionName: ConnectionName,
  isTest: boolean
): Promise<boolean> {
  const driver = dbConfig.connections[connectionName]?.driver ?? connectionName;
  if (driver === "mongo") {
    const migrationsDir = PathMap.migrations(isTest, connectionName);
    if (!fs.existsSync(migrationsDir)) {
      console.log(chalk.yellow(`No migrations directory found for ${connectionName}.`));
      return true;
    }

    let success = false;
    let failure: unknown;

    try {
      const db = await getMongoConnection(connectionName);
      console.log(chalk.gray(`Connected to ${connectionName}.`));
      await ensureMigrationCollection(db);

      const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith(".ts") || f.endsWith(".js"))
        .sort();
      const applied = await readMongoAppliedMigrations(db);
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
      success = true;
    } catch (error) {
      failure = error;
    }

    return await finalizeStatusResult(connectionName, success, failure);
  }

  if (!["mysql", "pg", "sqlite"].includes(driver)) {
    console.warn(
      chalk.yellow(
        `Status skipped: "${connectionName}" has unsupported driver "${driver}".`
      )
    );
    return true;
  }

  const migrationsDir = PathMap.migrations(isTest, connectionName);

  if (!fs.existsSync(migrationsDir)) {
    console.log(chalk.yellow(`No migrations directory found for ${connectionName}.`));
    return true;
  }

  let success = false;
  let failure: unknown;

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
    success = true;
  } catch (error) {
    failure = error;
  }

  return await finalizeStatusResult(connectionName, success, failure);
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
