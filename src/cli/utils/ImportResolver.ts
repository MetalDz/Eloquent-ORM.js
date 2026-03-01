import fs from "fs";
import path from "path";

export class ImportResolver {
  private static readonly PACKAGE_ROOT = path.resolve(__dirname, "..", "..", "..");

  private static readonly PACKAGE_NAME = ImportResolver.readPackageName();

  private static readPackageName(): string {
    const packageJsonPath = path.join(this.PACKAGE_ROOT, "package.json");
    try {
      const raw = fs.readFileSync(packageJsonPath, "utf8");
      const pkg = JSON.parse(raw) as { name?: string };
      return pkg.name?.trim() || "eloquentjs";
    } catch {
      return "eloquentjs";
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
}
