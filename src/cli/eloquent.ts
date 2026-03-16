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
import { registerCliScaffoldCommands } from "./utils/CliScaffoldCommandRegistration";
import { registerCliMakeArtifactCommands } from "./utils/CliMakeArtifactCommandRegistration";
import { registerCliSeedScenarioCommands } from "./utils/CliSeedScenarioCommandRegistration";
import { registerCliMigrationCommands } from "./utils/CliMigrationCommandRegistration";

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

import { printCliBanner } from "./utils/CliPresentation";
import { registerCliSupportCommands } from "./utils/CliSupportCommandRegistration";

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
  .description("Eloquent ORM JS Command Line Interface (Artisan-like tool)")
  .version("1.0.0");

// -----------------------------------------------------------------------------
// MAKE COMMANDS
// -----------------------------------------------------------------------------
registerCliScaffoldCommands(program);
registerCliMakeArtifactCommands(program);

// -----------------------------------------------------------------------------
// SEED COMMANDS
// -----------------------------------------------------------------------------
registerCliSeedScenarioCommands(program);

// -----------------------------------------------------------------------------
// MIGRATION COMMANDS
// -----------------------------------------------------------------------------
registerCliMigrationCommands(program);


registerCliSupportCommands(program);

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
