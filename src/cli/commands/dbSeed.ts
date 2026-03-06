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
}): Promise<void> {
  let hadFailure = false;
  const isTest = !!options?.test;
  const envKey = isTest ? "DB_TEST_CONNECTION" : "DB_CONNECTION";
  const originalConnection = process.env[envKey];
  const originalDbConnection = process.env.DB_CONNECTION;

  try {
    const seedsDir = PathMap.seeds(isTest);

    if (!fs.existsSync(seedsDir)) {
      console.log(chalk.yellow(`No seed directory found: ${seedsDir}`));
      return;
    }

    const seedFiles = fs
      .readdirSync(seedsDir)
      .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

    if (seedFiles.length === 0) {
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

      // Run a specific seeder if requested
      const className = options?.class?.toLowerCase();
      if (className) {
        const target = seedFiles.find((f) => f.toLowerCase().includes(className));

        if (!target) {
          console.log(chalk.red(`Seeder '${options.class}' not found.`));
          hadFailure = true;
          continue;
        }

        await runSeederFile(path.join(seedsDir, target));
        console.log(chalk.greenBright(`Completed: ${options.class}\n`));
      } else {
        // Otherwise, run all seeders in alphabetical order
        for (const file of seedFiles) {
          await runSeederFile(path.join(seedsDir, file));
        }
      }

    }

    console.log(chalk.greenBright("\nAll seeders completed successfully!\n"));
  } catch (err) {
    hadFailure = true;
    console.error(chalk.red("Seeder execution failed."));
    if (err instanceof Error) console.error(chalk.red(err.message));
  } finally {
    process.env[envKey] = originalConnection;
    process.env.DB_CONNECTION = originalDbConnection;
    if (options?.close !== false) {
      await closeAllConnections();
      console.log(chalk.gray("All database connections closed.\n"));
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
