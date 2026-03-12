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

function isInsideWorkspace(filePath: string): boolean {
  const workspaceRoot = path.resolve(process.cwd());
  const absolutePath = path.resolve(filePath);
  return absolutePath === workspaceRoot || absolutePath.startsWith(`${workspaceRoot}${path.sep}`);
}

function resolveExistingModulePath(basePath: string): string | null {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.js`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.js"),
  ];

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

let registered = false;

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
        downlevelIteration: true,
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

function loadTranspiledTsModule(filePath: string): Record<string, unknown> {
  const absolutePath = path.resolve(filePath);
  const cached = require.cache[absolutePath];
  if (cached) {
    return cached.exports as Record<string, unknown>;
  }

  const source = fs.readFileSync(absolutePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      downlevelIteration: true,
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
    const resolved = resolveLocalRequest(request, absolutePath);
    if (resolved) {
      if (resolved.endsWith(".ts")) {
        if (isInsideWorkspace(resolved)) {
          return requireFromFile(resolved);
        }
        return loadTranspiledTsModule(resolved);
      }
      return requireFromFile(resolved);
    }
    return fallbackRequire(request);
  }) as Module["require"];
  require.cache[absolutePath] = loadedModule;
  loadedModule._compile(output.outputText, absolutePath);
  return loadedModule.exports as Record<string, unknown>;
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
        return requireFromFile(distPath);
      }
      throw new Error(
        "ts-node is required to load .ts files. Install it or run compiled JS."
      );
    }
    return loadTranspiledTsModule(filePath);
  }
  return requireFromFile(filePath);
}
