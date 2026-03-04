#!/usr/bin/env node
/**
 * 🧠 EloquentJS Artisan v1.0 CLI
 * Author: MEKHERBECHE Fares
 * Description:
 *   Official CLI for EloquentJS ORM — generates models, controllers,
 *   services, migrations, seeds, and manages caches & factories.
 */

import chalk from "chalk";
import figlet from "figlet";
import { Command } from "commander";
import fs from "fs";
import path from "path";
import { TypeScriptCompiler } from "./utils/typescript/TypeScriptCompiler";
import { RuntimeDetector } from "./utils/typescript/RuntimeDetector";
import { loadFactories } from "./utils/factories/FactoryLoader";

if (process.env.ELOQUENT_DEBUG === "true") {
  console.log("[cli] start", { argv: process.argv.slice(2) });
}

// Mark CLI runtime so commands can exit cleanly when done.
process.env.ELOQUENT_CLI = "true";

function isCliTest(): boolean {
  return process.argv.includes("--test");
}

// -------------------------------------------------------------------------
// Test logs (plain text) - one file per command under src/test/logs
// -------------------------------------------------------------------------
const commandName = (process.argv[2] ?? "unknown")
  .replace(/[^a-z0-9_-]/gi, "_")
  .toLowerCase();
const logsDir = path.join(process.cwd(), "src", "test", "logs");
try {
  if (process.env.ELOQUENT_DEBUG === "true") {
    console.log("[cli] before runtime init");
  }
  fs.mkdirSync(logsDir, { recursive: true });
  const logFile = path.join(logsDir, `${commandName}.log`);
  const writeLog = (level: string, args: unknown[]) => {
    const message = args
      .map((arg) => {
        if (typeof arg === "string") return arg;
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      })
      .join(" ");
    const line = `[${new Date().toISOString()}] [${level}] ${message}\n`;
    fs.appendFileSync(logFile, line, "utf8");
  };

  fs.appendFileSync(
    logFile,
    `\n----- RUN ${new Date().toISOString()} -----\n`,
    "utf8"
  );

  const originalLog = console.log.bind(console);
  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);
  const originalInfo = console.info.bind(console);

  console.log = (...args: unknown[]) => {
    writeLog("LOG", args);
    originalLog(...args);
  };
  console.warn = (...args: unknown[]) => {
    writeLog("WARN", args);
    originalWarn(...args);
  };
  console.error = (...args: unknown[]) => {
    writeLog("ERROR", args);
    originalError(...args);
  };
  console.info = (...args: unknown[]) => {
    writeLog("INFO", args);
    originalInfo(...args);
  };
} catch {
  // If logging fails, continue without blocking CLI.
}

// Test-mode connection override (CLI only)
if (isCliTest()) {
  process.env.DB_CONNECTION = process.env.DB_TEST_CONNECTION || "mysql_test";
}

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
  if (process.env.ELOQUENT_DEBUG === "true") {
    console.log("[cli] after runtime init");
  }
} catch (err) {
  console.error(chalk.red("❌ Failed to initialize TypeScript runtime at CLI startup."));
  console.error(err);
  process.exit(1);
}

// -----------------------------------------------------------------------------
// 🧩 CLI Bootstrap
// -----------------------------------------------------------------------------
function shouldLoadFactories(argv: string[]): boolean {
  const command = argv[2] ?? "";
  const needsFactories = [
    "db:seed",
    "db:seed:fresh",
    "factory:status",
    "demo:scenario",
    "make:scenario",
  ];
  return needsFactories.some((c) => command.startsWith(c));
}

