#!/usr/bin/env node
/**
 * EloquentJS Artisan v1.0 CLI
 * Author: MEKHERBECHE Fares
 * Description:
 *   Official CLI for EloquentJS ORM - generates models, controllers,
 *   services, migrations, seeds, and manages caches & factories.
 */

import chalk from "chalk";
import { Command } from "commander";
import fs from "fs";
import path from "path";
import { TypeScriptCompiler } from "./utils/typescript/TypeScriptCompiler";
import { RuntimeDetector } from "./utils/typescript/RuntimeDetector";
import { loadFactories } from "./utils/factories/FactoryLoader";
import { assertSeedBootstrapPrecheck } from "./utils/SeedBootstrapPrecheck";
import { redactSecretsInArgs } from "../core/security/SecretRedactor";
import {
  buildStructuredLogLine,
  isJsonLogFormat,
  resolveLogLevel,
  shouldLogAtLevel,
  type StructuredLogLevel,
} from "./utils/StructuredLogger";
import {
  applyCliTestConnectionOverride,
  isCliTestArgv,
  resolveCliRequestedStorageKind,
  shouldAutoLoadFactoriesForCli,
} from "./utils/CliBootstrapSupport";
import {
  ensureCliProductionOverride,
  ensureCliProductionTestOnly,
} from "./utils/CliProductionGuards";

if (process.env.ELOQUENT_DEBUG === "true") {
  console.log("[cli] start", { argv: process.argv.slice(2) });
}

// Mark CLI runtime so commands can exit cleanly when done.
process.env.ELOQUENT_CLI = "true";

// -------------------------------------------------------------------------
// Test logs (plain text) - one file per command under src/test/logs
// -------------------------------------------------------------------------
const commandName = (process.argv[2] ?? "unknown")
  .replace(/[^a-z0-9_-]/gi, "_")
  .toLowerCase();
const logsDir = path.join(process.cwd(), "src", "test", "logs");
const jsonLogs = isJsonLogFormat();
const minLogLevel = resolveLogLevel();
try {
  if (process.env.ELOQUENT_DEBUG === "true") {
    console.log("[cli] before runtime init");
  }
  fs.mkdirSync(logsDir, { recursive: true });
  const logFile = path.join(logsDir, `${commandName}.log`);
  const writeLog = (level: string, args: unknown[]) => {
    const redactedArgs = redactSecretsInArgs(args);
    const message = redactedArgs
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
    "utf8",
  );

  const originalLog = console.log.bind(console);
  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);
  const originalInfo = console.info.bind(console);

  const emitLog = (
    level: StructuredLogLevel,
    args: unknown[],
    writer: (...writerArgs: unknown[]) => void,
  ): void => {
    if (!shouldLogAtLevel(level, minLogLevel)) {
      return;
    }

    const safeArgs = redactSecretsInArgs(args);
    if (jsonLogs) {
      const jsonLine = buildStructuredLogLine(level, safeArgs, {
        command: commandName,
        pid: process.pid,
      });
      writeLog(level.toUpperCase(), [jsonLine]);
      writer(jsonLine);
      return;
    }

    writeLog(level.toUpperCase(), safeArgs);
    writer(...safeArgs);
  };

  console.log = (...args: unknown[]) => emitLog("info", args, originalLog);
  console.warn = (...args: unknown[]) => emitLog("warn", args, originalWarn);
  console.error = (...args: unknown[]) => emitLog("error", args, originalError);
  console.info = (...args: unknown[]) => emitLog("info", args, originalInfo);
} catch {
  // If logging fails, continue without blocking CLI.
}

// Test-mode connection override (CLI only)
applyCliTestConnectionOverride(process.argv, process.env);

