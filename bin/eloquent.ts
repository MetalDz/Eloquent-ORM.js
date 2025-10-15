#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { makeModel } from "../src/commands/makeModel.js";
import { makeController } from "../src/commands/makeController.js";
import { makeMigration } from "../src/commands/makeMigration.js";
import { makeSeeder } from "../src/commands/makeSeeder.js";

const program = new Command();

program
  .name("eloquent")
  .description("EloquentJS CLI (Artisan style)")
  .version("1.0.0");

// Model
program
  .command("make:model <name>")
  .description("Create a new model")
  .action((name) => makeModel(name));

// Controller
program
  .command("make:controller <name>")
  .description("Create a new controller")
  .action((name) => makeController(name));

// Migration
program
  .command("make:migration <name>")
  .description("Create a new migration")
  .action((name) => makeMigration(name));

// Seeder
program
  .command("make:seeder <name>")
  .description("Create a new seeder")
  .action((name) => makeSeeder(name));

program.parse(process.argv);