(async () => {
  if (process.env.ELOQUENT_DEBUG === "true") {
    console.log("[cli] factory auto-load check");
  }
  if (!shouldLoadFactories(process.argv)) return;
  try {
    await loadFactories(process.argv.includes("--test"));
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
import {
  migrateRun,
} from "./commands/migrateRun";
import { resolveSqlConnectionNames } from "./utils/resolveSqlConnectionFlags";
import { migrateRollback } from "./commands/migrateRollback";
import { cacheClear } from "./commands/cacheClear";
import { cacheStats } from "./commands/cacheStats";
import { migrateStatus } from "./commands/migrateStatus";
import { migrateFresh } from "./commands/migrateFresh";
import { migrateReset } from "./commands/migrateReset";
import { makeFactory } from "./commands/makeFactory";
import { factoryStatus } from "./commands/factoryStatus";
import { dbSeed } from "./commands/dbSeed";
import { dbSeedFresh } from "./commands/dbSeedFresh";
import { demoScenario } from "./commands/demoScenario";
import { makeScenario } from "./commands/makeScenario";

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
  .name("eloquent" )
  .description("EloquentJS ORM Command Line Interface (Artisan-like tool)")
  .version("2.0.0");

// -----------------------------------------------------------------------------
// 🧩 MAKE COMMANDS
// -----------------------------------------------------------------------------
program
  .command("make:model <name>")
  .option("--test", "Generate model inside test directory")
  .option("--with-migration", "Automatically generate a migration for this model")
  .option("--attrs-from-schema", "Infer model attrs type from schema fields")
  .option("--force", "Overwrite existing migration if it exists")
  .description("Generate a new model (with optional migration)")
  .action(async (name: string, options: Record<string, unknown>) => {
    await makeModel(name, { ...options, test: !!(options as { test?: boolean }).test });
  });

program
  .command("make:controller <name>")
  .option("--test", "Generate controller inside test directory")
  .option("--soft", "Generate controller with soft delete support")
  .description("Create a new controller (linked to service)")
  .action((name: string, options: { test?: boolean; soft?: boolean }) => {
    return makeController(name, { test: !!options.test, soft: !!options.soft });
  });

program
  .command("make:service <name>")
  .option("--test", "Generate service inside test directory")
  .description("Create a new service (business logic layer)")
  .action((name: string, options: { test?: boolean }) => {
    return makeService(name, { test: !!options.test });
  });

program
  .command("make:seed <model>")
  .option("--count <number>", "Number of records to seed", "10")
  .option("--test", "Generate seed in test environment")
  .description("Generate a seeder file linked to a model factory")
  .action(async (model: string, options: { count: string; test?: boolean }) => {
    await makeSeed(model, {
      count: Number(options.count),
      test: !!options.test,
    });
  });

program
  .command("make:factory <name>")
  .option("--model <model>", "Specify the model this factory belongs to")
  .option("--test", "Generate in test environment")
  .option("--force", "Overwrite existing file")
  .description("Generate a factory for a model")
  .action(async (name: string, options: { model?: string; test?: boolean; force?: boolean }) => {
    const modelName = options.model ?? name;

    await makeFactory(modelName, {
      test: !!options.test,
      force: !!options.force,
    });
  });

program
  .command("make:scenario <name>")
  .option("--test", "Generate scenario in test folders")
  .option("--preset <name>", "Preset: blog | media")
  .option("--controllers", "Generate controllers (test)")
  .option("--services", "Generate services (test)")
  .option("--run", "Run migrate:run:test and db:seed --test for the scenario")
  .option("--force", "Overwrite existing scenario files")
  .description("Generate an automated test scenario (models, migrations, factories, seeds)")
  .action(async (name: string, options: {
    test?: boolean;
    preset?: string;
    controllers?: boolean;
    services?: boolean;
    run?: boolean;
    force?: boolean;
  }) => {
    try {
      await makeScenario(name, {
        test: !!options.test,
        preset: options.preset,
        controllers: !!options.controllers,
        services: !!options.services,
        run: !!options.run,
        force: !!options.force,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`â‌Œ ${message}`));
      process.exitCode = 1;
    }
  });


// -----------------------------------------------------------------------------
// 🧩 SEED COMMANDS
// -----------------------------------------------------------------------------
program
  .command("db:seed")
  .option("--test", "Run seeders from test database")
  .option("--mysql", "Run seeders only for the mysql connection")
  .option("--pg", "Run seeders only for the pg connection")
  .option("--sqlite", "Run seeders only for the sqlite connection")
  .option("--all-connections", "Run seeders for mysql, pg, and sqlite")
  .option("--class <name>", "Run a specific seeder by class name")
  .description("Run database seeders (all or specific)")
  .action(async (options: {
    test?: boolean;
    class?: string;
    mysql?: boolean;
    pg?: boolean;
    sqlite?: boolean;
    allConnections?: boolean;
  }) => {
    try {
      const connectionNames = resolveSqlConnectionNames(!!options.test, {
        mysql: !!options.mysql,
        pg: !!options.pg,
        sqlite: !!options.sqlite,
        allConnections: !!options.allConnections,
      });

      await dbSeed({
        test: !!options.test,
        class: options.class,
        connectionNames,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`❌ ${message}`));
      process.exitCode = 1;
    }
  });

program
  .command("db:seed:fresh")
  .option("--test", "Run in test database")
  .option("--mysql", "Run fresh seed only for the mysql connection")
  .option("--pg", "Run fresh seed only for the pg connection")
  .option("--sqlite", "Run fresh seed only for the sqlite connection")
  .option("--all-connections", "Run fresh seed for mysql, pg, and sqlite")
  .option("--class <name>", "Run a specific seeder after migration refresh")
  .option("--force", "Skip confirmation prompt during refresh")
  .description("Drop all tables, rerun migrations, and seed the database")
  .action(async (options: {
    test?: boolean;
    class?: string;
    force?: boolean;
    mysql?: boolean;
    pg?: boolean;
    sqlite?: boolean;
    allConnections?: boolean;
  }) => {
    try {
      const connectionNames = resolveSqlConnectionNames(!!options.test, {
        mysql: !!options.mysql,
        pg: !!options.pg,
        sqlite: !!options.sqlite,
        allConnections: !!options.allConnections,
      });

      await dbSeedFresh({
        test: !!options.test,
        class: options.class,
        force: !!options.force,
        connectionNames,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`❌ ${message}`));
      process.exitCode = 1;
    }
  });

program
  .command("demo:scenario")
  .description("Run a quick verification scenario for seeded data (morph + pivot)")
  .option("--user <id>", "Run the scenario for a specific user id")
  .option("--random", "Pick a random user id")
  .option("--test", "Run scenario against test database")
  .action(async (options: { user?: string; random?: boolean; test?: boolean }) => {
    const userId = options.user ? Number(options.user) : undefined;
    await demoScenario({
      user: Number.isFinite(userId) ? userId : undefined,
      random: !!options.random,
      test: !!options.test,
    });
  });

// -----------------------------------------------------------------------------
// 🧩 MIGRATION COMMANDS
// -----------------------------------------------------------------------------
program
  .command("make:migration [model]")
  .option("--test", "Generate migration in test mode")
  .option("--all", "Generate migrations for all models")
  .option("--mysql", "Generate migrations only for the mysql connection")
  .option("--pg", "Generate migrations only for the pg connection")
  .option("--sqlite", "Generate migrations only for the sqlite connection")
  .option("--all-connections", "Generate migrations for mysql, pg, and sqlite")
  .option("--pivot-separate", "Emit pivot tables as separate migration files")
  .description("Generate migration from a model or all models")
  .action(async (
    model: string | undefined,
    options: {
      test?: boolean;
      all?: boolean;
      mysql?: boolean;
      pg?: boolean;
      sqlite?: boolean;
      allConnections?: boolean;
      pivotSeparate?: boolean;
    }
  ) => {
    const useAll = !!(options as { all?: boolean }).all;
    const target = useAll ? "all" : model;
    if (!target) {
      console.error(chalk.red("❌ Please provide a model name or use --all"));
      return;
    }
    try {
      const connectionNames = resolveSqlConnectionNames(!!options.test, {
        mysql: !!options.mysql,
        pg: !!options.pg,
        sqlite: !!options.sqlite,
        allConnections: !!options.allConnections,
      });

      if (connectionNames.length === 0) {
        await makeMigration(target, {
          test: !!options.test,
          pivotSeparate: !!options.pivotSeparate,
          exit: false,
        });
        return;
      }

      for (const connectionName of connectionNames) {
        await makeMigration(target, {
          test: !!options.test,
          pivotSeparate: !!options.pivotSeparate,
          connectionName,
          exit: false,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`â‌Œ ${message}`));
      process.exitCode = 1;
    }
  });

program
  .command("migrate:run [model]")
  .description("Run pending migrations (optionally for one model)")
  .option("--test", "Run migrations in test database")
  .option("--mysql", "Run migrations only for the mysql connection")
  .option("--pg", "Run migrations only for the pg connection")
  .option("--sqlite", "Run migrations only for the sqlite connection")
  .option("--all-connections", "Run migrations for mysql, pg, and sqlite")
  .option("--all-migrations", "Auto-generate migrations for all models before running")
  .option("--pivot-separate", "Emit pivot tables as separate migration files (with --all-migrations)")
  .action(async (
    model?: string,
    options?: {
      test?: boolean;
      mysql?: boolean;
      pg?: boolean;
      sqlite?: boolean;
      allConnections?: boolean;
      allMigrations?: boolean;
      pivotSeparate?: boolean;
    }
  ) => {
    try {
      const connectionNames = resolveSqlConnectionNames(!!options?.test, {
        mysql: !!options?.mysql,
        pg: !!options?.pg,
        sqlite: !!options?.sqlite,
        allConnections: !!options?.allConnections,
      });

      if (options?.allMigrations) {
        if (connectionNames.length === 0) {
          await makeMigration("all", {
            test: !!options.test,
            exit: false,
            pivotSeparate: !!options.pivotSeparate,
          });
        } else {
          for (const connectionName of connectionNames) {
            await makeMigration("all", {
              test: !!options.test,
              exit: false,
              pivotSeparate: !!options.pivotSeparate,
              connectionName,
            });
          }
        }
      }

      return migrateRun(!!options?.test, model, false, true, { connectionNames });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`❌ ${message}`));
      process.exitCode = 1;
    }
  });

program
  .command("migrate:run:test [model]")
  .description("Run pending test migrations (optionally for one model)")
  .option("--mysql", "Run test migrations only for the mysql_test connection")
  .option("--pg", "Run test migrations only for the pg_test connection")
  .option("--sqlite", "Run test migrations only for the sqlite_test connection")
  .option("--all-connections", "Run test migrations for mysql_test, pg_test, and sqlite_test")
  .option("--all-migrations", "Auto-generate migrations for all test models before running")
  .option("--pivot-separate", "Emit pivot tables as separate migration files (with --all-migrations)")
  .action(async (
    model?: string,
    options?: {
      mysql?: boolean;
      pg?: boolean;
      sqlite?: boolean;
      allConnections?: boolean;
      allMigrations?: boolean;
      pivotSeparate?: boolean;
    }
  ) => {
    try {
      const connectionNames = resolveSqlConnectionNames(true, {
        mysql: !!options?.mysql,
        pg: !!options?.pg,
        sqlite: !!options?.sqlite,
        allConnections: !!options?.allConnections,
      });

      if (options?.allMigrations) {
        if (connectionNames.length === 0) {
          await makeMigration("all", {
            test: true,
            exit: false,
            pivotSeparate: !!options?.pivotSeparate,
          });
        } else {
          for (const connectionName of connectionNames) {
            await makeMigration("all", {
              test: true,
              exit: false,
              pivotSeparate: !!options?.pivotSeparate,
              connectionName,
            });
          }
        }
      }

      return migrateRun(true, model, false, true, { connectionNames });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`❌ ${message}`));
      process.exitCode = 1;
    }
  });

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
  .option("--test", "Show test migration status")
  .action((options: { test?: boolean }) => migrateStatus(!!options.test));