// -----------------------------------------------------------------------------
// Lazy TypeScript Runtime Initialization
// -----------------------------------------------------------------------------
try {
  const runtimeNeeded = RuntimeDetector.needsTypeScriptRuntime(process.argv);
  if (runtimeNeeded) {
    TypeScriptCompiler.ensureRuntime();
    if (process.env.ELOQUENT_RUNTIME_LOG !== "false") {
      console.log(chalk.gray("TypeScript runtime enabled (ts-node)."));
    }
    if (process.env.DEBUG === "true") {
      console.log(
        chalk.gray("TypeScript runtime initialized (for TS-based command)\n"),
      );
    }
  } else if (process.env.DEBUG === "true") {
    console.log(
      chalk.gray(
        "Skipping TypeScript runtime - not needed for this command.\n",
      ),
    );
  }
  if (process.env.ELOQUENT_DEBUG === "true") {
    console.log("[cli] after runtime init");
  }
} catch (err) {
  console.error(
    chalk.red("ERROR: Failed to initialize TypeScript runtime at CLI startup."),
  );
  console.error(err);
  process.exit(1);
}

// -----------------------------------------------------------------------------
// CLI Bootstrap
// -----------------------------------------------------------------------------
(async () => {
  if (process.env.ELOQUENT_DEBUG === "true") {
    console.log("[cli] factory auto-load check");
  }
  if (!shouldAutoLoadFactoriesForCli(process.argv)) return;
  try {
    await loadFactories(isCliTestArgv(process.argv), {
      storageKind: resolveCliRequestedStorageKind(process.argv, process.env),
    });
    if (process.env.DEBUG === "true")
      console.log(chalk.gray("Factories loaded successfully."));
  } catch (error) {
    console.error(
      chalk.red("ERROR: Failed to auto-load factories during CLI startup."),
    );
    if (error instanceof Error) console.error(chalk.red(error.message));
  }
})();

// -----------------------------------------------------------------------------
// Command Imports
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
import { makeFactory } from "./commands/makeFactory";
import { factoryStatus } from "./commands/factoryStatus";
import { dbSeed } from "./commands/dbSeed";
import { dbSeedFresh } from "./commands/dbSeedFresh";
import { demoScenario } from "./commands/demoScenario";
import { makeScenario } from "./commands/makeScenario";
import { dbSeedBootstrapPrecheck } from "./commands/dbSeedBootstrapPrecheck";
import {
  resolveCliConnectionNames,
  resolveCliPrimaryConnectionName,
} from "./utils/CliCommandTargets";
import { runCliAction } from "./utils/CliActionRuntime";
import { CLI_COMMAND_CATALOG } from "./utils/CliCommandCatalog";
import { printCliBanner } from "./utils/CliPresentation";

// -----------------------------------------------------------------------------
// CLI Setup
// -----------------------------------------------------------------------------
const program = new Command();

printCliBanner();

// -----------------------------------------------------------------------------
// Core Configuration
// -----------------------------------------------------------------------------
program
  .name("eloquent")
  .description("EloquentJS ORM Command Line Interface (Artisan-like tool)")
  .version("2.0.0");

// -----------------------------------------------------------------------------
// MAKE COMMANDS
// -----------------------------------------------------------------------------
program
  .command("make:model <name>")
  .option("--test", "Generate model inside test directory")
  .option("--mongo", "Generate a MongoModel-based model scaffold")
  .option(
    "--with-migration",
    "Automatically generate a migration for this model",
  )
  .option("--attrs-from-schema", "Infer model attrs type from schema fields")
  .option("--force", "Overwrite existing migration if it exists")
  .option(
    "--yes",
    "Acknowledge production override for this destructive command",
  )
  .description("Generate a new model (with optional migration)")
  .action(async (name: string, options: Record<string, unknown>) => {
    if (
      !ensureCliProductionOverride("make:model", {
        force: !!(options as { force?: boolean }).force,
        yes: !!(options as { yes?: boolean }).yes,
      })
    ) {
      return;
    }
    await makeModel(name, {
      ...options,
      test: !!(options as { test?: boolean }).test,
      mongo: !!(options as { mongo?: boolean }).mongo,
    });
  });

