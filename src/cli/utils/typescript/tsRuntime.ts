import fs from "fs";
import Module from "module";
import path from "path";
import ts from "typescript";

type InternalModuleCtor = typeof Module & {
  _nodeModulePaths(from: string): string[];
};

type InternalModuleInstance = Module & {
  _compile(code: string, filename: string): void;
};

const PACKAGE_ROOT = path.resolve(__dirname, "..", "..", "..", "..");

const PACKAGE_NAME = (() => {
  try {
    const packageJsonPath = path.join(PACKAGE_ROOT, "package.json");
    const raw = fs.readFileSync(packageJsonPath, "utf8");
    const pkg = JSON.parse(raw) as { name?: string };
    return typeof pkg.name === "string" ? pkg.name.trim() : "";
  } catch {
    return "";
  }
})();

const PACKAGE_SOURCE_ROOT = path.join(PACKAGE_ROOT, "src") + path.sep;
const PACKAGE_BIN_ROOT = path.join(PACKAGE_ROOT, "bin") + path.sep;

function isPackageSourceTreeFile(filePath: string): boolean {
  const normalized = path.resolve(filePath);
  return (
    normalized.startsWith(PACKAGE_SOURCE_ROOT) ||
    normalized.startsWith(PACKAGE_BIN_ROOT)
  );
}

function isTypeScriptSourceFile(filePath: string): boolean {
  return /\.(?:[cm]?ts|tsx)$/i.test(filePath);
}

function runningInsideJest(): boolean {
  return typeof process.env.JEST_WORKER_ID === "string";
}

