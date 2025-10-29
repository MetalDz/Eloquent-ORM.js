#!/usr/bin/env node
/**
 * 🧠 EloquentJS Artisan v2.0 CLI
 * Author: MEKHERBECHE Fares
 * Description:
 *   This is the official command-line interface for the EloquentJS ORM ecosystem.
 *   It provides developer tools for generating models, controllers, services, and managing cache systems.
 */

import { Command } from "commander";
import chalk from "chalk";
import figlet from "figlet";

// 🧩 Import command handlers
import { makeModel } from "./commands/makeModel";
import { makeController } from "./commands/makeController";
import { makeService } from "./commands/makeService";
import { makeSeed } from "./commands/makeSeed";
import { makeMigration } from "./commands/makeMigration";
import { migrateRun } from "./commands/migrateRun";
import { cacheClear } from "./commands/cacheClear";
import { cacheStats } from "./commands/cacheStats";

// -----------------------------------------------------------------------------
// 🧱 CLI Setup
// -----------------------------------------------------------------------------
const program = new Command();

console.log(
  chalk.cyan(
    figlet.textSync("EloquentJS", { horizontalLayout: "fitted" })
  )
);
console.log(chalk.gray("⚡ Developer CLI for EloquentJS ORM (v2.0)\n"));

// -----------------------------------------------------------------------------
// ⚙️ General CLI Info
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
  .description("Generate a new model file with schema and migration")
  .action(makeModel);
  
program
  .command("make:controller <name>")
  .description("Create a new controller (linked to service)")
  .action(makeController);

program
  .command("make:service <name>")
  .description("Create a new service (business logic layer)")
  .action(makeService);

program
  .command("make:seed <name>")
  .description("Create a new database seeder file")
  .action(makeSeed);

program
  .command("make:migration <name>")
  .description("Create a new migration file with timestamp")
  .action(makeMigration);

program
  .command("migrate:run")
  .description("Run all pending migrations")
  .action(migrateRun);
// -----------------------------------------------------------------------------
// 🧩 CACHE COMMANDS
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
// 🧠 HELP / DEFAULT BEHAVIOR
// -----------------------------------------------------------------------------
program
  .command("list")
  .description("Show all available EloquentJS commands")
  .action(() => {
    console.log(chalk.green("\n📜 Available Commands:\n"));
    console.table([
      { Command: "make:model <name>", Description: "Generate a new model file with schema and migration" },
      { Command: "make:controller <name>", Description: "Generate a controller" },
      { Command: "make:service <name>", Description: "Generate a service class" },
      { Command: "make:seed <name>", Description: "Generate a seeder" },
      { Command: "make:migration <name>", Description: "Generate a migration" },
      { Command: "migrate:run", Description: "Run all pending migrations" },
      { Command: "cache:clear", Description: "Clear all cache layers" },
      { Command: "cache:stats", Description: "View cache analytics" },
    ]);
  });

// Parse user input
program.parse(process.argv);

// If no args provided → show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}


export async function placeholder() {
  console.log("This command is not yet implemented.");
}