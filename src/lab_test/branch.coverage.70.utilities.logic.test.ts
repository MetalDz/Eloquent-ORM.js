import fs from "fs";
import os from "os";
import path from "path";
import { TemplateEngine } from "../cli/utils/TemplateEngine";
import { PathMap } from "../cli/utils/PathMap";

jest.mock("chalk", () => ({
  __esModule: true,
  default: {
    red: (value: string) => value,
    redBright: (value: string) => value,
    gray: (value: string) => value,
    greenBright: (value: string) => value,
    yellow: (value: string) => value,
  },
}));

describe("Branch coverage 70% - Phase 1 utilities", () => {
  const originalCwd = process.cwd();
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    process.chdir(originalCwd);
    process.env.NODE_ENV = originalNodeEnv;
  });

  test("TemplateEngine.render handles loops, conditionals, literals, and missing keys", () => {
    const tpl = [
      "{{#each users}}u={{name}}|{{/each}}",
      "{{#each tags}}t={{this}}|{{/each}}",
      "{{#if (eq role \"admin\")}}A{{else}}B{{/if}}",
      "{{#if (neq active false)}}ON{{else}}OFF{{/if}}",
      "{{#if (exists profile.name)}}P{{else}}NP{{/if}}",
      "name={{profile.name}}",
      "missing={{unknown}}",
    ].join("\n");

    const rendered = TemplateEngine.render(tpl, {
      users: [{ name: "u1" }, { name: "u2" }],
      tags: ["x", "y"],
      role: "admin",
      active: true,
      profile: { name: "neo" },
    });

    expect(rendered).toContain("u=u1|");
    expect(rendered).toContain("u=u2|");
    expect(rendered).toContain("t=x|");
    expect(rendered).toContain("t=y|");
    expect(rendered).toContain("A");
    expect(rendered).toContain("ON");
    expect(rendered).toContain("P");
    expect(rendered).toContain("name=neo");
    expect(rendered).toContain("missing=");
  });

  test("TemplateEngine.load throws when template is missing", () => {
    jest.spyOn(PathMap, "template").mockReturnValue(path.join(os.tmpdir(), "missing.tpl"));
    expect(() => TemplateEngine.load("missing")).toThrow("Template missing: missing.tpl");
  });

  test("TemplateEngine.save creates directory and appends final newline", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "tpl-save-"));
    const outputPath = path.join(root, "nested", "file.txt");
    TemplateEngine.save(outputPath, "abc");
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.readFileSync(outputPath, "utf8")).toBe("abc\n");
  });

  test("PathMap resolves migrations and sanitizes connection names", () => {
    const appPath = PathMap.migrations(false, "pg:test");
    const testPath = PathMap.migrations(true, "sqlite/test");
    expect(appPath).toContain(`${path.sep}migrations${path.sep}pg_test`);
    expect(testPath).toContain(`${path.sep}migrations${path.sep}sqlite_test`);
  });

  test("PathMap.template covers both project-template branch outcomes", () => {
    const existsSpy = jest.spyOn(fs, "existsSync");

    existsSpy.mockReturnValueOnce(true);
    const projectTemplate = PathMap.template("seed");
    expect(projectTemplate.endsWith(`${path.sep}seed.tpl`)).toBe(true);

    existsSpy.mockReturnValueOnce(false);
    const packageTemplate = PathMap.template("seed");
    expect(packageTemplate.endsWith(`${path.sep}seed.tpl`)).toBe(true);
  });

  test("ImportResolver returns package import path outside repo and relative paths in repo", () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "import-resolver-"));
    process.chdir(outside);
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ImportResolver: OutsideResolver } = require("../cli/utils/ImportResolver") as {
      ImportResolver: { coreImportPath(isTest: boolean): string; schemaImportPath(isTest: boolean): string };
    };
    expect(OutsideResolver.coreImportPath(true)).toBe("eloquentjs");
    expect(OutsideResolver.schemaImportPath(false)).toBe("eloquentjs");

    process.chdir(originalCwd);
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ImportResolver: InsideResolver } = require("../cli/utils/ImportResolver") as {
      ImportResolver: { coreImportPath(isTest: boolean): string; schemaImportPath(isTest: boolean): string };
    };
    expect(InsideResolver.coreImportPath(true)).toBe("../../../core/model/BaseModel");
    expect(InsideResolver.coreImportPath(false)).toBe("../../core/model/BaseModel");
    expect(InsideResolver.schemaImportPath(true)).toBe("../../../core/schema/SchemaBlueprint");
    expect(InsideResolver.schemaImportPath(false)).toBe("../../core/schema/SchemaBlueprint");
  });

  test("TypeScriptCompiler.compile falls back to defaults when tsconfig is missing", () => {
    jest.resetModules();
    jest.doMock("typescript", () => ({
      findConfigFile: jest.fn(() => undefined),
      sys: { fileExists: jest.fn(), readFile: jest.fn() },
      readConfigFile: jest.fn(),
      parseJsonConfigFileContent: jest.fn(),
      createProgram: jest.fn(),
      getPreEmitDiagnostics: jest.fn(() => []),
      flattenDiagnosticMessageText: jest.fn((m: unknown) => String(m)),
      ScriptTarget: { ES2020: 7 },
      ModuleKind: { CommonJS: 1 },
      ModuleResolutionKind: { NodeJs: 2 },
    }));
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { TypeScriptCompiler: Compiler } = require("../cli/utils/typescript/TypeScriptCompiler") as {
      TypeScriptCompiler: {
        initialized: boolean;
        compile(files?: string[], noEmit?: boolean): boolean;
        compileWithDefaults(files: string[], noEmit: boolean): boolean;
      };
    };
    Compiler.initialized = true;
    const fallbackSpy = jest.spyOn(Compiler, "compileWithDefaults").mockReturnValue(true);

    const ok = Compiler.compile(["a.ts"], true);
    expect(ok).toBe(true);
    expect(fallbackSpy).toHaveBeenCalledWith(["a.ts"], true);
  });

  test("TypeScriptCompiler.compile returns false when diagnostics are present", () => {
    jest.resetModules();
    jest.doMock("typescript", () => ({
      findConfigFile: jest.fn(() => "tsconfig.json"),
      sys: { fileExists: jest.fn(), readFile: jest.fn() },
      readConfigFile: jest.fn(() => ({ config: {}, error: undefined })),
      parseJsonConfigFileContent: jest.fn(() => ({ options: {}, fileNames: ["a.ts"], errors: [] })),
      createProgram: jest.fn(() => ({})),
      getPreEmitDiagnostics: jest.fn(() => [{ messageText: "broken" }]),
      flattenDiagnosticMessageText: jest.fn((m: unknown) => String(m)),
      ScriptTarget: { ES2020: 7 },
      ModuleKind: { CommonJS: 1 },
      ModuleResolutionKind: { NodeJs: 2 },
    }));
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { TypeScriptCompiler: Compiler } = require("../cli/utils/typescript/TypeScriptCompiler") as {
      TypeScriptCompiler: { initialized: boolean; compile(files?: string[], noEmit?: boolean): boolean };
    };
    Compiler.initialized = true;
    expect(Compiler.compile(["a.ts"], true)).toBe(false);
  });

  test("TypeScriptCompiler.compile returns true when diagnostics are empty", () => {
    jest.resetModules();
    jest.doMock("typescript", () => ({
      findConfigFile: jest.fn(() => "tsconfig.json"),
      sys: { fileExists: jest.fn(), readFile: jest.fn() },
      readConfigFile: jest.fn(() => ({ config: {}, error: undefined })),
      parseJsonConfigFileContent: jest.fn(() => ({ options: {}, fileNames: ["a.ts"], errors: [] })),
      createProgram: jest.fn(() => ({})),
      getPreEmitDiagnostics: jest.fn(() => []),
      flattenDiagnosticMessageText: jest.fn((m: unknown) => String(m)),
      ScriptTarget: { ES2020: 7 },
      ModuleKind: { CommonJS: 1 },
      ModuleResolutionKind: { NodeJs: 2 },
    }));
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { TypeScriptCompiler: Compiler } = require("../cli/utils/typescript/TypeScriptCompiler") as {
      TypeScriptCompiler: { initialized: boolean; compile(files?: string[], noEmit?: boolean): boolean };
    };
    Compiler.initialized = true;
    expect(Compiler.compile(["a.ts"], true)).toBe(true);
  });

  test("tsRuntime: non-ts modules are loaded directly", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-js-"));
    const jsFile = path.join(root, "mod.js");
    fs.writeFileSync(jsFile, "module.exports = { v: 1 };", "utf8");

    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const runtime = require("../cli/utils/typescript/tsRuntime") as {
      loadModule(filePath: string): Record<string, unknown>;
    };
    expect(runtime.loadModule(jsFile)).toEqual({ v: 1 });
  });

  test("tsRuntime: ts fallback to dist works when ts-node is unavailable", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-dist-"));
    const srcDir = path.join(root, "src", "pkg");
    const distDir = path.join(root, "dist", "pkg");
    fs.mkdirSync(srcDir, { recursive: true });
    fs.mkdirSync(distDir, { recursive: true });
    const tsFile = path.join(srcDir, "example.ts");
    const jsFile = path.join(distDir, "example.js");
    fs.writeFileSync(tsFile, "export const x = 1;", "utf8");
    fs.writeFileSync(jsFile, "module.exports = { x: 2 };", "utf8");

    jest.resetModules();
    jest.doMock("ts-node", () => ({
      register: () => {
        throw new Error("unavailable");
      },
    }));
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const runtime = require("../cli/utils/typescript/tsRuntime") as {
      loadModule(filePath: string): Record<string, unknown>;
    };
    expect(runtime.loadModule(tsFile)).toEqual({ x: 2 });
  });

  test("tsRuntime: ts load throws when ts-node is unavailable and dist fallback is missing", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-throw-"));
    const tsFile = path.join(root, "src", "missing.ts");
    fs.mkdirSync(path.dirname(tsFile), { recursive: true });
    fs.writeFileSync(tsFile, "export const x = 1;", "utf8");

    jest.resetModules();
    jest.doMock("ts-node", () => ({
      register: () => {
        throw new Error("unavailable");
      },
    }));
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const runtime = require("../cli/utils/typescript/tsRuntime") as {
      loadModule(filePath: string): Record<string, unknown>;
    };
    expect(() => runtime.loadModule(tsFile)).toThrow(
      "ts-node is required to load .ts files. Install it or run compiled JS."
    );
  });
});
