import fs from "fs";
import path from "path";
import chalk from "chalk";
import { PathMap } from "../PathMap";
import { loadModule } from "../typescript/tsRuntime";
import {
  matchesTargetStorageKind,
  resolveFactoryStorageKindFromCtor,
  type StorageKind,
} from "../ArtifactStorage";
import type { Factory } from "./Factory";
import type { BaseModel } from "../../../core/model/BaseModel";

export class FactoryRegistry {
  private static registry = new Map<string, new () => Factory<BaseModel>>();

  static register<T extends Factory<BaseModel>>(name: string, factory: new () => T): void {
    if (this.registry.has(name)) {
      console.warn(chalk.yellow(`âڑ ï¸ڈ Factory already registered: ${name}`));
      return;
    }
    this.registry.set(name, factory as new () => Factory<BaseModel>);
  }

  static registerBulk<T extends Record<string, new () => Factory<BaseModel>>>(factories: T): void {
    for (const [key, factory] of Object.entries(factories)) {
      this.register(key, factory);
    }
  }

  static make<T extends Factory<BaseModel>>(name: string): T {
    const entry = this.registry.get(name);
    if (!entry) {
      throw new Error(`â‌Œ Factory '${name}' not found in registry.`);
    }
    return new entry() as T;
  }

  static makePivot<T extends Factory<BaseModel>>(name: string): T {
    const pivotName = name.endsWith("PivotFactory") ? name : `${name}PivotFactory`;
    return this.make<T>(pivotName);
  }

  static async autoDiscover(
    isTest = false,
    options: { storageKind?: Exclude<StorageKind, "unknown"> } = {}
  ): Promise<void> {
    const dir = PathMap.factories(isTest);
    if (!fs.existsSync(dir)) {
      console.log(chalk.gray(`No factories folder found at: ${dir}`));
      return;
    }

    const files = fs.readdirSync(dir).filter((file) => file.endsWith(".ts"));

    for (const file of files) {
      const fullPath = path.join(dir, file);
      try {
        const importedModule: Record<string, unknown> = loadModule(fullPath);

        for (const [name, exported] of Object.entries(importedModule)) {
          if (typeof exported !== "function" || !exported.name.endsWith("Factory")) {
            continue;
          }

          const factoryStorageKind = resolveFactoryStorageKindFromCtor(exported);
          if (
            options.storageKind &&
            !matchesTargetStorageKind(factoryStorageKind, options.storageKind)
          ) {
            continue;
          }

          this.register(name, exported as new () => Factory<BaseModel>);
          console.log(chalk.green(`âœ… Registered factory: ${name}`));
        }
      } catch (err) {
        console.error(chalk.red(`â‌Œ Failed to import factory file: ${file}`));
        if (err instanceof Error) console.error(chalk.red(err.message));
      }
    }

    console.log(chalk.cyanBright(`\nًںڈ—ï¸ڈ  Factory auto-discovery complete.\n`));
  }

  static list(): string[] {
    return Array.from(this.registry.keys());
  }

  static clear(): void {
    this.registry.clear();
  }
}
