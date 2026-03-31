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
import { TypeScriptCompiler } from "./utils/typescript/TypeScriptCompiler.js";
import { RuntimeDetector } from "./utils/typescript/RuntimeDetector.js";
import { loadFactories } from "./utils/factories/FactoryLoader.js";
import { redactSecretsInArgs } from "../core/security/SecretRedactor.js";
import {
  buildStructuredLogLine,
  isJsonLogFormat,
  resolveLogLevel,
  shouldLogAtLevel,
  type StructuredLogLevel,
} from "./utils/StructuredLogger.js";
import {
  applyCliTestConnectionOverride,
  isCliTestArgv,
  resolveCliRequestedStorageKind,
  shouldAutoLoadFactoriesForCli,
  type CliBootstrapEnv,
} from "./utils/CliBootstrapSupport.js";
import { printCliBanner } from "./utils/CliPresentation.js";
import { registerCliSupportCommands } from "./utils/CliSupportCommandRegistration.js";
import { registerCliScaffoldCommands } from "./utils/CliScaffoldCommandRegistration.js";
import { registerCliMakeArtifactCommands } from "./utils/CliMakeArtifactCommandRegistration.js";
import { registerCliSeedScenarioCommands } from "./utils/CliSeedScenarioCommandRegistration.js";
import { registerCliMigrationCommands } from "./utils/CliMigrationCommandRegistration.js";

function resolveCommandName(argv: string[]): string {
  return (argv[2] ?? "unknown").replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
}

export function installCliLogging(
  argv: string[] = process.argv,
  env: CliBootstrapEnv = process.env,
  loggerConsole: typeof console = console,
): void {
  const commandName = resolveCommandName(argv);
  const logsDir = path.join(process.cwd(), "src", "test", "logs");
  const jsonLogs = isJsonLogFormat(env);
  const minLogLevel = resolveLogLevel(env);

  try {
    if (env.ELOQUENT_DEBUG === "true") {
      loggerConsole.log("[cli] before runtime init");
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

    const originalLog = loggerConsole.log.bind(loggerConsole);
    const originalWarn = loggerConsole.warn.bind(loggerConsole);
    const originalError = loggerConsole.error.bind(loggerConsole);
    const originalInfo = loggerConsole.info.bind(loggerConsole);

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

    loggerConsole.log = (...args: unknown[]) => emitLog("info", args, originalLog);
    loggerConsole.warn = (...args: unknown[]) => emitLog("warn", args, originalWarn);
    loggerConsole.error = (...args: unknown[]) =>
      emitLog("error", args, originalError);
    loggerConsole.info = (...args: unknown[]) => emitLog("info", args, originalInfo);
  } catch {
    // If logging fails, continue without blocking CLI.
  }
}

export function initializeCliTypeScriptRuntime(
  argv: string[] = process.argv,
  env: CliBootstrapEnv = process.env,
): void {
  try {
    const runtimeNeeded = RuntimeDetector.needsTypeScriptRuntime(argv);
    if (runtimeNeeded) {
      TypeScriptCompiler.ensureRuntime();
      if (env.ELOQUENT_RUNTIME_LOG !== "false") {
        console.log(chalk.gray("TypeScript runtime enabled (ts-node)."));
      }
      if (env.DEBUG === "true") {
        console.log(
          chalk.gray("TypeScript runtime initialized (for TS-based command)\n"),
        );
      }
    } else if (env.DEBUG === "true") {
      console.log(
        chalk.gray(
          "Skipping TypeScript runtime - not needed for this command.\n",
        ),
      );
    }
    if (env.ELOQUENT_DEBUG === "true") {
      console.log("[cli] after runtime init");
    }
  } catch (err) {
    console.error(
      chalk.red("ERROR: Failed to initialize TypeScript runtime at CLI startup."),
    );
    console.error(err);
    process.exit(1);
  }
}

export async function autoLoadCliFactories(
  argv: string[] = process.argv,
  env: CliBootstrapEnv = process.env,
): Promise<void> {
  if (env.ELOQUENT_DEBUG === "true") {
    console.log("[cli] factory auto-load check");
  }
  if (!shouldAutoLoadFactoriesForCli(argv)) {
    return;
  }

  try {
    await loadFactories(isCliTestArgv(argv), {
      storageKind: resolveCliRequestedStorageKind(argv, env),
    });
    if (env.DEBUG === "true") {
      console.log(chalk.gray("Factories loaded successfully."));
    }
  } catch (error) {
    console.error(
      chalk.red("ERROR: Failed to auto-load factories during CLI startup."),
    );
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
  }
}

export function createCliProgram(): Command {
  const program = new Command();

  printCliBanner();

  program
    .name("eloquent")
    .description("Eloquent ORM JS Command Line Interface (Artisan-like tool)")
    .version("1.0.0");

  registerCliScaffoldCommands(program);
  registerCliMakeArtifactCommands(program);
  registerCliSeedScenarioCommands(program);
  registerCliMigrationCommands(program);
  registerCliSupportCommands(program);

  return program;
}

export async function runCli(
  argv: string[] = process.argv,
  env: CliBootstrapEnv = process.env,
): Promise<void> {
  if (env.ELOQUENT_DEBUG === "true") {
    console.log("[cli] start", { argv: argv.slice(2) });
  }

  (env as Record<string, string | undefined>).ELOQUENT_CLI = "true";

  installCliLogging(argv, env);
  applyCliTestConnectionOverride(argv, env);
  initializeCliTypeScriptRuntime(argv, env);
  void autoLoadCliFactories(argv, env);

  const program = createCliProgram();

  if (env.ELOQUENT_DEBUG === "true") {
    console.log("[cli] before parse");
  }
  program.parse(argv);

  if (!argv.slice(2).length) {
    program.outputHelp();
  }
}

export function autoRunCliIfMain(
  mainModule: NodeJS.Module | undefined = require.main,
  entryModule: NodeJS.Module = module,
  runner: () => Promise<void> = runCli,
): void {
  if (mainModule === entryModule) {
    void runner();
  }
}

export async function placeholder(): Promise<void> {
  console.log("This command is not yet implemented.");
}

autoRunCliIfMain();
