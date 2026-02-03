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
  static get root(): string {
    return this.ROOT;
  }

  // --- Default app folders ---
  static readonly MODELS = path.resolve(this.ROOT, "src/app/models");
  static readonly MIGRATIONS = path.resolve(this.ROOT, "src/app/database/migrations");
  static readonly FACTORIES = path.resolve(this.ROOT, "src/app/database/factories");
  static readonly SEEDS = path.resolve(this.ROOT, "src/app/database/seeds");

  // --- CLI template directory ---
  static readonly CLI_TEMPLATES = path.resolve(this.ROOT, "src/cli/templates");

  // --- Test folders ---
  static readonly TEST_MODELS = path.resolve(this.ROOT, "src/test/database/models");
  static readonly TEST_MIGRATIONS = path.resolve(this.ROOT, "src/test/database/migrations");
  static readonly TEST_FACTORIES = path.resolve(this.ROOT, "src/test/database/factories");
  static readonly TEST_SEEDS = path.resolve(this.ROOT, "src/test/database/seeds");

  /**
   * 🔹 Ensure all needed directories exist.
   */
  static ensureDirs(): void {
    [
      this.MODELS,
      this.MIGRATIONS,
      this.FACTORIES,
      this.SEEDS,
      this.TEST_MODELS,
      this.TEST_MIGRATIONS,
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
    return isTest || process.env.NODE_ENV === "test";
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
  static migrations(isTest = false): string {
    return this.isTestEnv(isTest) ? this.TEST_MIGRATIONS : this.MIGRATIONS;
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
    return path.resolve(this.CLI_TEMPLATES, fileName);
  }

  /**
   * 🧹 Utility: clear all generated test folders.
   */
  static clearTestDirs(): void {
    [
      this.TEST_MODELS,
      this.TEST_MIGRATIONS,
      this.TEST_FACTORIES,
      this.TEST_SEEDS,
    ].forEach((dir) => {
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    });
  }
}