program
  .command("make:controller <name>")
  .option("--test", "Generate controller inside test directory")
  .option("--soft", "Generate controller with soft delete support")
  .option("--force", "Overwrite existing controller file if it exists")
  .option(
    "--yes",
    "Acknowledge production override for this destructive command",
  )
  .description("Create a new controller (linked to service)")
  .action(
    (
      name: string,
      options: {
        test?: boolean;
        soft?: boolean;
        force?: boolean;
        yes?: boolean;
      },
    ) => {
      if (
        !ensureCliProductionOverride("make:controller", {
          force: !!options.force,
          yes: !!options.yes,
        })
      ) {
        return;
      }
      return makeController(name, {
        test: !!options.test,
        soft: !!options.soft,
        force: !!options.force,
      });
    },
  );

program
  .command("make:service <name>")
  .option("--test", "Generate service inside test directory")
  .option("--force", "Overwrite existing service file if it exists")
  .option(
    "--yes",
    "Acknowledge production override for this destructive command",
  )
  .description("Create a new service (business logic layer)")
  .action(
    (
      name: string,
      options: { test?: boolean; force?: boolean; yes?: boolean },
    ) => {
      if (
        !ensureCliProductionOverride("make:service", {
          force: !!options.force,
          yes: !!options.yes,
        })
      ) {
        return;
      }
      return makeService(name, {
        test: !!options.test,
        force: !!options.force,
      });
    },
  );

program
  .command("make:seed <model>")
  .option("--count <number>", "Number of records to seed", "10")
  .option("--test", "Generate seed in test environment")
  .option("--mongo", "Target a Mongo-backed model")
  .option("--force", "Overwrite existing seeder file if it exists")
  .option(
    "--yes",
    "Acknowledge production override for this destructive command",
  )
  .description("Generate a seeder file linked to a model factory")
  .action(
    async (
      model: string,
      options: {
        count: string;
        test?: boolean;
        mongo?: boolean;
        force?: boolean;
        yes?: boolean;
      },
    ) => {
      if (!ensureCliProductionTestOnly("make:seed", { test: !!options.test })) {
        return;
      }
      if (
        !ensureCliProductionOverride("make:seed", {
          force: !!options.force,
          yes: !!options.yes,
        })
      ) {
        return;
      }
      await makeSeed(model, {
        count: Number(options.count),
        test: !!options.test,
        force: !!options.force,
        mongo: !!options.mongo,
      });
    },
  );

program
  .command("make:factory <name>")
  .option("--model <model>", "Specify the model this factory belongs to")
  .option("--test", "Generate in test environment")
  .option("--mongo", "Target a Mongo-backed model")
  .option("--force", "Overwrite existing file")
  .option(
    "--yes",
    "Acknowledge production override for this destructive command",
  )
  .description("Generate a factory for a model")
  .action(
    async (
      name: string,
      options: {
        model?: string;
        test?: boolean;
        mongo?: boolean;
        force?: boolean;
        yes?: boolean;
      },
    ) => {
      if (!ensureCliProductionTestOnly("make:factory", { test: !!options.test })) {
        return;
      }
      if (
        !ensureCliProductionOverride("make:factory", {
          force: !!options.force,
          yes: !!options.yes,
        })
      ) {
        return;
      }
      const modelName = options.model ?? name;

      await makeFactory(modelName, {
        test: !!options.test,
        force: !!options.force,
        mongo: !!options.mongo,
      });
    },
  );

program
  .command("make:scenario <name>")
  .option(
    "--test",
    "Generate scenario in test folders (default is app folders)",
  )
  .option("--mongo", "Generate scenario models/migrations for mongo connection")
  .option("--preset <name>", "Preset: blog | media")
  .option("--controllers", "Generate controllers for the target environment")
  .option("--services", "Generate services for the target environment")
  .option("--run", "Run migrate:fresh and db:seed for the target environment")
  .option("--force", "Overwrite existing scenario files")
  .option(
    "--yes",
    "Acknowledge production override for this destructive command",
  )
  .description(
    "Generate an automated scenario (models, migrations, factories, seeds)",
  )
  .action(
    async (
      name: string,
      options: {
        test?: boolean;
        mongo?: boolean;
        preset?: string;
        controllers?: boolean;
        services?: boolean;
        run?: boolean;
        force?: boolean;
        yes?: boolean;
      },
    ) => {
      return runCliAction(async () => {
        if (
          !ensureCliProductionTestOnly("make:scenario", { test: !!options.test })
        ) {
          return;
        }
        if (
          !ensureCliProductionOverride("make:scenario", {
            force: !!options.force,
            yes: !!options.yes,
          })
        ) {
          return;
        }
        await makeScenario(name, {
          test: !!options.test,
          mongo: !!options.mongo,
          preset: options.preset,
          controllers: !!options.controllers,
          services: !!options.services,
          run: !!options.run,
          force: !!options.force,
        });
      });
    },
  );

