import chalk from "chalk";
import { migrateRollback } from "./migrateRollback.js";
import { ConnectionName } from "../../core/connection/ConnectionFactory.js";
import { resolveConnectionName } from "../../core/connection/resolveConnectionName.js";

export type MigrateResetOptions = {
  test?: boolean;
  connectionNames?: ConnectionName[];
  allMigrations?: boolean;
};

/**
 * migrate:reset
 * Rolls back all migrations completely (every batch).
 */
export async function migrateReset(options: MigrateResetOptions = {}): Promise<void> {
  const isTest = !!options.test;
  const connectionNames =
    options.connectionNames && options.connectionNames.length > 0
      ? options.connectionNames
      : [resolveConnectionName(undefined, { test: isTest })];

  console.log(
    chalk.cyan(
      `\nRESET: ${isTest ? "test" : "development"} database (all batches) on ${connectionNames.join(", ")}...\n`,
    ),
  );
  await migrateRollback({
    test: isTest,
    connectionNames,
    allMigrations: options.allMigrations ?? true,
    step: Number.MAX_SAFE_INTEGER,
    auditCommand: "migrate:reset",
  });
}
