import fs from "fs";
import path from "path";
import chalk from "chalk";
import { PathMap } from "../PathMap";
import type { Factory } from "./Factory";
import type { BaseModel } from "../../../core/model/BaseModel";

/**
 * 🔗 FactoryRegistry
 * Manages registration and lookup of all EloquentJS factories.
 * ✅ Fully type-safe, constrained to BaseModel.
 */
export class FactoryRegistry {
  /**
   * Global map of registered factories.
   */
  private static registry = new Map<string, new () => Factory<BaseModel>>();

  /**
   * 📦 Register a single factory class.
   */
  static register<T extends Factory<BaseModel>>(name: string, factory: new () => T): void {
    if (this.registry.has(name)) {
      console.warn(chalk.yellow(`⚠️ Factory already registered: ${name}`));
      return;
    }
    this.registry.set(name, factory as new () => Factory<BaseModel>);
  }

  /**
   * 📦 Register multiple factories at once.
   */
  static registerBulk<T extends Record<string, new () => Factory<BaseModel>>>(factories: T): void {
    for (const [key, factory] of Object.entries(factories)) {
      this.register(key, factory);
    }
  }

  /**
   * 🧠 Resolve a factory by name.
   */
  static make<T extends Factory<BaseModel>>(name: string): T {
    const entry = this.registry.get(name);
    if (!entry) {
      throw new Error(`❌ Factory '${name}' not found in registry.`);
    }
    return new entry() as T;
  }

  /**
   * 🧩 Resolve a pivot factory by name.
   */
  static makePivot<T extends Factory<BaseModel>>(name: string): T {
    const pivotName = name.endsWith("PivotFactory") ? name : `${name}PivotFactory`;
    return this.make<T>(pivotName);
  }

  /**
   * 🧭 Auto-discover all factories in the factories directory.
   */
  static async autoDiscover(): Promise<void> {
    const dir = PathMap.factories();
    if (!fs.existsSync(dir)) {
      console.warn(chalk.yellow(`⚠️ No factories folder found at: ${dir}`));
      return;
    }

    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".ts"));

    for (const file of files) {
      const fullPath = path.join(dir, file);
      try {
        const importedModule: Record<string, unknown> = await import(fullPath);

        for (const [name, exported] of Object.entries(importedModule)) {
          if (
            typeof exported === "function" &&
            exported.name.endsWith("Factory")
          ) {
            this.register(name, exported as new () => Factory<BaseModel>);
            console.log(chalk.green(`✅ Registered factory: ${name}`));
          }
        }
      } catch (err) {
        console.error(chalk.red(`❌ Failed to import factory file: ${file}`));
        if (err instanceof Error) console.error(chalk.red(err.message));
      }
    }

    console.log(chalk.cyanBright(`\n🏗️  Factory auto-discovery complete.\n`));
  }

  /**
   * 📋 List all registered factories.
   */
  static list(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * ♻️ Clear all registered factories (for testing or reload).
   */
  static clear(): void {
    this.registry.clear();
  }
}
