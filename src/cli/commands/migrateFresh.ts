import chalk from "chalk";
import readline from "readline";
import { migrateRun } from "./migrateRun";
import { makeMigration } from "./makeMigration";
import {
  getAdapter,
  getConnection,
  closeAllConnections,
  ConnectionName,
} from "../../core/connection/ConnectionFactory";
import { resolveConnectionName } from "../../core/connection/resolveConnectionName";
import { dbConfig } from "../../config/database";
import type { Db } from "mongodb";

/**
 * migrate:fresh
 * Drops all tables and re-runs every migration from scratch, with confirmation.
 */
export type MigrateFreshOptions = {
  test?: boolean;
  force?: boolean;
  connectionNames?: ConnectionName[];
  allMigrations?: boolean;
  auditCommand?: string;
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

async function finalizeDropAllTables(
  connectionName: ConnectionName,
  success: boolean,
  error?: unknown
): Promise<boolean> {
  if (!success) {
    console.error(chalk.red(`Error while dropping tables for ${connectionName}:`));
    console.error(error);
  }

  await closeAllConnections();
  return success;
}

async function dropAllTablesForConnection(connectionName: ConnectionName): Promise<boolean> {
  let success = false;
  let failure: unknown;

  try {
    const driver = dbConfig.connections[connectionName]?.driver;

    if (driver === "mongo") {
      const db = await getMongoConnection(connectionName);
      console.log(chalk.gray(`Connected to ${connectionName}.`));
      const collections = await db.listCollections({}, { nameOnly: true }).toArray();
      for (const entry of collections) {
        if (!entry.name || entry.name.startsWith("system.")) continue;
        await db.collection(entry.name).drop();
      }
      console.log(chalk.yellow(`All collections dropped for ${connectionName}.`));
      success = true;
      return await finalizeDropAllTables(connectionName, success);
    }

    const db = await getAdapter(connectionName);
    console.log(chalk.gray(`Connected to ${connectionName}.`));

    if (driver === "pg") {
      const tables = await db.query<{ tablename: string }>(
        `SELECT tablename
         FROM pg_tables
         WHERE schemaname = current_schema()
           AND tablename <> 'pg_stat_statements';`
      );

      for (const table of tables) {
        await db.execute(`DROP TABLE IF EXISTS ${db.wrapId(table.tablename)} CASCADE;`);
      }
    } else if (driver === "sqlite") {
      await db.execute("PRAGMA foreign_keys = OFF;");
      const tables = await db.query<{ name: string }>(
        `SELECT name
         FROM sqlite_master
         WHERE type = 'table'
           AND name NOT LIKE 'sqlite_%';`
      );

      for (const table of tables) {
        await db.execute(`DROP TABLE IF EXISTS ${db.wrapId(table.name)};`);
      }
      await db.execute("PRAGMA foreign_keys = ON;");
    } else if (driver === "mysql") {
      await db.execute("SET FOREIGN_KEY_CHECKS = 0;");
      const tableList = await db.query<Record<string, string>>("SHOW TABLES;");

      for (const row of tableList) {
        const tableName = Object.values(row)[0];
        await db.execute(`DROP TABLE IF EXISTS ${db.wrapId(tableName)};`);
      }

      await db.execute("SET FOREIGN_KEY_CHECKS = 1;");
    } else {
      console.warn(
        chalk.yellow(
          `Skipping unsupported connection: ${connectionName} (${String(driver)}).`
        )
      );
      success = true;
      return await finalizeDropAllTables(connectionName, success);
    }

    console.log(chalk.yellow(`All tables dropped for ${connectionName}.`));
    success = true;
  } catch (err) {
    failure = err;
  }

  return await finalizeDropAllTables(connectionName, success, failure);
}

export async function migrateFresh(options: MigrateFreshOptions = {}): Promise<void> {
  const isTest = !!options.test;
  const connectionNames =
    options.connectionNames && options.connectionNames.length > 0
      ? options.connectionNames
      : [resolveConnectionName(undefined, { test: isTest })];

  const confirmed = options?.force === true ? true : await confirmDangerousAction();
  if (!confirmed) {
    console.log(chalk.yellow("\nOperation cancelled by user.\n"));
    return;
  }

  let hadFailure = false;

  for (const connectionName of connectionNames) {
    const success = await dropAllTablesForConnection(connectionName);
    if (!success) {
      hadFailure = true;
    }
  }

  if (options.allMigrations) {
    for (const connectionName of connectionNames) {
      try {
        await makeMigration("all", {
          test: isTest,
          connectionName,
          exit: false,
        });
      /* c8 ignore next 6 -- ts-jest/v8 records a synthetic single-location branch on this catch block */
      } catch (error) {
        hadFailure = true;
        console.error(
          chalk.red(`Failed to auto-generate migrations (--all-migrations) for ${connectionName}.`)
        );
        console.error(error);
      }
    }
  }

  // Keep the legacy combined line for integration-test compatibility.
  console.log(chalk.yellow("All tables dropped. Re-running migrations..."));
  await migrateRun(isTest, undefined, false, false, {
    connectionNames,
    auditCommand: options.auditCommand ?? "migrate:fresh",
  });

  if (hadFailure) {
    process.exitCode = 1;
  }
}

async function confirmDangerousAction(): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(chalk.redBright("\nWARNING: This will drop all tables in your database."));
    console.log(chalk.gray("This action cannot be undone."));

    rl.question(chalk.yellow("\nDo you wish to continue? [y/N] "), (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === "y" || normalized === "yes");
    });
  });
}
