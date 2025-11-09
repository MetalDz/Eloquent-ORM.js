import { TypeScriptCompiler } from "./TypeScriptCompiler";
import chalk from "chalk";

/**
 * 🧩 BaseCommand
 * Shared foundation for all Eloquent CLI commands.
 * Provides common utilities (compiler, logger, error handling, etc.)
 */
export abstract class BaseCommand {
  protected readonly compiler = TypeScriptCompiler;

  constructor() {
    // ✅ Ensure ts-node runtime is ready for all CLI commands
    TypeScriptCompiler.ensureRuntime();
  }

  protected success(message: string) {
    console.log(chalk.greenBright(`✅ ${message}`));
  }

  protected info(message: string) {
    console.log(chalk.cyan(`ℹ️  ${message}`));
  }

  protected warn(message: string) {
    console.log(chalk.yellow(`⚠️  ${message}`));
  }

  protected error(message: string, err?: unknown) {
    console.error(chalk.redBright(`❌ ${message}`));
    if (err) console.error(err);
  }
}
