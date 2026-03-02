import path from "path";
import fs from "fs";

/**
 * 🧭 PathMap
 * Canonical, deterministic directory map for models, migrations, factories, and seeds.
 * Environment-aware (development / test / production).
 */
export class PathMap {
  // Root project directory
  private static readonly ROOT = process.cwd();
  private static readonly PACKAGE_ROOT = path.resolve(__dirname, "..", "..", "..");
  private static readonly APP_DATABASE_ROOT = path.resolve(this.ROOT, "src/app/database");
  private static readonly TEST_DATABASE_ROOT = path.resolve(this.ROOT, "src/test/database");
  static get root(): string {
    return this.ROOT;
  }

  // --- Default app folders ---
  static readonly MODELS = path.resolve(this.ROOT, "src/app/models");
  static readonly MIGRATIONS_ROOT = path.resolve(this.APP_DATABASE_ROOT, "migrations");
  static readonly FACTORIES = path.resolve(this.ROOT, "src/app/database/factories");
  static readonly SEEDS = path.resolve(this.ROOT, "src/app/database/seeds");

  // --- CLI template directory ---
  private static readonly PROJECT_CLI_TEMPLATES = path.resolve(this.ROOT, "src/cli/templates");
  private static readonly PACKAGE_CLI_TEMPLATES = path.resolve(
    this.PACKAGE_ROOT,
    "src/cli/templates"
  );

  // --- Test folders ---
  static readonly TEST_MODELS = path.resolve(this.ROOT, "src/test/database/models");
  static readonly TEST_MIGRATIONS_ROOT = path.resolve(this.TEST_DATABASE_ROOT, "migrations");
  static readonly TEST_FACTORIES = path.resolve(this.ROOT, "src/test/database/factories");
  static readonly TEST_SEEDS = path.resolve(this.ROOT, "src/test/database/seeds");

  /**
   * 🔹 Ensure all needed directories exist.
   */
  static ensureDirs(): void {
    [
      this.MODELS,
      this.MIGRATIONS_ROOT,
      this.FACTORIES,
      this.SEEDS,
      this.TEST_MODELS,
      this.TEST_MIGRATIONS_ROOT,
      this.TEST_FACTORIES,
      this.TEST_SEEDS,
    ].forEach((dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
  }

  /**
   * 🔹 Auto-detect test environment.
   */
  private static isTestEnv(isTest?: boolean): boolean {
    if (typeof isTest === "boolean") {
      return isTest;
    }
    return process.env.NODE_ENV === "test";
  }

  /**
   * 🔹 Get models directory.
   */
  static models(isTest = false): string {
    return this.isTestEnv(isTest) ? this.TEST_MODELS : this.MODELS;
  }

  /**
   * 🔹 Get migrations directory.
   */
  private static sanitizePathSegment(segment: string): string {
    return segment.replace(/[^A-Za-z0-9_-]/g, "_");
  }

  static appMigrations(connectionName?: string): string {
    if (!connectionName) {
      return this.MIGRATIONS_ROOT;
    }

    return path.resolve(
      this.MIGRATIONS_ROOT,
      this.sanitizePathSegment(connectionName)
    );
  }

  static testMigrations(connectionName?: string): string {
    if (!connectionName) {
      return this.TEST_MIGRATIONS_ROOT;
    }

    return path.resolve(
      this.TEST_MIGRATIONS_ROOT,
      this.sanitizePathSegment(connectionName)
    );
  }

  static migrations(isTest = false, connectionName?: string): string {
    return this.isTestEnv(isTest)
      ? this.testMigrations(connectionName)
      : this.appMigrations(connectionName);
  }

  /**
   * 🔹 Get factories directory.
   */
  static factories(isTest = false): string {
    return this.isTestEnv(isTest) ? this.TEST_FACTORIES : this.FACTORIES;
  }

  /**
   * 🔹 Get seeds directory.
   */
  static seeds(isTest = false): string {
    return this.isTestEnv(isTest) ? this.TEST_SEEDS : this.SEEDS;
  }

  /**
   * 🔹 Get CLI template path by name.
   */
  static template(name: string): string {
    const fileName = name.endsWith(".tpl") ? name : `${name}.tpl`;
    const baseDir = fs.existsSync(this.PROJECT_CLI_TEMPLATES)
      ? this.PROJECT_CLI_TEMPLATES
      : this.PACKAGE_CLI_TEMPLATES;
    return path.resolve(baseDir, fileName);
  }

  /**
   * 🧹 Utility: clear all generated test folders.
   */
  static clearTestDirs(): void {
    [
      this.TEST_MODELS,
      this.TEST_MIGRATIONS_ROOT,
      this.TEST_FACTORIES,
      this.TEST_SEEDS,
    ].forEach((dir) => {
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    });
  }
}
