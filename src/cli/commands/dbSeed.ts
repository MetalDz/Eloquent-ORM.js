import fs from "fs";
import path from "path";
import chalk from "chalk";
import { PathMap } from "../utils/PathMap";
import { loadModule } from "../utils/typescript/tsRuntime";
import { closeAllConnections } from "../../core/connection/ConnectionFactory";

/**
 * db:seed
 * Runs all seeders (or a specific seeder) in /database/seeds
 */
export async function dbSeed(options: {
  test?: boolean;
  class?: string;
  close?: boolean;
  exit?: boolean;
}): Promise<void> {
  try {
    const isTest = !!options?.test;
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

    // Run a specific seeder if requested
    const className = options?.class?.toLowerCase();
    if (className) {
      const target = seedFiles.find((f) => f.toLowerCase().includes(className));

      if (!target) {
        console.log(chalk.red(`Seeder '${options.class}' not found.`));
        return;
      }

      await runSeederFile(path.join(seedsDir, target));
      console.log(chalk.greenBright(`Completed: ${options.class}\n`));
      return;
    }

    // Otherwise, run all seeders in alphabetical order
    for (const file of seedFiles) {
      await runSeederFile(path.join(seedsDir, file));
    }

    console.log(chalk.greenBright("\nAll seeders completed successfully!\n"));
  } catch (err) {
    console.error(chalk.red("Seeder execution failed."));
    if (err instanceof Error) console.error(chalk.red(err.message));
  } finally {
    if (options?.close !== false) {
      await closeAllConnections();
      console.log(chalk.gray("All database connections closed.\n"));
    }
    if (options?.exit !== false && process.env.ELOQUENT_CLI === "true") {
      setImmediate(() => process.exit(0));
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
