import fs from "fs";
import path from "path";

let registered = false;

/**
 * Ensure ts-node runtime is registered so Node can load .ts files.
 * Returns true if runtime is available.
 */
export function ensureTsRuntime(): boolean {
  if (registered) return true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("ts-node/register/transpile-only");
    registered = true;
    return true;
  } catch {
    return false;
  }
}

function resolveDistPath(filePath: string): string | null {
  const normalized = path.normalize(filePath);
  const marker = `${path.sep}src${path.sep}`;
  if (!normalized.includes(marker)) return null;
  const distPath = normalized
    .replace(marker, `${path.sep}dist${path.sep}`)
    .replace(/\.ts$/, ".js");
  return fs.existsSync(distPath) ? distPath : null;
}

/**
 * Load a module from file path, supporting .ts via ts-node.
 * If ts-node is unavailable, fall back to compiled dist path when possible.
 */
export function loadModule(filePath: string): Record<string, unknown> {
  if (filePath.endsWith(".ts")) {
    const ok = ensureTsRuntime();
    if (!ok) {
      const distPath = resolveDistPath(filePath);
      if (distPath) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require(distPath) as Record<string, unknown>;
      }
      throw new Error(
        "ts-node is required to load .ts files. Install it or run compiled JS."
      );
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(filePath) as Record<string, unknown>;
}
