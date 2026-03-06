import chalk from "chalk";
import { migrateFresh } from "./migrateFresh";
import { dbSeed } from "./dbSeed";
import {
  closeAllConnections,
  type ConnectionName,
} from "../../core/connection/ConnectionFactory";
import { resolveConnectionName } from "../../core/connection/resolveConnectionName";

/**
 * db:seed:fresh
 * Drops all tables, re-runs migrations, and executes seeders.
 */
export async function dbSeedFresh(
  options?: {
    test?: boolean;
    class?: string;
    force?: boolean;
    connectionNames?: ConnectionName[];
  }
): Promise<void> {
  console.log(chalk.cyanBright("\nRunning db:seed:fresh\n"));

  const isTest = !!options?.test;
  const envKey = isTest ? "DB_TEST_CONNECTION" : "DB_CONNECTION";
  const originalConnection = process.env[envKey];
  const originalDbConnection = process.env.DB_CONNECTION;
  const connectionNames =
    options?.connectionNames && options.connectionNames.length > 0
      ? options.connectionNames
      : [resolveConnectionName(undefined, { test: isTest })];
  let hadFailure = false;

  try {
    for (const connectionName of connectionNames) {
      process.env[envKey] = connectionName;
      if (isTest) {
        // Keep DB_CONNECTION aligned for model code paths that read it during test mode.
        process.env.DB_CONNECTION = connectionName;
      }

      console.log(chalk.yellow(`Rebuilding database for ${connectionName}...`));
      await migrateFresh({
        test: isTest,
        force: !!options?.force,
        auditCommand: "db:seed:fresh",
      });

      console.log(chalk.greenBright(`\nRunning seeders for ${connectionName}...\n`));
      await dbSeed({
        test: isTest,
        ...(options?.class ? { class: options.class } : {}),
        close: false,
        exit: false,
        connectionNames: [connectionName],
        auditCommand: "db:seed:fresh",
      });
    }

    console.log(chalk.greenBright("\nDatabase fully refreshed and seeded!\n"));
  } catch (err) {
    hadFailure = true;
    console.error(chalk.red("db:seed:fresh failed."));
    if (err instanceof Error) console.error(chalk.red(err.message));
  } finally {
    process.env[envKey] = originalConnection;
    process.env.DB_CONNECTION = originalDbConnection;
    await closeAllConnections();
    console.log(chalk.gray("All database connections closed.\n"));
    if (hadFailure) {
      process.exitCode = 1;
    }
    if (process.env.ELOQUENT_CLI === "true") {
      setImmediate(() => process.exit(process.exitCode ?? 0));
    }
  }
}