// -----------------------------------------------------------------------------
// SEED COMMANDS
// -----------------------------------------------------------------------------
program
  .command("db:seed")
  .option("--test", "Run seeders from test database")
  .option("--mysql", "Run seeders only for the mysql connection")
  .option("--pg", "Run seeders only for the pg connection")
  .option("--sqlite", "Run seeders only for the sqlite connection")
  .option("--mongo", "Run seeders only for the mongo connection")
  .option("--all-connections", "Run seeders for mysql, pg, and sqlite")
  .option("--class <name>", "Run a specific seeder by class name")
  .option("--silent", "Suppress non-error output during seeding")
  .option(
    "--no-hooks",
    "Disable model validation/lifecycle hooks during seeding",
  )
  .description("Run database seeders (all or specific)")
  .action(
    async (options: {
      test?: boolean;
      class?: string;
      mysql?: boolean;
      pg?: boolean;
      sqlite?: boolean;
      mongo?: boolean;
      allConnections?: boolean;
      silent?: boolean;
      noHooks?: boolean;
    }) => {
      return runCliAction(async () => {
        if (!ensureCliProductionTestOnly("db:seed", { test: !!options.test })) {
          return;
        }
        const connectionNames = resolveCliConnectionNames(options);

        if (options.allConnections) {
          const cleanBootstrap = await assertSeedBootstrapPrecheck({
            test: !!options.test,
            connectionNames,
          });
          if (!cleanBootstrap) {
            throw new Error(
              "All-connections seed precheck failed. Run migrate:run (with optional --test) first, then retry db:seed.",
            );
          }
        }

        await dbSeed({
          test: !!options.test,
          class: options.class,
          silent: !!options.silent,
          noHooks: !!options.noHooks,
          connectionNames,
        });
      });
    },
  );

program
  .command("db:seed:precheck")
  .option("--test", "Run precheck against test connections")
  .option("--mysql", "Check only the mysql connection")
  .option("--pg", "Check only the pg connection")
  .option("--sqlite", "Check only the sqlite connection")
  .option("--mongo", "Check only the mongo connection")
  .option("--all-connections", "Check mysql, pg, and sqlite")
  .description("Validate migration bootstrap state before running db:seed")
  .action(
    async (options: {
      test?: boolean;
      mysql?: boolean;
      pg?: boolean;
      sqlite?: boolean;
      mongo?: boolean;
      allConnections?: boolean;
    }) => {
      return runCliAction(async () => {
        const connectionNames = resolveCliConnectionNames(options);
        await dbSeedBootstrapPrecheck({
          test: !!options.test,
          connectionNames,
        });
      });
    },
  );

