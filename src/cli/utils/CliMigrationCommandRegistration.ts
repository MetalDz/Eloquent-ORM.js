import type { Command } from "commander";
import chalk from "chalk";
import { makeMigration } from "../commands/makeMigration";
import { migrateRun } from "../commands/migrateRun";
import { migrateRollback } from "../commands/migrateRollback";
import { migrateStatus } from "../commands/migrateStatus";
import { migrateFresh } from "../commands/migrateFresh";
import { migrateReset } from "../commands/migrateReset";
import { resolveCliConnectionNames } from "./CliCommandTargets";
import { runCliAction } from "./CliActionRuntime";
import { ensureCliProductionOverride } from "./CliProductionGuards";

export function registerCliMigrationCommands(program: Command): void {
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
}
