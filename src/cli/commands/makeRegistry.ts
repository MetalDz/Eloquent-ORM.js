import fs from "fs";
import path from "path";
import chalk from "chalk";
import { TemplateEngine } from "../utils/TemplateEngine";
import { overwriteFile, writeFileSafe } from "../utils/fileWriter";
import { PathMap } from "../utils/PathMap";
import { ImportResolver } from "../utils/ImportResolver";

type RegistryOptions = {
  test?: boolean;
  force?: boolean;
};

type RegistryModelSpec = {
  name: string;
  importPath: string;
};

type PackageJsonShape = {
  type?: string;
};

type TsConfigShape = {
  compilerOptions?: {
    module?: string;
    moduleResolution?: string;
  };
};

function isValidIdentifier(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

function stripJsonComments(raw: string): string {
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function readJsonFile<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(stripJsonComments(raw)) as T;
  } catch {
    return null;
  }
}

function usesNodeEsmRegistryImports(rootDir: string): boolean {
  const packageJson = readJsonFile<PackageJsonShape>(path.join(rootDir, "package.json"));
  const packageType = typeof packageJson?.type === "string" ? packageJson.type.trim() : "";
  if (packageType === "module") {
    return true;
  }

  const tsconfig = readJsonFile<TsConfigShape>(path.join(rootDir, "tsconfig.json"));
  const compilerOptions =
    tsconfig && typeof tsconfig === "object" ? tsconfig.compilerOptions : undefined;
  const moduleName =
    typeof compilerOptions?.module === "string"
      ? compilerOptions.module.trim().toLowerCase()
      : "";
  const moduleResolution =
    typeof compilerOptions?.moduleResolution === "string"
      ? compilerOptions.moduleResolution.trim().toLowerCase()
      : "";

  return (
    moduleName === "nodenext" ||
    moduleName === "node16" ||
    moduleResolution === "nodenext" ||
    moduleResolution === "node16"
  );
}

function withRuntimeRelativeImportExtension(importPath: string, rootDir: string): string {
  if (!usesNodeEsmRegistryImports(rootDir)) {
    return importPath;
  }

  const isRelativeImport = importPath.startsWith(".");
  if (!isRelativeImport) {
    return importPath;
  }

  const hasRuntimeExtension = /\.(?:[cm]?js|json)$/i.test(importPath);
  if (hasRuntimeExtension) {
    return importPath;
  }

  return `${importPath}.js`;
}

function discoverRegistryModels(isTest: boolean): RegistryModelSpec[] {
  const modelsDir = PathMap.models(isTest);
  const importBase = isTest ? "./database/models" : "./models";
  const rootDir = PathMap.root;

  if (!fs.existsSync(modelsDir)) {
    return [];
  }

  return fs
    .readdirSync(modelsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => fileName.endsWith(".ts"))
    .filter((fileName) => !fileName.endsWith(".d.ts"))
    .map((fileName) => path.basename(fileName, ".ts"))
    .filter((baseName) => baseName !== "index")
    .filter(isValidIdentifier)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      name,
      importPath: withRuntimeRelativeImportExtension(`${importBase}/${name}`, rootDir),
    }));
}

function registryOutputPath(isTest: boolean): string {
  return path.resolve(PathMap.root, isTest ? "src/test/registerModels.ts" : "src/app/registerModels.ts");
}

function registryRelativePath(isTest: boolean): string {
  return isTest ? "src/test/registerModels.ts" : "src/app/registerModels.ts";
}

function registryFunctionName(isTest: boolean): string {
  return isTest ? "registerTestModels" : "registerAppModels";
}

function registryConstName(isTest: boolean): string {
  return isTest ? "TEST_MODELS" : "APP_MODELS";
}

export const __makeRegistryInternals = {
  stripJsonComments,
  readJsonFile,
  usesNodeEsmRegistryImports,
  withRuntimeRelativeImportExtension,
};

export async function makeRegistry(options: RegistryOptions = {}): Promise<void> {
  try {
    const isTest = !!options.test;
    const forceWrite = !!options.force;

    PathMap.ensureDirs();

    const outputPath = registryOutputPath(isTest);
    const relativePath = registryRelativePath(isTest);
    const models = discoverRegistryModels(isTest);
    const template = TemplateEngine.load("model-registry");
    const outputImportPath = withRuntimeRelativeImportExtension(
      ImportResolver.publicApiImportPath(outputPath),
      PathMap.root,
    );
    const rendered = TemplateEngine.render(template, {
      packageImportPath: outputImportPath,
      models,
      modelsConstName: registryConstName(isTest),
      functionName: registryFunctionName(isTest),
    });

    const header = `/**
 * Auto-generated EloquentJS model registry bootstrap
 * Mode: ${isTest ? "TEST" : "APP"}
 * Generated at: ${new Date().toISOString()}
 */

`;

    const created = forceWrite
      ? overwriteFile(outputPath, header + rendered)
      : writeFileSafe(outputPath, header + rendered);

    if (!created) {
      return;
    }

    console.log(chalk.greenBright("Model registry created:"), chalk.cyan(relativePath));
    if (models.length === 0) {
      console.log(
        chalk.yellow("No model files were found. Generated an empty registerModels bootstrap."),
      );
    }
  } catch (err) {
    console.error(chalk.red("Failed to create model registry bootstrap."));
    console.error(err);
  }
}