program
  .command("migrate:fresh")
  .description("Drop all tables and re-run every migration from scratch")
  .option("--test", "Run in test database")
  .option("--force", "Skip confirmation prompt")
  .action((options: { test?: boolean; force?: boolean }) =>
    migrateFresh({ test: !!options.test, force: !!options.force })
  );

program
  .command("migrate:reset")
  .description("Rollback *all* migrations completely")
  .option("--test", "Reset all test migrations completely")
  .action((options: { test?: boolean }) => migrateReset({ test: !!options.test }));

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
  .option("--test", "Inspect factories from test environment")
  .option("--details", "Show detailed factory metadata including relations")
  .option("--graph", "Display an ASCII diagram of model relationships")
  .description("Show all registered factories (model + pivot + relations)")
  .action(async (options: { test?: boolean; details?: boolean; graph?: boolean }) => {
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
    console.log(chalk.gray("Tip: use --test to run supported commands in test mode.\n"));
    console.table([
      { Command: "make:model <name>", Description: "--test --with-migration --attrs-from-schema --force" },
      { Command: "make:controller <name>", Description: "--soft --test" },
      { Command: "make:service <name>", Description: "--test" },
      { Command: "make:seed <model>", Description: "--count <number> --test" },
      { Command: "make:scenario <name>", Description: "--test --preset <blog|media> --controllers --services --run --force" },
      { Command: "make:factory <name>", Description: "--model <model> --test --force" },
      {
        Command: "make:migration [model]",
        Description:
          "--test --all --mysql --pg --sqlite --all-connections --pivot-separate",
      },
      { Command: "factory:status", Description: "--test --details --graph" },
      {
        Command: "db:seed",
        Description: "--test --mysql --pg --sqlite --all-connections --class <name>",
      },
      {
        Command: "db:seed:fresh",
        Description:
          "--test --mysql --pg --sqlite --all-connections --class <name> --force",
      },
      { Command: "demo:scenario", Description: "--user <id> --random --test" },
      {
        Command: "migrate:run [model]",
        Description:
          "--test --mysql --pg --sqlite --all-connections --all-migrations --pivot-separate",
      },
      {
        Command: "migrate:run:test [model]",
        Description:
          "--mysql --pg --sqlite --all-connections --all-migrations --pivot-separate",
      },
      { Command: "migrate:rollback", Description: "--test --step <number>" },
      { Command: "migrate:status", Description: "--test" },
      { Command: "migrate:fresh", Description: "--test --force" },
      { Command: "migrate:reset", Description: "--test" },
      { Command: "cache:clear", Description: "(no options)" },
      { Command: "cache:stats", Description: "(no options)" },
      { Command: "list", Description: "(no options)" },
    ]);
  });

// -----------------------------------------------------------------------------
// 🧩 Default CLI Behavior
// -----------------------------------------------------------------------------
if (process.env.ELOQUENT_DEBUG === "true") {
  console.log("[cli] before parse");
}
program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

export async function placeholder(): Promise<void> {
  console.log("This command is not yet implemented.");
}
