import type { Command } from "commander";
import chalk from "chalk";
import { cacheClear } from "../commands/cacheClear";
import { cacheStats } from "../commands/cacheStats";
import { factoryStatus } from "../commands/factoryStatus";
import { CLI_COMMAND_CATALOG } from "./CliCommandCatalog";

export function registerCliSupportCommands(program: Command): void {
  program
    .command("cache:clear")
    .description("Clear all ORM cache data and registry")
    .action(cacheClear);

  program
    .command("cache:stats")
    .description("Show current cache performance analytics")
    .action(cacheStats);

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
}
