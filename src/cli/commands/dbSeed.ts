import fs from "fs";
import path from "path";
import chalk from "chalk";
import { PathMap } from "../utils/PathMap";
import { loadModule } from "../utils/typescript/tsRuntime";
import {
  closeAllConnections,
  type ConnectionName,
} from "../../core/connection/ConnectionFactory";
import { resolveConnectionName } from "../../core/connection/resolveConnectionName";
import { appendAuditEvent } from "../utils/AuditTrail";
import { silenceConsoleOutput } from "../utils/ConsoleSilencer";
import {
  matchesTargetStorageKind,
  resolveSeederStorageKindFromFile,
  targetStorageKindForConnection,
} from "../utils/ArtifactStorage";

/**
 * db:seed
 * Runs all seeders (or a specific seeder) in /database/seeds
 */
export async function dbSeed(options: {
  test?: boolean;
  class?: string;
  close?: boolean;
  exit?: boolean;
  connectionNames?: ConnectionName[];
  auditCommand?: string;
  silent?: boolean;
  noHooks?: boolean;
}): Promise<void> {
  let hadFailure = false;
  const isTest = !!options?.test;
  const envKey = isTest ? "DB_TEST_CONNECTION" : "DB_CONNECTION";
  const originalConnection = process.env[envKey];
  const originalDbConnection = process.env.DB_CONNECTION;
  const originalHooksDisabled = process.env.ELOQUENT_DISABLE_MODEL_HOOKS;
  const restoreConsole = silenceConsoleOutput(!!options?.silent);

  try {
    if (options?.noHooks) {
      process.env.ELOQUENT_DISABLE_MODEL_HOOKS = "true";
    }

    const seedsDir = PathMap.seeds(isTest);

    if (!fs.existsSync(seedsDir)) {
      console.log(chalk.yellow(`No seed directory found: ${seedsDir}`));
      return;
    }

    const allSeedFiles = fs
      .readdirSync(seedsDir)
      .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

    if (allSeedFiles.length === 0) {
      console.log(chalk.yellow("No seeder files found.\n"));
      return;
    }

    console.log(chalk.cyanBright(`\nRunning database seeders...\n`));

    const connectionNames =
      options.connectionNames && options.connectionNames.length > 0
        ? options.connectionNames
        : [resolveConnectionName(undefined, { test: isTest })];

    for (const connectionName of connectionNames) {
      process.env[envKey] = connectionName;
      if (isTest) {
        // Seeders/models may read DB_CONNECTION at module load; keep both in sync in test mode.
        process.env.DB_CONNECTION = connectionName;
      }
      console.log(chalk.gray(`Seeding connection: ${connectionName}`));
      let connectionFailed = false;
      const targetStorageKind = targetStorageKindForConnection(connectionName);
      const seedFiles = allSeedFiles.filter((file) =>
        matchesTargetStorageKind(
          resolveSeederStorageKindFromFile(path.join(seedsDir, file), isTest),
          targetStorageKind
        )
      );

      // Run a specific seeder if requested
      const className = options?.class?.toLowerCase();
      if (className) {
        const target = seedFiles.find((f) => f.toLowerCase().includes(className));
        const incompatibleTarget = allSeedFiles.find((f) =>
          f.toLowerCase().includes(className)
        );

        if (!target) {
          if (incompatibleTarget) {
            console.log(
              chalk.red(
                `Seeder '${options.class}' is not compatible with ${targetStorageKind} connection '${connectionName}'.`
              )
            );
          } else {
            console.log(chalk.red(`Seeder '${options.class}' not found.`));
          }
          appendAuditEvent({
            command: options.auditCommand ?? "db:seed",
            connectionName,
            test: isTest,
            result: "failure",
            metadata: {
              className: options.class,
              reason: "seeder_not_found",
            },
          });
          hadFailure = true;
          continue;
        }

        try {
          await runSeederFile(path.join(seedsDir, target));
          console.log(chalk.greenBright(`Completed: ${options.class}\n`));
        } catch (error) {
          connectionFailed = true;
          hadFailure = true;
          throw error;
        } finally {
          appendAuditEvent({
            command: options.auditCommand ?? "db:seed",
            connectionName,
            test: isTest,
            result: connectionFailed ? "failure" : "success",
            metadata: {
              className: options.class,
            },
          });
        }
      } else {
        // Otherwise, run all seeders in alphabetical order
        try {
          if (seedFiles.length === 0) {
            console.log(
              chalk.yellow(
                `No compatible seeder files found for ${connectionName}.`
              )
            );
            continue;
          }
          for (const file of seedFiles) {
            await runSeederFile(path.join(seedsDir, file));
          }
        } catch (error) {
          connectionFailed = true;
          hadFailure = true;
          throw error;
        } finally {
          appendAuditEvent({
            command: options.auditCommand ?? "db:seed",
            connectionName,
            test: isTest,
            result: connectionFailed ? "failure" : "success",
            metadata: {
              className: null,
            },
          });
        }
      }

    }

    if (!hadFailure) {
      console.log(chalk.greenBright("\nAll seeders completed successfully!\n"));
    }
  } catch (err) {
    hadFailure = true;
    console.error(chalk.red("Seeder execution failed."));
    if (err instanceof Error) console.error(chalk.red(err.message));
  } finally {
    process.env[envKey] = originalConnection;
    process.env.DB_CONNECTION = originalDbConnection;
    if (originalHooksDisabled === undefined) {
      delete process.env.ELOQUENT_DISABLE_MODEL_HOOKS;
    } else {
      process.env.ELOQUENT_DISABLE_MODEL_HOOKS = originalHooksDisabled;
    }
    try {
      if (options?.close !== false) {
        await closeAllConnections();
        if (!options?.silent) {
          console.log(chalk.gray("All database connections closed.\n"));
        }
      }
    } finally {
      restoreConsole();
    }
    if (hadFailure) {
      process.exitCode = 1;
    }
    if (options?.exit !== false && process.env.ELOQUENT_CLI === "true") {
      setImmediate(() => process.exit(process.exitCode ?? 0));
    }
  }
}

/**
 * Dynamically imports and executes seeder function
 */
async function runSeederFile(filePath: string): Promise<void> {
  const module = loadModule(filePath);

  // Find exported seeder function (ends with "Seeder")
  const seederFn = Object.entries(module).find(([key]) =>
    key.endsWith("Seeder")
  );

  if (!seederFn) {
    console.log(chalk.yellow(`No seeder function found in ${filePath}`));
    return;
  }

  const [name, fn] = seederFn;

  console.log(chalk.blueBright(`\nRunning: ${name}`));

  if (typeof fn === "function") {
    await fn();
  } else {
    console.log(chalk.red(`Exported ${name} is not callable.`));
  }
}
