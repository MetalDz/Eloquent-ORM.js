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

  test("temp transpiled modules use workspace ts direct-require, local js resolution, and fallback require", () => {
    let runtime: typeof import("../cli/utils/typescript/tsRuntime");
    jest.isolateModules(() => {
      runtime = require("../cli/utils/typescript/tsRuntime") as typeof import("../cli/utils/typescript/tsRuntime");
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
      const first = runtime!.loadModule(mainFile) as {
        loaded: number;
        separator: string;
      };

      expect(first.loaded).toBe(21);
      expect(first.separator).toBe(path.sep);

    } finally {
      delete require.cache[path.resolve(mainFile)];
      delete require.cache[path.resolve(jsDepFile)];
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("missing local imports fall back to Node's normal module error path", () => {
    let runtime: typeof import("../cli/utils/typescript/tsRuntime");
    jest.isolateModules(() => {
      runtime = require("../cli/utils/typescript/tsRuntime") as typeof import("../cli/utils/typescript/tsRuntime");
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

    let runtime: typeof import("../cli/utils/typescript/tsRuntime");
    jest.isolateModules(() => {
      runtime = require("../cli/utils/typescript/tsRuntime") as typeof import("../cli/utils/typescript/tsRuntime");
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
    let runtime: typeof import("../cli/utils/typescript/tsRuntime");
    jest.isolateModules(() => {
      runtime = require("../cli/utils/typescript/tsRuntime") as typeof import("../cli/utils/typescript/tsRuntime");
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

  test("non-TypeScript modules are required directly", () => {
    let runtime: typeof import("../cli/utils/typescript/tsRuntime");
    jest.isolateModules(() => {
      runtime = require("../cli/utils/typescript/tsRuntime") as typeof import("../cli/utils/typescript/tsRuntime");
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
