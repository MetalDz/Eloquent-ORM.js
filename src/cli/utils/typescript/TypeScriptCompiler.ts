import ts from "typescript";
import path from "path";
import chalk from "chalk";

/**
 * 🧠 TypeScriptCompiler
 * NestJS-style compiler that uses TypeScript's internal API.
 * Automatically loads tsconfig.json, validates files, and registers
 * ts-node for runtime TypeScript imports.
 */
export class TypeScriptCompiler {
  private static initialized = false;

  /**
   * 🔧 Public method to ensure ts-node runtime is initialized.
   * Safe to call multiple times (runs only once).
   */
  public static ensureRuntime(): void {
    if (this.initialized) return;
    this.initialized = true;

    try {
      // Register ts-node once for runtime imports
      if (!require.extensions[".ts"]) {
        require("ts-node").register({
          transpileOnly: true,
          compilerOptions: {
            module: "commonjs",
            target: "es2020",
            downlevelIteration: true,
            moduleResolution: "node",
            skipLibCheck: true,
          },
        });

        if (process.env.DEBUG === "true") {
          console.log(chalk.gray("⚙️ ts-node registered for runtime TypeScript imports"));
        }
      }
    } catch (err) {
      console.error(chalk.red("❌ Failed to initialize ts-node runtime for CLI"));
      console.error(err);
    }
  }

  /**
   * 🔹 Compiles or validates specific files using the project's tsconfig.json
   * @param files Files to compile or check (optional)
   * @param noEmit Whether to emit compiled JS or not
   */
  static compile(files: string[] = [], noEmit = true): boolean {
    this.ensureRuntime(); // ensure runtime active before compilation
    const projectRoot = process.cwd();

    // 1️⃣ Locate tsconfig.json
    const configPath = ts.findConfigFile(projectRoot, ts.sys.fileExists, "tsconfig.json");
    if (!configPath) {
      console.warn(chalk.yellow("⚠️  No tsconfig.json found. Using default compiler options."));
      return this.compileWithDefaults(files, noEmit);
    }

    // 2️⃣ Read and parse tsconfig
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));

    // 3️⃣ Create program
    const program = ts.createProgram({
      rootNames: files.length > 0 ? files : parsedConfig.fileNames,
      options: { ...parsedConfig.options, noEmit },
    });

    // 4️⃣ Collect diagnostics
    const diagnostics = ts.getPreEmitDiagnostics(program);

    // 5️⃣ Pretty print results
    if (diagnostics.length > 0) {
      diagnostics.forEach((diag) => {
        const message = ts.flattenDiagnosticMessageText(diag.messageText, "\n");
        const file = diag.file?.fileName ? path.relative(projectRoot, diag.file.fileName) : "Unknown File";
        const { line, character } = diag.file
          ? diag.file.getLineAndCharacterOfPosition(diag.start!)
          : { line: 0, character: 0 };

        console.error(
          chalk.redBright(`❌ [TS Error] ${file} (${line + 1},${character + 1}): ${message}`)
        );
      });

      console.log(chalk.red(`\n❌ Compilation failed with ${diagnostics.length} error(s).\n`));
      return false;
    }

    console.log(chalk.greenBright("✅ TypeScript compilation passed successfully.\n"));
    return true;
  }

  /**
   * 🪄 Fallback compiler (in case tsconfig.json is missing)
   */
  private static compileWithDefaults(files: string[], noEmit: boolean): boolean {
    this.ensureRuntime(); // ensure runtime before defaults

    const program = ts.createProgram(files, {
      noEmit,
      target: ts.ScriptTarget.ES2020,
      lib: ["ES2020"],
      module: ts.ModuleKind.CommonJS,
      skipLibCheck: true,
    });

    const diagnostics = ts.getPreEmitDiagnostics(program);
    if (diagnostics.length > 0) {
      diagnostics.forEach((d) =>
        console.error(ts.flattenDiagnosticMessageText(d.messageText, "\n"))
      );
      return false;
    }

    console.log(chalk.greenBright("✅ TypeScript (default config) compilation OK"));
    return true;
  }
}
