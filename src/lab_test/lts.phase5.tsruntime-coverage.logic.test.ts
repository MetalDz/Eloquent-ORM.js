import fs from "fs";
import os from "os";
import path from "path";

describe("LTS phase 5 tsRuntime coverage", () => {
  const rootDir = process.cwd();

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    jest.unmock("ts-node");
  });

  test("plan tracks the dedicated tsRuntime coverage slice", () => {
    const planPath = path.resolve(
      rootDir,
      "validation tasks/LTS-Phase5-tsRuntime-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 tsRuntime Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/utils/typescript/tsRuntime.ts");
    expect(content).toContain("src/lab_test/lts.phase5.tsruntime-coverage.logic.test.ts");
  });

  test("temp transpiled modules use workspace ts manual transpile, local js resolution, and fallback require", () => {
    let runtime: typeof import("../cli/utils/typescript/tsRuntime.js");
    jest.isolateModules(() => {
      runtime = require("../cli/utils/typescript/tsRuntime") as typeof import("../cli/utils/typescript/tsRuntime.js");
    });

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-lts-phase5-tsruntime-"));
    const jsDepFile = path.join(tempRoot, "dep.js");
    const mainFile = path.join(tempRoot, "main.ts");
    const workspaceFixture = path
      .resolve(rootDir, "src/lab_test/support/tsRuntimeWorkspaceFixture")
      .replace(/\\/g, "/");

    fs.writeFileSync(jsDepFile, "module.exports = { jsValue: 9 };", "utf8");
    fs.writeFileSync(
      mainFile,
      [
        `import { phase3WorkspaceHelper } from "${workspaceFixture}";`,
        'const localDep = require("./dep");',
        'const nodePath = require("path");',
        "export const loaded = phase3WorkspaceHelper() + localDep.jsValue;",
        "export const separator = nodePath.sep;",
      ].join("\n"),
      "utf8",
    );

    try {
      runtime!.clearLoadedModuleCache(mainFile);
      const first = runtime!.loadModule(mainFile) as {
        loaded: number;
        separator: string;
      };

      expect(first.loaded).toBe(21);
      expect(first.separator).toBe(path.sep);

    } finally {
      runtime!.clearLoadedModuleCache(mainFile);
      delete require.cache[path.resolve(mainFile)];
      delete require.cache[path.resolve(jsDepFile)];
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("manual transpile resolves NodeNext local .js specifiers to sibling .ts source files", () => {
    let runtime: typeof import("../cli/utils/typescript/tsRuntime.js");
    jest.isolateModules(() => {
      runtime = require("../cli/utils/typescript/tsRuntime") as typeof import("../cli/utils/typescript/tsRuntime.js");
    });

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-lts-phase5-tsruntime-nodenext-local-"));
    const depFile = path.join(tempRoot, "createPlatformUuid.ts");
    const mainFile = path.join(tempRoot, "main.ts");

    fs.writeFileSync(
      depFile,
      [
        "export function createPlatformUuid(): string {",
        '  return "uuid-from-ts-source";',
        "}",
      ].join("\n"),
      "utf8",
    );
    fs.writeFileSync(
      mainFile,
      [
        'import { createPlatformUuid } from "./createPlatformUuid.js";',
        "export const loaded = createPlatformUuid();",
      ].join("\n"),
      "utf8",
    );

    try {
      runtime!.clearLoadedModuleCache(depFile);
      runtime!.clearLoadedModuleCache(mainFile);
      expect(runtime!.loadModule(mainFile)).toEqual({ loaded: "uuid-from-ts-source" });
    } finally {
      runtime!.clearLoadedModuleCache(depFile);
      runtime!.clearLoadedModuleCache(mainFile);
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("manual transpile falls back cleanly when the package name cannot be read", () => {
    const packageJsonPath = path.resolve(rootDir, "package.json");
    const originalReadFileSync = fs.readFileSync.bind(fs);
    const readSpy = jest
      .spyOn(fs, "readFileSync")
      .mockImplementation(((filePath: fs.PathOrFileDescriptor, encoding?: unknown) => {
        if (typeof filePath === "string" && path.resolve(filePath) === packageJsonPath) {
          throw new Error("package metadata unavailable");
        }
        return originalReadFileSync(filePath, encoding as never);
      }) as typeof fs.readFileSync);

    let runtime: typeof import("../cli/utils/typescript/tsRuntime.js");
    jest.isolateModules(() => {
      runtime = require("../cli/utils/typescript/tsRuntime") as typeof import("../cli/utils/typescript/tsRuntime.js");
    });

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-lts-phase5-tsruntime-pkg-missing-"));
    const mainFile = path.join(tempRoot, "main.ts");
    fs.writeFileSync(
      mainFile,
      ['const nodePath = require("path");', "export const separator = nodePath.sep;"].join("\n"),
      "utf8",
    );

    try {
      runtime!.clearLoadedModuleCache(mainFile);
      expect(runtime!.loadModule(mainFile)).toEqual({ separator: path.sep });
    } finally {
      readSpy.mockRestore();
      runtime!.clearLoadedModuleCache(mainFile);
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("manual transpile ignores non-string package names and continues resolving normal modules", () => {
    const packageJsonPath = path.resolve(rootDir, "package.json");
    const originalReadFileSync = fs.readFileSync.bind(fs);
    const readSpy = jest
      .spyOn(fs, "readFileSync")
      .mockImplementation(((filePath: fs.PathOrFileDescriptor, encoding?: unknown) => {
        if (typeof filePath === "string" && path.resolve(filePath) === packageJsonPath) {
          return JSON.stringify({ name: 123 });
        }
        return originalReadFileSync(filePath, encoding as never);
      }) as typeof fs.readFileSync);

    let runtime: typeof import("../cli/utils/typescript/tsRuntime.js");
    jest.isolateModules(() => {
      runtime = require("../cli/utils/typescript/tsRuntime") as typeof import("../cli/utils/typescript/tsRuntime.js");
    });

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-lts-phase5-tsruntime-pkg-nonstr-"));
    const mainFile = path.join(tempRoot, "main.ts");
    fs.writeFileSync(
      mainFile,
      ['const nodePath = require("path");', "export const separator = nodePath.sep;"].join("\n"),
      "utf8",
    );

    try {
      runtime!.clearLoadedModuleCache(mainFile);
      expect(runtime!.loadModule(mainFile)).toEqual({ separator: path.sep });
    } finally {
      readSpy.mockRestore();
      runtime!.clearLoadedModuleCache(mainFile);
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("package self resolution falls back when repo source entrypoints are unavailable", () => {
    const packageName = (
      JSON.parse(fs.readFileSync(path.resolve(rootDir, "package.json"), "utf8")) as { name?: string }
    ).name ?? "@alpha.consultings/eloquent-orm.js";
    const indexPath = path.resolve(rootDir, "src", "index.ts");
    const modelPath = path.resolve(rootDir, "src", "Model.ts");
    const originalExistsSync = fs.existsSync.bind(fs);
    const existsSpy = jest
      .spyOn(fs, "existsSync")
      .mockImplementation(((candidate: fs.PathLike) => {
        const resolved = path.resolve(String(candidate));
        if (resolved === indexPath || resolved === modelPath) {
          return false;
        }
        return originalExistsSync(candidate);
      }) as typeof fs.existsSync);

    let runtime: typeof import("../cli/utils/typescript/tsRuntime.js");
    jest.isolateModules(() => {
      runtime = require("../cli/utils/typescript/tsRuntime") as typeof import("../cli/utils/typescript/tsRuntime.js");
    });

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-lts-phase5-tsruntime-self-miss-"));
    const mainFile = path.join(tempRoot, "main.ts");
    fs.writeFileSync(
      mainFile,
      [
        `export const rootError = (() => { try { require(${JSON.stringify(packageName)}); return ""; } catch (error) { return String((error as Error).message); } })();`,
        `export const modelError = (() => { try { require(${JSON.stringify(`${packageName}/Model`)}); return ""; } catch (error) { return String((error as Error).message); } })();`,
      ].join("\n"),
      "utf8",
    );

    try {
      runtime!.clearLoadedModuleCache(mainFile);
      expect(runtime!.loadModule(mainFile)).toEqual(
        expect.objectContaining({
          rootError: expect.stringContaining(packageName),
          modelError: expect.stringContaining(`${packageName}/Model`),
        }),
      );
    } finally {
      existsSpy.mockRestore();
      runtime!.clearLoadedModuleCache(mainFile);
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("workspace ts dependencies can self-import the renamed package root and model subpath", () => {
    let runtime: typeof import("../cli/utils/typescript/tsRuntime.js");
    jest.isolateModules(() => {
      runtime = require("../cli/utils/typescript/tsRuntime") as typeof import("../cli/utils/typescript/tsRuntime.js");
    });

    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve(rootDir, "package.json"), "utf8"),
    ) as { name?: string };
    const packageName = packageJson.name ?? "@alpha.consultings/eloquent-orm.js";
    const packageIndexPath = path.resolve(rootDir, "src", "index.ts");
    const packageModelPath = path.resolve(rootDir, "src", "Model.ts");
    const baseModelPath = path.resolve(rootDir, "src", "core", "model", "BaseModel.ts");
    const tempRoot = fs.mkdtempSync(
      path.join(rootDir, "src", "lab_test", "support", "tsruntime-selfref-"),
    );
    const depFile = path.join(tempRoot, "dep.ts");
    const mainFile = path.join(tempRoot, "main.ts");

    fs.writeFileSync(
      depFile,
      [
        `import { Model, Factory } from "${packageName}";`,
        `import { SqlModel, MongoModel } from "${packageName}/Model";`,
        "export const sameModel = Model === SqlModel;",
        "export const factoryCtor = typeof Factory;",
        "export const mongoCtor = typeof MongoModel;",
      ].join("\n"),
      "utf8",
    );
    fs.writeFileSync(
      mainFile,
      [
        'import { sameModel, factoryCtor, mongoCtor } from "./dep";',
        "export const loaded = { sameModel, factoryCtor, mongoCtor };",
      ].join("\n"),
      "utf8",
    );

    try {
      runtime!.clearLoadedModuleCache(packageIndexPath);
      runtime!.clearLoadedModuleCache(packageModelPath);
      runtime!.clearLoadedModuleCache(baseModelPath);
      runtime!.clearLoadedModuleCache(depFile);
      runtime!.clearLoadedModuleCache(mainFile);

      const loaded = runtime!.loadModule(mainFile) as {
        loaded: { sameModel: boolean; factoryCtor: string; mongoCtor: string };
      };

      expect(loaded.loaded).toEqual({
        sameModel: true,
        factoryCtor: "function",
        mongoCtor: "function",
      });
    } finally {
      runtime!.clearLoadedModuleCache(packageIndexPath);
      runtime!.clearLoadedModuleCache(packageModelPath);
      runtime!.clearLoadedModuleCache(baseModelPath);
      runtime!.clearLoadedModuleCache(depFile);
      runtime!.clearLoadedModuleCache(mainFile);
      delete require.cache[path.resolve(depFile)];
      delete require.cache[path.resolve(mainFile)];
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("missing local imports fall back to Node's normal module error path", () => {
    let runtime: typeof import("../cli/utils/typescript/tsRuntime.js");
    jest.isolateModules(() => {
      runtime = require("../cli/utils/typescript/tsRuntime") as typeof import("../cli/utils/typescript/tsRuntime.js");
    });

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-lts-phase5-tsruntime-missing-"));
    const mainFile = path.join(tempRoot, "main.ts");
    fs.writeFileSync(
      mainFile,
      ['const missing = require("./missing");', "export const loaded = missing;"].join("\n"),
      "utf8",
    );

    try {
      expect(() => runtime!.loadModule(mainFile)).toThrow(/Cannot find module/);
    } finally {
      delete require.cache[path.resolve(mainFile)];
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("src-path TypeScript files fall back to their compiled dist twin when ts-node is unavailable", () => {
    jest.doMock("ts-node", () => {
      throw new Error("ts-node unavailable");
    });

    let runtime: typeof import("../cli/utils/typescript/tsRuntime.js");
    jest.isolateModules(() => {
      runtime = require("../cli/utils/typescript/tsRuntime") as typeof import("../cli/utils/typescript/tsRuntime.js");
    });

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-lts-phase5-tsruntime-dist-"));
    const srcDir = path.join(tempRoot, "src", "runtime");
    const distDir = path.join(tempRoot, "dist", "runtime");
    const tsFile = path.join(srcDir, "fixture.ts");
    const jsFile = path.join(distDir, "fixture.js");

    fs.mkdirSync(srcDir, { recursive: true });
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(tsFile, "export const loaded = 'src';\n", "utf8");
    fs.writeFileSync(jsFile, "module.exports = { loaded: 'dist' };\n", "utf8");

    try {
      expect(runtime!.loadModule(tsFile)).toEqual({ loaded: "dist" });
    } finally {
      delete require.cache[path.resolve(jsFile)];
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("cached transpiled exports are returned before re-reading the TypeScript file", () => {
    jest.doMock("ts-node", () => {
      throw new Error("ts-node unavailable");
    });

    let runtime: typeof import("../cli/utils/typescript/tsRuntime.js");
    jest.isolateModules(() => {
      runtime = require("../cli/utils/typescript/tsRuntime") as typeof import("../cli/utils/typescript/tsRuntime.js");
    });

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-lts-phase5-tsruntime-cache-"));
    const mainFile = path.join(tempRoot, "cached.ts");

    fs.writeFileSync(mainFile, "export const loaded = 1;\n", "utf8");

    try {
      expect(runtime!.loadModule(mainFile)).toEqual({ loaded: 1 });

      fs.writeFileSync(mainFile, "export const loaded = 77;\n", "utf8");

      expect(runtime!.loadModule(mainFile)).toEqual({ loaded: 1 });
    } finally {
      delete require.cache[path.resolve(mainFile)];
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("cached transpiled exports can be explicitly cleared before reloading the TypeScript file", () => {
    let runtime: typeof import("../cli/utils/typescript/tsRuntime.js");
    jest.isolateModules(() => {
      runtime = require("../cli/utils/typescript/tsRuntime") as typeof import("../cli/utils/typescript/tsRuntime.js");
    });

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-lts-phase5-tsruntime-clear-"));
    const mainFile = path.join(tempRoot, "cached.ts");

    fs.writeFileSync(mainFile, "export const loaded = 1;\n", "utf8");

    try {
      expect(runtime!.loadModule(mainFile)).toEqual({ loaded: 1 });

      fs.writeFileSync(mainFile, "export const loaded = 77;\n", "utf8");
      runtime!.clearLoadedModuleCache(mainFile);

      expect(runtime!.loadModule(mainFile)).toEqual({ loaded: 77 });
    } finally {
      runtime!.clearLoadedModuleCache(mainFile);
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("runtime-available ts loads prefer direct require so Jest mocks stay visible", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-lts-phase5-tsruntime-mock-"));
    const depFile = path.join(tempRoot, "dep.ts");
    const mainFile = path.join(tempRoot, "main.ts");

    fs.writeFileSync(depFile, "export const loaded = 'real';\n", "utf8");
    fs.writeFileSync(
      mainFile,
      ['import { loaded } from "./dep";', "export const value = loaded;"].join("\n"),
      "utf8",
    );

    jest.doMock(depFile, () => ({
      __esModule: true,
      loaded: "mocked",
    }));

    let runtime: typeof import("../cli/utils/typescript/tsRuntime.js");
    jest.isolateModules(() => {
      runtime = require("../cli/utils/typescript/tsRuntime") as typeof import("../cli/utils/typescript/tsRuntime.js");
    });

    try {
      expect(runtime!.loadModule(mainFile)).toEqual({ value: "mocked" });
    } finally {
      runtime!.clearLoadedModuleCache(depFile);
      runtime!.clearLoadedModuleCache(mainFile);
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("manual transpile resolves local TypeScript imports even when not running under Jest", () => {
    const previousWorkerId = process.env.JEST_WORKER_ID;
    delete process.env.JEST_WORKER_ID;

    jest.doMock("ts-node", () => {
      throw new Error("ts-node unavailable");
    });

    let runtime: typeof import("../cli/utils/typescript/tsRuntime.js");
    jest.isolateModules(() => {
      runtime = require("../cli/utils/typescript/tsRuntime") as typeof import("../cli/utils/typescript/tsRuntime.js");
    });

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-lts-phase5-tsruntime-no-jest-"));
    const depFile = path.join(tempRoot, "dep.ts");
    const mainFile = path.join(tempRoot, "main.ts");

    fs.writeFileSync(depFile, "export const value = 41;\n", "utf8");
    fs.writeFileSync(
      mainFile,
      ['import { value } from "./dep";', "export const loaded = value + 1;"].join("\n"),
      "utf8",
    );

    try {
      expect(runtime!.loadModule(mainFile)).toEqual({ loaded: 42 });
    } finally {
      if (previousWorkerId === undefined) delete process.env.JEST_WORKER_ID;
      else process.env.JEST_WORKER_ID = previousWorkerId;
      runtime!.clearLoadedModuleCache(depFile);
      runtime!.clearLoadedModuleCache(mainFile);
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("non-TypeScript modules are required directly", () => {
    let runtime: typeof import("../cli/utils/typescript/tsRuntime.js");
    jest.isolateModules(() => {
      runtime = require("../cli/utils/typescript/tsRuntime") as typeof import("../cli/utils/typescript/tsRuntime.js");
    });

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-lts-phase5-tsruntime-js-"));
    const jsFile = path.join(tempRoot, "fixture.js");
    fs.writeFileSync(jsFile, "module.exports = { loaded: 'js' };\n", "utf8");

    try {
      expect(runtime!.loadModule(jsFile)).toEqual({ loaded: "js" });
    } finally {
      delete require.cache[path.resolve(jsFile)];
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
