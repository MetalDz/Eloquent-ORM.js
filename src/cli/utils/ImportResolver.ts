import fs from "fs";
import path from "path";

type PackageJsonShape = {
  type?: string;
  name?: string;
};

type TsConfigShape = {
  compilerOptions?: {
    module?: string;
    moduleResolution?: string;
  };
};

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

export class ImportResolver {
  private static readonly PACKAGE_ROOT = path.resolve(__dirname, "..", "..", "..");
  private static readonly SOURCE_INDEX_PATH = path.join(
    ImportResolver.PACKAGE_ROOT,
    "src",
    "index",
  );

  private static readonly FALLBACK_PACKAGE_NAME = "@alpha.consultings/eloquent-orm.js";

  private static readonly PACKAGE_NAME = ImportResolver.readPackageName();

  private static readPackageName(): string {
    const packageJsonPath = path.join(this.PACKAGE_ROOT, "package.json");
    try {
      const raw = fs.readFileSync(packageJsonPath, "utf8");
      const pkg = JSON.parse(raw) as PackageJsonShape;
      return pkg.name?.trim() || this.FALLBACK_PACKAGE_NAME;
    } catch {
      return this.FALLBACK_PACKAGE_NAME;
    }
  }

  private static usingInstalledPackage(rootDir = process.cwd()): boolean {
    return path.resolve(rootDir) !== this.PACKAGE_ROOT;
  }

  static usesNodeEsmRuntime(rootDir = process.cwd()): boolean {
    const packageJson = readJsonFile<PackageJsonShape>(
      path.join(rootDir, "package.json"),
    );
    const packageType =
      typeof packageJson?.type === "string" ? packageJson.type.trim() : "";
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

  static withRuntimeRelativeImportExtension(
    importPath: string,
    rootDir = process.cwd(),
  ): string {
    if (!this.usesNodeEsmRuntime(rootDir)) {
      return importPath;
    }

    if (!importPath.startsWith(".")) {
      return importPath;
    }

    if (/\.(?:[cm]?js|json)$/i.test(importPath)) {
      return importPath;
    }

    return `${importPath}.js`;
  }

  /**
   * Resolves correct relative import path for generated files
   * depending on whether it's in app/ or test/ mode.
   */
  static coreImportPath(isTest: boolean, rootDir = process.cwd()): string {
    if (this.usingInstalledPackage(rootDir)) return this.PACKAGE_NAME;
    const importPath = isTest
      ? "../../../core/model/BaseModel"
      : "../../core/model/BaseModel";
    return this.withRuntimeRelativeImportExtension(importPath, rootDir);
  }

  static schemaImportPath(isTest: boolean, rootDir = process.cwd()): string {
    if (this.usingInstalledPackage(rootDir)) return this.PACKAGE_NAME;
    const importPath = isTest
      ? "../../../core/schema/SchemaBlueprint"
      : "../../core/schema/SchemaBlueprint";
    return this.withRuntimeRelativeImportExtension(importPath, rootDir);
  }

  static publicApiImportPath(fromFilePath?: string, rootDir = process.cwd()): string {
    if (this.usingInstalledPackage(rootDir)) return this.PACKAGE_NAME;
    if (!fromFilePath) {
      return this.withRuntimeRelativeImportExtension("../index", rootDir);
    }

    const relativePath = path
      .relative(path.dirname(path.resolve(fromFilePath)), this.SOURCE_INDEX_PATH)
      .replace(/\\/g, "/");

    const importPath = relativePath.startsWith(".")
      ? relativePath
      : `./${relativePath}`;

    return this.withRuntimeRelativeImportExtension(importPath, rootDir);
  }
}

export const __importResolverInternals = {
  stripJsonComments,
  readJsonFile,
};
