/**
 * 🧠 EloquentJS Artisan v2.0 CLI
 * Author: MEKHERBECHE Fares
 * Description:
 *   Official CLI for EloquentJS ORM — generates models, controllers,
 *   services, migrations, seeds, and manages caches & factories.
 */

import chalk from "chalk";
import figlet from "figlet";
import { Command } from "commander";
import { TypeScriptCompiler } from "./utils/typescript/TypeScriptCompiler";
import { RuntimeDetector } from "./utils/typescript/RuntimeDetector";
import { loadFactories } from "./utils/factories/FactoryLoader";

// -----------------------------------------------------------------------------
// ⚙️ Lazy TypeScript Runtime Initialization
// -----------------------------------------------------------------------------
try {
  if (RuntimeDetector.needsTypeScriptRuntime(process.argv)) {
    TypeScriptCompiler.ensureRuntime();
    if (process.env.DEBUG === "true") {
      console.log(chalk.gray("🧠 TypeScript runtime initialized (for TS-based command)\n"));
    }
  } else if (process.env.DEBUG === "true") {
    console.log(chalk.gray("⚡ Skipping TypeScript runtime — not needed for this command.\n"));
  }
} catch (err) {
  console.error(chalk.red("❌ Failed to initialize TypeScript runtime at CLI startup."));
  console.error(err);
  process.exit(1);
}

// -----------------------------------------------------------------------------
// 🧩 CLI Bootstrap
// -----------------------------------------------------------------------------
(async () => {
  try {
    await loadFactories();
    if (process.env.DEBUG === "true") console.log(chalk.gray("🏭 Factories loaded successfully."));
  } catch (error) {
    console.error(chalk.red("❌ Failed to auto-load factories during CLI startup."));
    if (error instanceof Error) console.error(chalk.red(error.message));
  }
})();

// -----------------------------------------------------------------------------
// 🧩 Command Imports
// -----------------------------------------------------------------------------
import { makeModel } from "./commands/makeModel";
import { makeController } from "./commands/makeController";
import { makeService } from "./commands/makeService";
import { makeSeed } from "./commands/makeSeed";
import { makeMigration } from "./commands/makeMigration";
import { migrateRun } from "./commands/migrateRun";
import { migrateRollback } from "./commands/migrateRollback";
import { cacheClear } from "./commands/cacheClear";
import { cacheStats } from "./commands/cacheStats";
import { migrateStatus } from "./commands/migrateStatus";
import { migrateFresh } from "./commands/migrateFresh";
import { migrateReset } from "./commands/migrateReset";
import { factoryStatus } from "./commands/factoryStatus";
import { dbSeed } from "./commands/dbSeed";
import { dbSeedFresh } from "./commands/dbSeedFresh";

// -----------------------------------------------------------------------------
// 🧱 CLI Setup
// -----------------------------------------------------------------------------
const program = new Command();

console.log(chalk.cyan(figlet.textSync("EloquentJS", { horizontalLayout: "fitted" })));
console.log(chalk.gray("⚡ Developer CLI for EloquentJS ORM (v2.0)\n"));
console.log(chalk.green("🚀 Ready to manage your EloquentJS models and database!\n"));

// -----------------------------------------------------------------------------
// 🧩 Core Configuration
// -----------------------------------------------------------------------------
program
  .name("eloquent")
  .description("EloquentJS ORM Command Line Interface (Artisan-like tool)")
  .version("2.0.0");

// -----------------------------------------------------------------------------
// 🧩 MAKE COMMANDS
// -----------------------------------------------------------------------------
program
  .command("make:model <name>")
  .option("--test", "Generate model inside test directory")
  .option("--with-migration", "Automatically generate a migration for this model")
  .option("--force", "Overwrite existing migration if it exists")
  .description("Generate a new model (with optional migration)")
  .action(async (name: string, options: Record<string, unknown>) => {
    await makeModel(name, options);
  });

program
  .command("make:controller <name>")
  .description("Create a new controller (linked to service)")
  .action(makeController);

program
  .command("make:service <name>")
  .description("Create a new service (business logic layer)")
  .action(makeService);

program
  .command("make:seed <model>")
  .option("--count <number>", "Number of records to seed", "10")
  .option("--pivot", "Generate pivot seeder (for belongsToMany relations)")
  .option("--test", "Generate seed in test environment")
  .description("Generate a seeder file linked to a model factory")
  .action(async (model: string, options: { count: string; test?: boolean; pivot?: boolean }) => {
    await makeSeed(model, {
      count: Number(options.count),
      test: !!options.test,
      pivot: !!options.pivot,
    });
  });

program
  .command("make:factory <name>")
  .option("--model <model>", "Specify the model this factory belongs to")
  .option("--details", "Show detailed factory metadata")
  .description("Generate or inspect a model factory")
  .action(async (name: string, options: { model?: string; details?: boolean }) => {
    await factoryStatus({ details: !!options.details });
  });