program
  .command("db:seed:fresh")
  .option("--test", "Run in test database")
  .option("--mysql", "Run fresh seed only for the mysql connection")
  .option("--pg", "Run fresh seed only for the pg connection")
  .option("--sqlite", "Run fresh seed only for the sqlite connection")
  .option("--mongo", "Run fresh seed only for the mongo connection")
  .option("--all-connections", "Run fresh seed for mysql, pg, and sqlite")
  .option("--class <name>", "Run a specific seeder after migration refresh")
  .option("--silent", "Suppress non-error output during refresh+seed")
  .option(
    "--no-hooks",
    "Disable model validation/lifecycle hooks during seeding",
  )
  .option("--force", "Skip confirmation prompt during refresh")
  .option(
    "--yes",
    "Acknowledge production override for this destructive command",
  )
  .description("Drop all tables, rerun migrations, and seed the database")
  .action(
    async (options: {
      test?: boolean;
      class?: string;
      force?: boolean;
      yes?: boolean;
      mysql?: boolean;
      pg?: boolean;
      sqlite?: boolean;
      mongo?: boolean;
      allConnections?: boolean;
      silent?: boolean;
      noHooks?: boolean;
    }) => {
      return runCliAction(async () => {
        if (
          !ensureCliProductionTestOnly("db:seed:fresh", { test: !!options.test })
        ) {
          return;
        }
        if (
          !ensureCliProductionOverride("db:seed:fresh", {
            force: !!options.force,
            yes: !!options.yes,
          })
        ) {
          return;
        }
        const connectionNames = resolveCliConnectionNames(options);

        await dbSeedFresh({
          test: !!options.test,
          class: options.class,
          force: !!options.force,
          silent: !!options.silent,
          noHooks: !!options.noHooks,
          connectionNames,
        });
      });
    },
  );

program
  .command("demo:scenario")
  .description(
    "Run a quick verification scenario for seeded data (morph + pivot)",
  )
  .option("--user <id>", "Run the scenario for a specific user id")
  .option("--random", "Pick a random user id")
  .option("--test", "Run scenario against test database")
  .option("--mysql", "Run scenario only for the mysql connection")
  .option("--pg", "Run scenario only for the pg connection")
  .option("--sqlite", "Run scenario only for the sqlite connection")
  .option("--mongo", "Run scenario only for the mongo connection")
  .action(
    async (options: {
      user?: string;
      random?: boolean;
      test?: boolean;
      mysql?: boolean;
      pg?: boolean;
      sqlite?: boolean;
      mongo?: boolean;
    }) => {
      const userId = options.user ? Number(options.user) : undefined;
      await demoScenario({
        user: Number.isFinite(userId) ? userId : undefined,
        random: !!options.random,
        test: !!options.test,
        connectionName: resolveCliPrimaryConnectionName(options),
      });
    },
  );

// -----------------------------------------------------------------------------
// ط·آ·ط¢آ¸ط£آ¢أ¢â€ڑآ¬ط¢آ¹ط·آ·ط¢آ¹ط·آ·أ¢â‚¬ط›ط·آ·ط¢آ¢ط·آ¢ط¢آ§ط·آ·ط¢آ¢ط·آ¢ط¢آ© MIGRATION COMMANDS
// -----------------------------------------------------------------------------
program
  .command("make:migration [model]")
  .option("--test", "Generate migration in test mode")
  .option("--all", "Generate migrations for all models")
  .option("--mysql", "Generate migrations only for the mysql connection")
  .option("--pg", "Generate migrations only for the pg connection")
  .option("--sqlite", "Generate migrations only for the sqlite connection")
  .option("--mongo", "Generate migrations only for the mongo connection")
  .option("--all-connections", "Generate migrations for mysql, pg, and sqlite")
  .option("--pivot-separate", "Emit pivot tables as separate migration files")
  .option("--force", "Required override flag in production mode")
  .option(
    "--yes",
    "Acknowledge production override for this destructive command",
  )
  .description("Generate migration from a model or all models")
  .action(
    async (
      model: string | undefined,
      options: {
        test?: boolean;
        all?: boolean;
        mysql?: boolean;
        pg?: boolean;
        sqlite?: boolean;
        mongo?: boolean;
        allConnections?: boolean;
        pivotSeparate?: boolean;
        force?: boolean;
        yes?: boolean;
      },
    ) => {
      if (
        !ensureCliProductionOverride("make:migration", {
          force: !!options.force,
          yes: !!options.yes,
        })
      ) {
        return;
      }
      const useAll = !!(options as { all?: boolean }).all;
      const target = useAll ? "all" : model;
      if (!target) {
        console.error(
          chalk.red("ERROR: Please provide a model name or use --all"),
        );
        return;
      }
      return runCliAction(async () => {
        const connectionNames = resolveCliConnectionNames(options);

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
      });
    },
  );

