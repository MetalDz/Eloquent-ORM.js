import fs from "fs";
import path from "path";

export class ImportResolver {
  private static readonly PACKAGE_ROOT = path.resolve(__dirname, "..", "..", "..");
  private static readonly SOURCE_INDEX_PATH = path.join(
    ImportResolver.PACKAGE_ROOT,
    "src",
    "index",
  );

  private static readonly FALLBACK_PACKAGE_NAME = "eloquent-orm.js";

  private static readonly PACKAGE_NAME = ImportResolver.readPackageName();

  private static readPackageName(): string {
    const packageJsonPath = path.join(this.PACKAGE_ROOT, "package.json");
    try {
      const raw = fs.readFileSync(packageJsonPath, "utf8");
      const pkg = JSON.parse(raw) as { name?: string };
      return pkg.name?.trim() || this.FALLBACK_PACKAGE_NAME;
    } catch {
      return this.FALLBACK_PACKAGE_NAME;
    }
  }

  private static usingInstalledPackage(): boolean {
    return path.resolve(process.cwd()) !== this.PACKAGE_ROOT;
  }

  /**
   * Resolves correct relative import path for generated files
   * depending on whether it's in app/ or test/ mode.
   */
  static coreImportPath(isTest: boolean): string {
    if (this.usingInstalledPackage()) return this.PACKAGE_NAME;
    return isTest ? "../../../core/model/BaseModel" : "../../core/model/BaseModel";
  }

  static schemaImportPath(isTest: boolean): string {
    if (this.usingInstalledPackage()) return this.PACKAGE_NAME;
    return isTest ? "../../../core/schema/SchemaBlueprint" : "../../core/schema/SchemaBlueprint";
  }

  static publicApiImportPath(fromFilePath?: string): string {
    if (this.usingInstalledPackage()) return this.PACKAGE_NAME;
    if (!fromFilePath) return "../index";

    const relativePath = path
      .relative(path.dirname(path.resolve(fromFilePath)), this.SOURCE_INDEX_PATH)
      .replace(/\\/g, "/");

    if (relativePath.startsWith(".")) {
      return relativePath;
    }

    return `./${relativePath}`;
  }
}
