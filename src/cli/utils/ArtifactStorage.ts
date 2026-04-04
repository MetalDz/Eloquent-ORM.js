import fs from "fs";
import path from "path";
import { dbConfig } from "../../config/database.js";
import { MongoModel, SqlModel } from "../../core/model/BaseModel.js";
import { PathMap } from "./PathMap.js";
import { loadModule } from "./typescript/tsRuntime.js";
import type { BaseModel } from "../../core/model/BaseModel.js";
import type { Factory } from "./factories/Factory.js";
import {
  collapseStorageKinds,
  resolveArtifactCompatibility,
  type StorageKind,
  type TargetStorageKind,
} from "./ArtifactCompatibility.js";
export type { ArtifactCompatibilityReason, StorageKind, TargetStorageKind } from "./ArtifactCompatibility.js";

function resolveExistingPath(filePath: string): string | null {
  if (fs.existsSync(filePath)) {
    return filePath;
  }

  const parsedPath = path.parse(filePath);
  if (parsedPath.ext === ".js" || parsedPath.ext === ".mjs" || parsedPath.ext === ".cjs") {
    const sourceCandidate = path.join(parsedPath.dir, parsedPath.name);
    if (fs.existsSync(sourceCandidate)) {
      return sourceCandidate;
    }

    for (const ext of [".ts", ".js"]) {
      const candidate = `${sourceCandidate}${ext}`;
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  for (const ext of [".ts", ".js"]) {
    const candidate = `${filePath}${ext}`;
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function readFileContent(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function resolveStorageKindFromConnectionName(connectionName: unknown): StorageKind {
  if (typeof connectionName !== "string") {
    return "unknown";
  }

  const driver = dbConfig.connections[connectionName as keyof typeof dbConfig.connections]?.driver;
  return driver === "mongo" ? "mongo" : driver ? "sql" : "unknown";
}

function resolveModelStorageKindFromContent(content: string): StorageKind {
  if (/\bextends\s+MongoModel\b/.test(content)) {
    return "mongo";
  }

  if (/\bextends\s+SqlModel\b/.test(content)) {
    return "sql";
  }

  const connectionMatch = content.match(
    /static\s+connectionName\s*=\s*(?:process\.env\.[A-Z0-9_]+\s*\?\?\s*)?["'`]([^"'`]+)["'`]/
  );
  if (connectionMatch?.[1]) {
    return resolveStorageKindFromConnectionName(connectionMatch[1]);
  }

  return "unknown";
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
  const connectionKind = resolveStorageKindFromConnectionName(connectionName);
  if (connectionKind !== "unknown") return connectionKind;

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

  const content = readFileContent(modelPath);
  if (content) {
    const staticKind = resolveModelStorageKindFromContent(content);
    if (staticKind !== "unknown") {
      return staticKind;
    }
  }

  const importedModule = loadModule(modelPath);
  return resolveModelStorageKindFromCtor(importedModule[modelName]);
}

function collectModelImportBasenames(filePath: string): string[] {
  const content = readFileContent(filePath);
  if (!content) {
    return [];
  }

  const matches = content.matchAll(/from\s+["'][^"']*models\/([^"']+)["']/g);
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

export function resolveFactoryStorageKindFromFile(
  filePath: string,
  isTest: boolean
): StorageKind {
  if (!fs.existsSync(filePath)) {
    return "unknown";
  }

  const modelsDir = PathMap.models(isTest);
  const importedModels = collectModelImportBasenames(filePath);

  if (importedModels.length > 0) {
    const kinds = new Set<StorageKind>();
    for (const importedModel of importedModels) {
      const modelPath = resolveExistingPath(path.join(modelsDir, importedModel));
      if (!modelPath) {
        kinds.add("unknown");
        continue;
      }

      const content = readFileContent(modelPath);
      if (!content) {
        kinds.add("unknown");
        continue;
      }

      kinds.add(resolveModelStorageKindFromContent(content));
    }

    return collapseStorageKinds(kinds);
  }

  const importedModule = loadModule(filePath);
  const exportName = Object.keys(importedModule).find((name) =>
    name.endsWith("Factory")
  );
  return resolveFactoryStorageKindFromCtor(exportName ? importedModule[exportName] : undefined);
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
    kinds.add(resolveFactoryStorageKindFromFile(factoryPath, isTest));
  }

  return collapseStorageKinds(kinds);
}

export function targetStorageKindForConnection(
  connectionName: string
): TargetStorageKind {
  const driver = dbConfig.connections[connectionName as keyof typeof dbConfig.connections]?.driver;
  return driver === "mongo" ? "mongo" : "sql";
}

export function matchesTargetStorageKind(
  artifactKind: StorageKind,
  targetKind: TargetStorageKind
): boolean {
  return resolveArtifactCompatibility(artifactKind, targetKind).matches;
}