function resolveExistingModulePath(basePath: string): string | null {
  const extension = path.extname(basePath).toLowerCase();
  const withoutExtension =
    extension.length > 0 ? basePath.slice(0, -extension.length) : basePath;
  const candidates: string[] = [];
  const seen = new Set<string>();

  const addCandidate = (candidate: string): void => {
    /* istanbul ignore next -- defensive guard; current candidate generation is unique */
    if (seen.has(candidate)) {
      return;
    }
    seen.add(candidate);
    candidates.push(candidate);
  };

  if (extension === ".js" || extension === ".mjs" || extension === ".cjs") {
    // NodeNext TypeScript source commonly imports local modules using `.js`
    // specifiers even though the source file on disk is `.ts`.
    addCandidate(`${withoutExtension}.ts`);
    addCandidate(`${withoutExtension}.tsx`);
    addCandidate(`${withoutExtension}.mts`);
    addCandidate(`${withoutExtension}.cts`);
  }

  addCandidate(basePath);

  if (!extension) {
    addCandidate(`${basePath}.ts`);
    addCandidate(`${basePath}.tsx`);
    addCandidate(`${basePath}.mts`);
    addCandidate(`${basePath}.cts`);
    addCandidate(`${basePath}.js`);
    addCandidate(`${basePath}.mjs`);
    addCandidate(`${basePath}.cjs`);
    addCandidate(path.join(basePath, "index.ts"));
    addCandidate(path.join(basePath, "index.tsx"));
    addCandidate(path.join(basePath, "index.mts"));
    addCandidate(path.join(basePath, "index.cts"));
    addCandidate(path.join(basePath, "index.js"));
    addCandidate(path.join(basePath, "index.mjs"));
    addCandidate(path.join(basePath, "index.cjs"));
  }

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function resolveLocalRequest(request: string, fromFilePath: string): string | null {
  if (!request.startsWith(".") && !path.isAbsolute(request)) {
    return null;
  }

  const candidateBase = path.isAbsolute(request)
    ? request
    : path.resolve(path.dirname(fromFilePath), request);

  return resolveExistingModulePath(candidateBase);
}

function resolvePackageSelfRequest(request: string): string | null {
  if (!PACKAGE_NAME) {
    return null;
  }

  if (request === PACKAGE_NAME) {
    const entryPath = path.join(PACKAGE_ROOT, "src", "index.ts");
    return fs.existsSync(entryPath) ? entryPath : null;
  }

  if (request === `${PACKAGE_NAME}/Model`) {
    const modelPath = path.join(PACKAGE_ROOT, "src", "Model.ts");
    return fs.existsSync(modelPath) ? modelPath : null;
  }

  return null;
}

let registered = false;
const transpiledModuleCache = new Map<string, Record<string, unknown>>();
const forceTranspileReloadPaths = new Set<string>();

export function clearLoadedModuleCache(filePath: string): void {
  const absolutePath = path.resolve(filePath);
  transpiledModuleCache.delete(absolutePath);
  forceTranspileReloadPaths.add(absolutePath);
  delete require.cache[absolutePath];

  try {
    delete require.cache[require.resolve(absolutePath)];
  } catch {
    // ignore cache misses for files that were not required yet
  }
}

/**
 * Ensure ts-node runtime is registered so Node can load .ts files.
 * Returns true if runtime is available.
 */
export function ensureTsRuntime(): boolean {
  if (registered) return true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("ts-node").register({
      transpileOnly: true,
      compilerOptions: {
        module: "commonjs",
        target: "es2020",
        moduleResolution: "node",
        skipLibCheck: true,
      },
    });
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

function requireFromFile(filePath: string): Record<string, unknown> {
  const absolutePath = path.resolve(filePath);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(absolutePath) as Record<string, unknown>;
}

function loadTypeScriptModule(
  filePath: string,
  runtimeAvailable = ensureTsRuntime()
): Record<string, unknown> {
  const absolutePath = path.resolve(filePath);
  const forceTranspileReload = forceTranspileReloadPaths.delete(absolutePath);
  const preferManualTranspile = isPackageSourceTreeFile(absolutePath);

  if (runtimeAvailable && !forceTranspileReload && !preferManualTranspile) {
    try {
      return requireFromFile(filePath);
    } catch {
      clearLoadedModuleCache(filePath);
      // Fall back to manual transpilation when direct ts-node loading cannot
      // resolve repo-local self imports or temp workspace dependencies.
    }
  }

  if (!runtimeAvailable) {
    const distPath = resolveDistPath(filePath);
    if (distPath) {
      return requireFromFile(distPath);
    }
  }

  return loadTranspiledTsModule(filePath, runtimeAvailable);
}

function loadTranspiledTsModule(
  filePath: string,
  runtimeAvailable: boolean
): Record<string, unknown> {
  const absolutePath = path.resolve(filePath);
  forceTranspileReloadPaths.delete(absolutePath);
  const cached = transpiledModuleCache.get(absolutePath);
  if (cached) {
    return cached;
  }

  const source = fs.readFileSync(absolutePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      skipLibCheck: true,
      esModuleInterop: true,
    },
    fileName: absolutePath,
  });

  const moduleCtor = Module as InternalModuleCtor;
  const loadedModule = new Module(absolutePath, module) as InternalModuleInstance;
  loadedModule.filename = absolutePath;
  loadedModule.paths = moduleCtor._nodeModulePaths(path.dirname(absolutePath));
  const fallbackRequire = loadedModule.require.bind(loadedModule);
  loadedModule.require = ((request: string) => {
    const packageSelfResolved = resolvePackageSelfRequest(request);
    if (packageSelfResolved) {
      return loadTypeScriptModule(packageSelfResolved, runtimeAvailable);
    }

    const resolved = resolveLocalRequest(request, absolutePath);
    if (resolved) {
      if (isTypeScriptSourceFile(resolved)) {
        if (runningInsideJest()) {
          try {
            return fallbackRequire(request);
          } catch {
            // Keep the manual transpile fallback for NodeNext-style local source
            // imports that Jest/ts-node cannot resolve directly.
          }
        }
        return loadTypeScriptModule(resolved, runtimeAvailable);
      }
      return requireFromFile(resolved);
    }
    return fallbackRequire(request);
  }) as Module["require"];
  require.cache[absolutePath] = loadedModule;
  loadedModule._compile(output.outputText, absolutePath);
  const exportsObject = loadedModule.exports as Record<string, unknown>;
  transpiledModuleCache.set(absolutePath, exportsObject);
  return exportsObject;
}

/**
 * Load a module from file path, supporting .ts via ts-node.
 * If ts-node is unavailable, fall back to compiled dist path when possible.
 */
export function loadModule(filePath: string): Record<string, unknown> {
  if (filePath.endsWith(".ts")) {
    return loadTypeScriptModule(filePath);
  }
  return requireFromFile(filePath);
}
