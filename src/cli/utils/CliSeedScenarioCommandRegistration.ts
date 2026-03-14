import type { Command } from "commander";
import { assertSeedBootstrapPrecheck } from "./SeedBootstrapPrecheck";
import { dbSeed } from "../commands/dbSeed";
import { dbSeedFresh } from "../commands/dbSeedFresh";
import { demoScenario } from "../commands/demoScenario";
import { dbSeedBootstrapPrecheck } from "../commands/dbSeedBootstrapPrecheck";
import {
  ensureCliProductionOverride,
  ensureCliProductionTestOnly,
} from "./CliProductionGuards";
import {
  resolveCliConnectionNames,
  resolveCliPrimaryConnectionName,
} from "./CliCommandTargets";
import { runCliAction } from "./CliActionRuntime";

export function registerCliSeedScenarioCommands(program: Command): void {
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
}