// -----------------------------------------------------------------------------
// 🧩 SEED COMMANDS
// -----------------------------------------------------------------------------
program
  .command("db:seed")
  .option("--test", "Run seeders from test database")
  .option("--class <name>", "Run a specific seeder by class name")
  .description("Run database seeders (all or specific)")
  .action(async (options: { test?: boolean; class?: string }) => {
    await dbSeed({ test: !!options.test, class: options.class });
  });

program
  .command("db:seed:fresh")
  .option("--test", "Run in test database")
  .option("--class <name>", "Run a specific seeder after migration refresh")
  .description("Drop all tables, rerun migrations, and seed the database")
  .action(async (options: { test?: boolean; class?: string }) => {
    await dbSeedFresh({ test: !!options.test, class: options.class });
  });

// -----------------------------------------------------------------------------
// 🧩 MIGRATION COMMANDS
// -----------------------------------------------------------------------------
program
  .command("make:migration <model>")
  .option("--test", "Generate migration in test mode")
  .option("--update", "Generate an update (ALTER TABLE) migration")
  .description("Generate migration from a model or all models")
  .action((model: string, options: Record<string, unknown>) => makeMigration(model, options));

program
  .command("migrate:run [model]")
  .description("Run pending migrations (optionally for one model)")
  .action((model?: string) => migrateRun(false, model));

program
  .command("migrate:run:test [model]")
  .description("Run pending test migrations (optionally for one model)")
  .action((model?: string) => migrateRun(true, model));

program
  .command("migrate:rollback")
  .option("--test", "Rollback migration in test mode")
  .option("--step <number>", "Number of migrations to rollback", "1")
  .description("Rollback the latest migration(s)")
  .action(async (options: { test?: boolean; step?: string }) => {
    const stepNumber = Number(options.step ?? 1);
    await migrateRollback("mysql", { test: !!options.test, step: stepNumber });
  });

program
  .command("migrate:status")
  .description("Show status of all migrations (applied vs pending)")
  .action(() => migrateStatus(false));

program
  .command("migrate:fresh")
  .description("Drop all tables and re-run every migration from scratch")
  .action(migrateFresh);

program
  .command("migrate:reset")
  .description("Rollback *all* migrations completely")
  .action(migrateReset);

// -----------------------------------------------------------------------------
// 🧩 CACHE COMMANDS
// -----------------------------------------------------------------------------
program.command("cache:clear").description("Clear all ORM cache data and registry").action(cacheClear);
program.command("cache:stats").description("Show current cache performance analytics").action(cacheStats);

// -----------------------------------------------------------------------------
// 🧩 FACTORY INSPECTION COMMAND
// -----------------------------------------------------------------------------
program
  .command("factory:status")
  .option("--details", "Show detailed factory metadata including relations")
  .option("--graph", "Display an ASCII diagram of model relationships")
  .description("Show all registered factories (model + pivot + relations)")
  .action(async (options: { details?: boolean; graph?: boolean }) => {
    await factoryStatus(options as { details?: boolean; graph?: boolean });
  });

// -----------------------------------------------------------------------------
// 🧩 HELP COMMAND
// -----------------------------------------------------------------------------
program
  .command("list")
  .description("Show all available EloquentJS commands")
  .action(() => {
    console.log(chalk.green("\n📜 Available Commands:\n"));
    console.table([
      { Command: "make:model <name>", Description: "Generate a model (opts: --test, --with-migration, --force)" },
      { Command: "make:controller <name>", Description: "Generate a controller" },
      { Command: "make:service <name>", Description: "Generate a service" },
      { Command: "make:seed <model>", Description: "Generate a seeder (opts: --count, --pivot, --test)" },
      { Command: "make:factory <name>", Description: "Generate/inspect a factory (opts: --model, --details)" },
      { Command: "factory:status", Description: "Inspect all factories (opts: --details, --graph)" },
      { Command: "db:seed", Description: "Run seeders (opts: --test, --class)" },
      { Command: "db:seed:fresh", Description: "Drop, migrate, and seed fresh (opts: --test, --class)" },
      { Command: "migrate:run", Description: "Run all pending migrations" },
      { Command: "migrate:rollback", Description: "Rollback recent migrations (opts: --test, --step)" },
      { Command: "migrate:status", Description: "Show migration status" },
      { Command: "migrate:fresh", Description: "Drop all and rerun all migrations" },
      { Command: "migrate:reset", Description: "Rollback all migrations completely" },
      { Command: "cache:clear", Description: "Clear ORM cache" },
      { Command: "cache:stats", Description: "View ORM cache analytics" },
    ]);
  });

// -----------------------------------------------------------------------------
// 🧩 Default CLI Behavior
// -----------------------------------------------------------------------------
program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

export async function placeholder(): Promise<void> {
  console.log("This command is not yet implemented.");
}
