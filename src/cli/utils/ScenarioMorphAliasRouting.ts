import fs from "fs";
import path from "path";
import { PathMap } from "./PathMap";
import {
  matchesTargetStorageKind,
  resolveModelStorageKind,
  targetStorageKindForConnection,
} from "./ArtifactStorage";
import { loadModule } from "./typescript/tsRuntime";

function resolveExistingModelPath(modelsDir: string, modelName: string): string | null {
  const basePath = path.join(modelsDir, modelName);
  for (const ext of [".ts", ".js"]) {
    const candidate = `${basePath}${ext}`;
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function resolveTargetedMorphAlias(options: {
  isTest: boolean;
  connectionName: string;
  modelName: string;
  fallback: string;
}): string {
  const targetKind = targetStorageKindForConnection(options.connectionName);
  const modelKind = resolveModelStorageKind(options.modelName, options.isTest);

  if (modelKind !== "unknown" && !matchesTargetStorageKind(modelKind, targetKind)) {
    return options.fallback;
  }

  const modelsDir = PathMap.models(options.isTest);
  const modelPath = resolveExistingModelPath(modelsDir, options.modelName);
  if (!modelPath) {
    return options.fallback;
  }

  try {
    const mod = loadModule(modelPath);
    const modelCtor = mod[options.modelName] as { getMorphClass?: () => string } | undefined;
    if (modelCtor && typeof modelCtor.getMorphClass === "function") {
      return String(modelCtor.getMorphClass());
    }
  } catch {
    // keep fallback alias when app/test models are not loadable
  }

  return options.fallback;
}

export function resolveScenarioMorphAliases(options: {
  isTest: boolean;
  connectionName: string;
}): {
  userMorph: string;
  postMorph: string;
} {
  return {
    userMorph: resolveTargetedMorphAlias({
      isTest: options.isTest,
      connectionName: options.connectionName,
      modelName: "User",
      fallback: "users",
    }),
    postMorph: resolveTargetedMorphAlias({
      isTest: options.isTest,
      connectionName: options.connectionName,
      modelName: "Post",
      fallback: "posts",
    }),
  };
}
