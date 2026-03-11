import fs from "fs";
import path from "path";
import { dbConfig } from "../../config/database";
import { MongoModel, SqlModel } from "../../core/model/BaseModel";
import { PathMap } from "./PathMap";
import { loadModule } from "./typescript/tsRuntime";
import type { BaseModel } from "../../core/model/BaseModel";
import type { Factory } from "./factories/Factory";

export type StorageKind = "mongo" | "sql" | "unknown";

function resolveExistingPath(filePath: string): string | null {
  if (fs.existsSync(filePath)) {
    return filePath;
  }

  for (const ext of [".ts", ".js"]) {
    const candidate = `${filePath}${ext}`;
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function isCtor(value: unknown): value is new (...args: unknown[]) => unknown {
  return typeof value === "function";
}

function isMongoModelCtor(value: unknown): boolean {
  return isCtor(value) && value.prototype instanceof MongoModel;
}

function isSqlModelCtor(value: unknown): boolean {
  return isCtor(value) && value.prototype instanceof SqlModel;
}

export function resolveModelStorageKindFromCtor(modelCtor: unknown): StorageKind {
  if (isMongoModelCtor(modelCtor)) {
    return "mongo";
  }

  if (isSqlModelCtor(modelCtor)) {
    return "sql";
  }

  const connectionName = (modelCtor as { connectionName?: unknown } | undefined)?.connectionName;
  if (typeof connectionName === "string") {
    const driver = dbConfig.connections[connectionName as keyof typeof dbConfig.connections]?.driver;
    return driver === "mongo" ? "mongo" : driver ? "sql" : "unknown";
  }

  return "unknown";
}

export function resolveFactoryStorageKindFromCtor(factoryCtor: unknown): StorageKind {
  if (!isCtor(factoryCtor)) {
    return "unknown";
  }

  try {
    const instance = new (factoryCtor as new () => Factory<BaseModel>)();
    return resolveModelStorageKindFromCtor(instance.model);
  } catch {
    return "unknown";
  }
}

export function resolveModelStorageKind(
  modelName: string,
  isTest: boolean
): StorageKind {
  const modelsDir = PathMap.models(isTest);
  const modelPath = resolveExistingPath(path.join(modelsDir, modelName));

  if (!modelPath) {
    return "unknown";
  }

  const importedModule = loadModule(modelPath);
  return resolveModelStorageKindFromCtor(importedModule[modelName]);
}

function collectFactoryImportBasenames(filePath: string): string[] {
  const content = fs.readFileSync(filePath, "utf8");
  const matches = content.matchAll(/from\s+["']\.\.\/factories\/([^"']+)["']/g);
  const basenames = new Set<string>();

  for (const match of matches) {
    const rawImport = match[1]?.trim();
    if (!rawImport) {
      continue;
    }
    basenames.add(path.basename(rawImport));
  }

  return Array.from(basenames);
}

export function resolveSeederStorageKindFromFile(
  filePath: string,
  isTest: boolean
): StorageKind {
  if (!fs.existsSync(filePath)) {
    return "unknown";
  }

  const factoriesDir = PathMap.factories(isTest);
  const importedFactories = collectFactoryImportBasenames(filePath);
  if (importedFactories.length === 0) {
    return "unknown";
  }

  const kinds = new Set<StorageKind>();
  for (const importedFactory of importedFactories) {
    const factoryPath = resolveExistingPath(path.join(factoriesDir, importedFactory));
    if (!factoryPath) {
      kinds.add("unknown");
      continue;
    }

    const importedModule = loadModule(factoryPath);
    const exportName = Object.keys(importedModule).find(
      (name) => name === importedFactory || name.endsWith("Factory")
    );
    kinds.add(resolveFactoryStorageKindFromCtor(exportName ? importedModule[exportName] : undefined));
  }

  if (kinds.has("mongo") && !kinds.has("sql") && kinds.size === 1) {
    return "mongo";
  }

  if (kinds.has("sql") && !kinds.has("mongo") && kinds.size === 1) {
    return "sql";
  }

  return kinds.size === 1 ? Array.from(kinds)[0] : "unknown";
}

export function targetStorageKindForConnection(connectionName: string): Exclude<StorageKind, "unknown"> {
  const driver = dbConfig.connections[connectionName as keyof typeof dbConfig.connections]?.driver;
  return driver === "mongo" ? "mongo" : "sql";
}

export function matchesTargetStorageKind(
  artifactKind: StorageKind,
  targetKind: Exclude<StorageKind, "unknown">
): boolean {
  return artifactKind === "unknown" || artifactKind === targetKind;
}
