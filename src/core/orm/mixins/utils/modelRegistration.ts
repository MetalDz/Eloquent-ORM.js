import { ModelRegistry, type ModelConstructor } from "./ModelRegistry.js";

export type RegisterModelsOptions = {
  strict?: boolean;
};

export function registerModels(
  modelCtors: ModelConstructor[],
  options: RegisterModelsOptions = {}
): void {
  if (!Array.isArray(modelCtors)) {
    throw new Error("registerModels expects an array of model constructors.");
  }

  ModelRegistry.grantMany(modelCtors);

  if (options.strict !== false) {
    ModelRegistry.setStrictMode(true);
  }
}

export function isModelRegistered(modelCtor: ModelConstructor): boolean {
  return ModelRegistry.isGranted(modelCtor);
}

export function setModelRegistryStrictMode(enabled: boolean): void {
  ModelRegistry.setStrictMode(enabled);
}

export function isModelRegistryStrictMode(): boolean {
  return ModelRegistry.isStrictMode();
}