program
  .command("migrate:run [model]")
  .description("Run pending migrations (optionally for one model)")
  .option("--test", "Run migrations in test database")
  .option("--mysql", "Run migrations only for the mysql connection")
  .option("--pg", "Run migrations only for the pg connection")
  .option("--sqlite", "Run migrations only for the sqlite connection")
  .option("--mongo", "Run migrations only for the mongo connection")
  .option("--all-connections", "Run migrations for mysql, pg, and sqlite")
  .option(
    "--all-migrations",
    "Auto-generate migrations for all models before running",
  )
  .option(
    "--pivot-separate",
    "Emit pivot tables as separate migration files (with --all-migrations)",
  )
  .action(
    async (
      model?: string,
      options?: {
        test?: boolean;
        mysql?: boolean;
        pg?: boolean;
        sqlite?: boolean;
        mongo?: boolean;
        allConnections?: boolean;
        allMigrations?: boolean;
        pivotSeparate?: boolean;
      },
    ) => {
      return runCliAction(async () => {
        const connectionNames = resolveCliConnectionNames(options);

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

        return migrateRun(!!options?.test, model, false, true, {
          connectionNames,
        });
      });
    },
  );

program
  .command("migrate:rollback")
  .option("--test", "Rollback migration in test mode")
  .option("--mysql", "Rollback migrations only for the mysql connection")
  .option("--pg", "Rollback migrations only for the pg connection")
  .option("--sqlite", "Rollback migrations only for the sqlite connection")
  .option("--mongo", "Rollback migrations only for the mongo connection")
  .option("--all-connections", "Rollback migrations for mysql, pg, and sqlite")
  .option("--all-migrations", "Rollback all applied migration batches")
  .option("--step <number>", "Number of migrations to rollback", "1")
  .description("Rollback the latest migration(s)")
  .action(
    async (options: {
      test?: boolean;
      step?: string;
      mysql?: boolean;
      pg?: boolean;
      sqlite?: boolean;
      mongo?: boolean;
      allConnections?: boolean;
      allMigrations?: boolean;
    }) => {
      const stepNumber = Number(options.step ?? 1);
      const connectionNames = resolveCliConnectionNames(options);
      await migrateRollback({
        test: !!options.test,
        step: stepNumber,
        allMigrations: !!options.allMigrations,
        connectionNames,
      });
    },
  );

program
  .command("migrate:status")
  .description("Show status of all migrations (applied vs pending)")
  .option("--test", "Show test migration status")
  .option("--mysql", "Show status only for the mysql connection")
  .option("--pg", "Show status only for the pg connection")
  .option("--sqlite", "Show status only for the sqlite connection")
  .option("--mongo", "Show status only for the mongo connection")
  .option("--all-connections", "Show status for mysql, pg, and sqlite")
  .option(
    "--all-migrations",
    "Accepted for parity; status already covers all migration files",
  )
  .action(
    (options: {
      test?: boolean;
      mysql?: boolean;
      pg?: boolean;
      sqlite?: boolean;
      mongo?: boolean;
      allConnections?: boolean;
      allMigrations?: boolean;
    }) => {
      const connectionNames = resolveCliConnectionNames(options);
      return migrateStatus({
        test: !!options.test,
        allMigrations: !!options.allMigrations,
        connectionNames,
      });
    },
  );

