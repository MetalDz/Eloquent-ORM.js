import { dbConfig } from "../config/database";
import { resolveConnectionName } from "../core/connection/resolveConnectionName";
import { Relation } from "../core/orm/Relation";
import { HooksMixin } from "../core/orm/mixins/HooksMixin";
import { createBaseMethodResolver } from "../core/orm/mixins/utils/BaseMethodResolver";
import { registerModels } from "../core/orm/mixins/utils/modelRegistration";
import { SQLDialect } from "../core/schema/SQLDialect";

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

describe("Branch coverage 100% - phase 35 core utility edge branches", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    delete process.env.ELOQUENT_DISABLE_MODEL_HOOKS;
  });

  test("SQLDialect covers default constructor argument branch", () => {
    const dialect = new SQLDialect();
    expect(dialect.wrap("users")).toBe("`users`");
  });

  test("modelRegistration rejects non-array input", () => {
    expect(() => registerModels(null as unknown as never[])).toThrow(
      "registerModels expects an array of model constructors."
    );
  });

  test("BaseMethodResolver covers visited-set break on cyclic prototype walk", () => {
    class BaseClass {}
    const resolveBaseMethod = createBaseMethodResolver(BaseClass);

    const getProtoSpy = jest
      .spyOn(Object, "getPrototypeOf")
      .mockImplementation((value: object) => value);

    try {
      const result = resolveBaseMethod({} as never, "missing" as never);
      expect(result).toBeNull();
    } finally {
      getProtoSpy.mockRestore();
    }
  });

  test("Relation.detectRelationName covers no-stack and no-regex-match paths", () => {
    class DummyRelation extends Relation {
      async getResults(): Promise<unknown> {
        return null;
      }
      async match(): Promise<void> {
        return;
      }
      relationName(): string | undefined {
        return (this as unknown as { name?: string }).name;
      }
    }

    const originalError = global.Error;

    class NoStackError {
      get stack(): undefined {
        return undefined;
      }
    }

    class NoRegexMatchError {
      get stack(): string {
        return "Error\n    at Object.methodWithoutParen";
      }
    }

    try {
      (global as unknown as { Error: unknown }).Error = NoStackError as unknown as ErrorConstructor;
      const relNoStack = new DummyRelation(null, "foreign_id", "id");
      expect(relNoStack.relationName()).toBeUndefined();

      (global as unknown as { Error: unknown }).Error =
        NoRegexMatchError as unknown as ErrorConstructor;
      const relNoMatch = new DummyRelation(null, "foreign_id", "id");
      expect(relNoMatch.relationName()).toBeUndefined();
    } finally {
      (global as unknown as { Error: unknown }).Error = originalError;
    }
  });

  test("resolveConnectionName covers test-mode fallback loop false branch", () => {
    const connections = dbConfig.connections as Record<string, unknown>;
    const snapshot: Record<string, unknown> = { ...connections };
    const prevTest = process.env.DB_TEST_CONNECTION;
    const prevConn = process.env.DB_CONNECTION;

    try {
      for (const key of Object.keys(connections)) {
        delete connections[key];
      }
      connections.mysql = { driver: "mysql" } as unknown;
      process.env.DB_TEST_CONNECTION = "not_present";
      process.env.DB_CONNECTION = "mysql";

      expect(resolveConnectionName(undefined, { test: true })).toBe("mysql");
    } finally {
      for (const key of Object.keys(connections)) {
        delete connections[key];
      }
      for (const [key, value] of Object.entries(snapshot)) {
        connections[key] = value;
      }
      if (typeof prevTest === "undefined") delete process.env.DB_TEST_CONNECTION;
      else process.env.DB_TEST_CONNECTION = prevTest;
      if (typeof prevConn === "undefined") delete process.env.DB_CONNECTION;
      else process.env.DB_CONNECTION = prevConn;
    }
  });

  test("BetterSqliteConnection covers default params and normalizeParams branches", async () => {
    const all = jest.fn(() => []);
    const get = jest.fn(() => undefined);
    const run = jest.fn(() => ({ changes: 1, lastInsertRowid: 2 }));
    const exec = jest.fn();
    const close = jest.fn();
    const prepare = jest.fn(() => ({ all, get, run }));

    const BetterSqlite3 = jest.fn(() => ({ prepare, exec, close }));
    jest.doMock("better-sqlite3", () => BetterSqlite3);

    let BetterSqliteConnection: typeof import("../core/connection/BetterSqliteConnection").BetterSqliteConnection;
    jest.isolateModules(() => {
      ({ BetterSqliteConnection } = require("../core/connection/BetterSqliteConnection") as typeof import("../core/connection/BetterSqliteConnection"));
    });

    const conn = new BetterSqliteConnection!("phase35.sqlite");
    await conn.all("SELECT 1");
    await conn.all("SELECT 1", undefined as unknown as unknown[]);
    await conn.get("SELECT 1");
    await conn.run("INSERT INTO t VALUES (1)");
    await conn.run("INSERT INTO t VALUES (?)", 1 as unknown as unknown[]);
    await conn.exec("PRAGMA user_version=1");
    await conn.close();

    expect(prepare).toHaveBeenCalled();
    expect(run).toHaveBeenCalled();
    expect(exec).toHaveBeenCalledWith("PRAGMA user_version=1");
    expect(close).toHaveBeenCalled();
  });

  test("TypeScriptCompiler.compileWithDefaults returns true when diagnostics are empty", () => {
    const createProgram = jest.fn(() => ({}));
    const getPreEmitDiagnostics = jest.fn(() => []);
    const flattenDiagnosticMessageText = jest.fn(() => "ok");

    jest.doMock("typescript", () => ({
      __esModule: true,
      default: {
        createProgram,
        getPreEmitDiagnostics,
        flattenDiagnosticMessageText,
        ScriptTarget: { ES2020: 99 },
        ModuleKind: { CommonJS: 1 },
        ModuleResolutionKind: { NodeJs: 2 },
      },
      createProgram,
      getPreEmitDiagnostics,
      flattenDiagnosticMessageText,
      ScriptTarget: { ES2020: 99 },
      ModuleKind: { CommonJS: 1 },
      ModuleResolutionKind: { NodeJs: 2 },
    }));

    let TypeScriptCompiler!: typeof import("../cli/utils/typescript/TypeScriptCompiler").TypeScriptCompiler;
    jest.isolateModules(() => {
      ({ TypeScriptCompiler } = require("../cli/utils/typescript/TypeScriptCompiler") as typeof import("../cli/utils/typescript/TypeScriptCompiler"));
    });

    const ok = (
      TypeScriptCompiler as unknown as {
        compileWithDefaults(files: string[], noEmit: boolean): boolean;
      }
    ).compileWithDefaults([], true);
    expect(ok).toBe(true);
    expect(createProgram).toHaveBeenCalledWith([], expect.objectContaining({ noEmit: true }));
  });

  test("TypeScriptCompiler.ensureRuntime registers ts-node when .ts hook is absent", () => {
    const Module = require("module") as typeof import("module") & {
      _extensions: NodeJS.RequireExtensions;
    };
    const originalTsExt = require.extensions[".ts"];
    const originalModuleTsExt = Module._extensions[".ts"];

    const register = jest.fn();
    jest.doMock("ts-node", () => ({ register }));

    let TypeScriptCompiler!: typeof import("../cli/utils/typescript/TypeScriptCompiler").TypeScriptCompiler;
    jest.isolateModules(() => {
      ({ TypeScriptCompiler } = require("../cli/utils/typescript/TypeScriptCompiler") as typeof import("../cli/utils/typescript/TypeScriptCompiler"));
    });

    delete require.extensions[".ts"];
    delete Module._extensions[".ts"];
    (TypeScriptCompiler as unknown as { initialized: boolean }).initialized = false;
    register.mockClear();
    TypeScriptCompiler!.ensureRuntime();
    expect(register).toHaveBeenCalledTimes(1);

    if (originalTsExt) require.extensions[".ts"] = originalTsExt;
    else delete require.extensions[".ts"];
    if (originalModuleTsExt) Module._extensions[".ts"] = originalModuleTsExt;
    else delete Module._extensions[".ts"];
  });

  test("TypeScriptCompiler.ensureRuntime remains idempotent when .ts hook already exists", () => {
    const Module = require("module") as typeof import("module") & {
      _extensions: NodeJS.RequireExtensions;
    };
    const originalTsExt = require.extensions[".ts"];
    const originalModuleTsExt = Module._extensions[".ts"];
    const fakeLoader = ((module: NodeJS.Module, filename: string) => {
      void module;
      void filename;
    }) as NodeJS.RequireExtensions[string];

    require.extensions[".ts"] = fakeLoader;
    Module._extensions[".ts"] = fakeLoader;

    const register = jest.fn();
    jest.doMock("ts-node", () => ({ register }));

    let TypeScriptCompiler!: typeof import("../cli/utils/typescript/TypeScriptCompiler").TypeScriptCompiler;
    jest.isolateModules(() => {
      ({ TypeScriptCompiler } = require("../cli/utils/typescript/TypeScriptCompiler") as typeof import("../cli/utils/typescript/TypeScriptCompiler"));
    });

    (TypeScriptCompiler as unknown as { initialized: boolean }).initialized = false;
    TypeScriptCompiler!.ensureRuntime();
    TypeScriptCompiler!.ensureRuntime();

    expect(register).toHaveBeenCalledTimes(1);

    if (originalTsExt) require.extensions[".ts"] = originalTsExt;
    else delete require.extensions[".ts"];
    if (originalModuleTsExt) Module._extensions[".ts"] = originalModuleTsExt;
    else delete Module._extensions[".ts"];
  });

  test("HooksMixin fire() early-returns when hooks are disabled with env value '1'", async () => {
    class CrudBase {
      async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
        return data;
      }
      async update(): Promise<void> {
        return;
      }
      async delete(): Promise<void> {
        return;
      }
    }

    const HookableBase = HooksMixin(CrudBase as unknown as abstract new (...args: any[]) => object);
    class HookableModel extends HookableBase {}

    const creatingSpy = jest.fn();
    (HookableModel as unknown as { on: (e: string, cb: (...args: unknown[]) => void) => void }).on(
      "creating",
      creatingSpy
    );

    process.env.ELOQUENT_DISABLE_MODEL_HOOKS = "1";
    const model = new HookableModel();
    await model.create({ id: 1 });

    expect(creatingSpy).not.toHaveBeenCalled();
  });

  test("HooksMixin deprecation warning falls back to AnonymousModel name", () => {
    class CrudBase {
      async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
        return data;
      }
      async update(): Promise<void> {
        return;
      }
      async delete(): Promise<void> {
        return;
      }
    }
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    const HookableBase = HooksMixin(CrudBase as unknown as abstract new (...args: any[]) => object);
    class NamedModel extends HookableBase {}

    Object.defineProperty(NamedModel, "name", {
      value: "",
      configurable: true,
    });

    (NamedModel as unknown as { on(event: string, cb: (...args: unknown[]) => void): void }).on(
      "created",
      () => undefined
    );

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[DEPRECATION] AnonymousModel.on()")
    );
  });
});
