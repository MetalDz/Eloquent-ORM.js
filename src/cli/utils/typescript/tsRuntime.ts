import { TypeScriptCompiler } from "./TypeScriptCompiler";

let registered = false;

/**
 * Ensure ts-node runtime is registered so Node can load .ts files.
 */
export function ensureTsRuntime(): void {
  if (registered) return;
  TypeScriptCompiler.ensureRuntime();
  registered = true;
}

/**
 * Load a module from file path, supporting .ts via ts-node.
 */
export function loadModule(filePath: string): Record<string, unknown> {
  if (filePath.endsWith(".ts")) ensureTsRuntime();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(filePath) as Record<string, unknown>;
}