program
  .command("migrate:fresh")
  .description("Drop all tables and re-run every migration from scratch")
  .option("--test", "Run in test database")
  .option("--mysql", "Run fresh migration only for the mysql connection")
  .option("--pg", "Run fresh migration only for the pg connection")
  .option("--sqlite", "Run fresh migration only for the sqlite connection")
  .option("--mongo", "Run fresh migration only for the mongo connection")
  .option("--all-connections", "Run fresh migration for mysql, pg, and sqlite")
  .option(
    "--all-migrations",
    "Auto-generate migrations for all models before running",
  )
  .option("--force", "Skip confirmation prompt")
  .option(
    "--yes",
    "Acknowledge production override for this destructive command",
  )
  .action(
    (options: {
      test?: boolean;
      force?: boolean;
      yes?: boolean;
      mysql?: boolean;
      pg?: boolean;
      sqlite?: boolean;
      mongo?: boolean;
      allConnections?: boolean;
      allMigrations?: boolean;
    }) => {
      if (
        !ensureCliProductionOverride("migrate:fresh", {
          force: !!options.force,
          yes: !!options.yes,
        })
      ) {
        return;
      }
      const connectionNames = resolveCliConnectionNames(options);
      return migrateFresh({
        test: !!options.test,
        force: !!options.force,
        allMigrations: !!options.allMigrations,
        connectionNames,
      });
    },
  );

program
  .command("migrate:reset")
  .description("Rollback *all* migrations completely")
  .option("--test", "Reset all test migrations completely")
  .option("--mysql", "Reset migrations only for the mysql connection")
  .option("--pg", "Reset migrations only for the pg connection")
  .option("--sqlite", "Reset migrations only for the sqlite connection")
  .option("--mongo", "Reset migrations only for the mongo connection")
  .option("--all-connections", "Reset migrations for mysql, pg, and sqlite")
  .option(
    "--all-migrations",
    "Accepted for parity; reset already rolls back all batches",
  )
  .option("--force", "Required override flag in production mode")
  .option(
    "--yes",
    "Acknowledge production override for this destructive command",
  )
  .action(
    (options: {
      test?: boolean;
      mysql?: boolean;
      pg?: boolean;
      sqlite?: boolean;
      mongo?: boolean;
      allConnections?: boolean;
      allMigrations?: boolean;
      force?: boolean;
      yes?: boolean;
    }) => {
      if (
        !ensureCliProductionOverride("migrate:reset", {
          force: !!options.force,
          yes: !!options.yes,
        })
      ) {
        return;
      }
      const connectionNames = resolveCliConnectionNames(options);
      return migrateReset({
        test: !!options.test,
        connectionNames,
        allMigrations: !!options.allMigrations,
      });
    },
  );

// -----------------------------------------------------------------------------
// CACHE COMMANDS
// -----------------------------------------------------------------------------
program
  .command("cache:clear")
  .description("Clear all ORM cache data and registry")
  .action(cacheClear);
program
  .command("cache:stats")
  .description("Show current cache performance analytics")
  .action(cacheStats);

// -----------------------------------------------------------------------------
// FACTORY INSPECTION COMMAND
// -----------------------------------------------------------------------------
program
  .command("factory:status")
  .option("--test", "Inspect factories from test environment")
  .option("--mysql", "Inspect SQL-backed factories for mysql/sql storage")
  .option("--pg", "Inspect SQL-backed factories for pg/sql storage")
  .option("--sqlite", "Inspect SQL-backed factories for sqlite/sql storage")
  .option("--mongo", "Inspect Mongo-backed factories only")
  .option(
    "--all-connections",
    "Inspect SQL-backed factories across all SQL connections",
  )
  .option("--details", "Show detailed factory metadata including relations")
  .option("--graph", "Display an ASCII diagram of model relationships")
  .description("Show all registered factories (model + pivot + relations)")
  .action(
    async (options: {
      test?: boolean;
      mysql?: boolean;
      pg?: boolean;
      sqlite?: boolean;
      mongo?: boolean;
      allConnections?: boolean;
      details?: boolean;
      graph?: boolean;
    }) => {
      await factoryStatus(options as { details?: boolean; graph?: boolean });
    },
  );

// -----------------------------------------------------------------------------
// HELP COMMAND
// -----------------------------------------------------------------------------
program
  .command("list")
  .description("Show all available EloquentJS commands")
  .action(() => {
    console.log(chalk.green("\nAvailable Commands:\n"));
    console.log(
      chalk.gray("Tip: use --test to run supported commands in test mode.\n"),
    );
    console.table(CLI_COMMAND_CATALOG);
  });

// -----------------------------------------------------------------------------
// Default CLI Behavior
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
