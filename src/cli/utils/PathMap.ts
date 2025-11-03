import path from "path";
import fs from "fs";

/**
 * 🧭 PathMap
 * Canonical, deterministic directory map for models, migrations, and seeds.
 * Environment-aware (development / test / production).
 */
export class PathMap {
  // Root project directory
  private static readonly ROOT = process.cwd();

  // --- Default folders ---
  static readonly MODELS = path.resolve(this.ROOT, "src/app/models");
  static readonly MIGRATIONS = path.resolve(this.ROOT, "src/app/database/migrations");
  static readonly SEEDS = path.resolve(this.ROOT, "src/app/database/seeds");

  // --- Test folders ---
  static readonly TEST_MODELS = path.resolve(this.ROOT, "src/test/database/models");
  static readonly TEST_MIGRATIONS = path.resolve(this.ROOT, "src/test/database/migrations");
  static readonly TEST_SEEDS = path.resolve(this.ROOT, "src/test/database/seeds");

  /**
   * 🔹 Ensure all needed directories exist.
   */
  static ensureDirs(): void {
    [
      this.MODELS,
      this.MIGRATIONS,
      this.SEEDS,
      this.TEST_MODELS,
      this.TEST_MIGRATIONS,
      this.TEST_SEEDS,
    ].forEach((dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
  }

  /**
   * 🔹 Auto-detects environment (test vs dev/prod).
   */
  private static isTestEnv(isTest?: boolean): boolean {
    return isTest || process.env.NODE_ENV === "test";
  }

  /**
   * 🔹 Get models directory path.
   */
  static models(isTest = false): string {
    return this.isTestEnv(isTest) ? this.TEST_MODELS : this.MODELS;
  }

  /**
   * 🔹 Get migrations directory path.
   */
  static migrations(isTest = false): string {
    return this.isTestEnv(isTest) ? this.TEST_MIGRATIONS : this.MIGRATIONS;
  }

  /**
   * 🔹 Get seeds directory path.
   */
  static seeds(isTest = false): string {
    return this.isTestEnv(isTest) ? this.TEST_SEEDS : this.SEEDS;
  }

  /**
   * 🧹 Utility: clear all generated test folders (optional cleanup helper)
   */
  static clearTestDirs(): void {
    [this.TEST_MODELS, this.TEST_MIGRATIONS, this.TEST_SEEDS].forEach((dir) => {
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    });
  }
}
