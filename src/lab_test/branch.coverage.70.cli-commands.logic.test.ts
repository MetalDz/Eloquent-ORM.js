import fs from "fs";
import os from "os";
import path from "path";
import readline from "readline";
import { cacheClear } from "../cli/commands/cacheClear.js";
import { cacheStats } from "../cli/commands/cacheStats.js";
import { dbSeed } from "../cli/commands/dbSeed.js";
import { makeMigration } from "../cli/commands/makeMigration.js";
import { makeModel } from "../cli/commands/makeModel.js";
import { migrateFresh } from "../cli/commands/migrateFresh.js";
import { PathMap } from "../cli/utils/PathMap.js";
import { loadModule } from "../cli/utils/typescript/tsRuntime.js";
import { TypeScriptCompiler } from "../cli/utils/typescript/TypeScriptCompiler.js";
import { dbConfig } from "../config/database.js";
import { CacheAnalytics } from "../core/cache/CacheAnalytics.js";
import { CacheFallbackManager } from "../core/cache/CacheFallbackManager.js";
import { CacheManager } from "../core/cache/CacheManager.js";
import { CacheRegistry } from "../core/cache/CacheRegistry.js";
import { SchemaBuilder } from "../core/schema/SchemaBuilder.js";
import * as setupCacheModule from "../core/cache/setupCache.js";
import { resolveConnectionName } from "../core/connection/resolveConnectionName.js";
import { appendAuditEvent } from "../cli/utils/AuditTrail.js";
import { closeAllConnections, getAdapter } from "../core/connection/ConnectionFactory.js";
import { migrateRun } from "../cli/commands/migrateRun.js";
import { column, relation, type SchemaField } from "../core/schema/SchemaBlueprint.js";

jest.mock("chalk", () => ({
  __esModule: true,
  default: {
    blue: (value: string) => value,
    blueBright: (value: string) => value,
    green: (value: string) => value,
    greenBright: (value: string) => value,
    yellow: (value: string) => value,
    red: (value: string) => value,
    redBright: (value: string) => value,
    cyan: (value: string) => value,
    cyanBright: (value: string) => value,
    gray: (value: string) => value,
  },
}));

jest.mock("../cli/utils/typescript/TypeScriptCompiler", () => ({
  TypeScriptCompiler: {
    compile: jest.fn(),
  },
}));

jest.mock("../cli/utils/typescript/tsRuntime", () => ({
  loadModule: jest.fn(),
}));

jest.mock("../core/connection/resolveConnectionName", () => ({
  resolveConnectionName: jest.fn(),
}));

jest.mock("../core/connection/ConnectionFactory", () => ({
  getAdapter: jest.fn(),
  closeAllConnections: jest.fn(),
}));

jest.mock("../cli/commands/migrateRun", () => ({
  migrateRun: jest.fn(),
}));

jest.mock("../cli/commands/makeMigration", () => {
  const actual = jest.requireActual("../cli/commands/makeMigration");
  return {
    ...actual,
    makeMigration: jest.fn(actual.makeMigration),
  };
});

jest.mock("../cli/utils/AuditTrail", () => ({
  appendAuditEvent: jest.fn(),
}));

const mockedCompile = TypeScriptCompiler.compile as jest.MockedFunction<
  typeof TypeScriptCompiler.compile
>;
const mockedLoadModule = loadModule as jest.MockedFunction<typeof loadModule>;
const mockedResolveConnectionName =
  resolveConnectionName as jest.MockedFunction<typeof resolveConnectionName>;
const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;
const mockedCloseAllConnections =
  closeAllConnections as jest.MockedFunction<typeof closeAllConnections>;
const mockedMigrateRun = migrateRun as jest.MockedFunction<typeof migrateRun>;
const mockedMakeMigration = makeMigration as jest.MockedFunction<typeof makeMigration>;
const mockedAppendAuditEvent =
  appendAuditEvent as jest.MockedFunction<typeof appendAuditEvent>;

describe("Branch coverage 70% - Phase 3 CLI commands", () => {
  let tempRoot: string;
  let modelsDir: string;
  let testMigrationsRoot: string;
  let appMigrationsRoot: string;
  let seedsDir: string;
  let originalDbConnection: string | undefined;
  let originalDbTestConnection: string | undefined;
  let originalHooksDisabled: string | undefined;
  let originalExitCode: typeof process.exitCode;
  let originalConnectionDrivers: Record<string, string | undefined>;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-phase3-cli-"));
    modelsDir = path.join(tempRoot, "models");
    testMigrationsRoot = path.join(tempRoot, "migrations-test");
    appMigrationsRoot = path.join(tempRoot, "migrations-app");
    seedsDir = path.join(tempRoot, "seeds");
    fs.mkdirSync(modelsDir, { recursive: true });
    fs.mkdirSync(testMigrationsRoot, { recursive: true });
    fs.mkdirSync(appMigrationsRoot, { recursive: true });
    fs.mkdirSync(seedsDir, { recursive: true });

    originalDbConnection = process.env.DB_CONNECTION;
    originalDbTestConnection = process.env.DB_TEST_CONNECTION;
    originalHooksDisabled = process.env.ELOQUENT_DISABLE_MODEL_HOOKS;
    originalExitCode = process.exitCode;
    process.exitCode = 0;

    originalConnectionDrivers = Object.fromEntries(
      Object.entries(dbConfig.connections).map(([name, value]) => [name, value?.driver])
    );

    jest.spyOn(PathMap, "ensureDirs").mockImplementation(() => undefined);
    jest.spyOn(PathMap, "models").mockImplementation((isTest = false) => {
      return isTest ? modelsDir : path.join(tempRoot, "app-models");
    });
    jest.spyOn(PathMap, "testMigrations").mockImplementation((connectionName?: string) => {
      return connectionName
        ? path.join(testMigrationsRoot, String(connectionName))
        : testMigrationsRoot;
    });
    jest.spyOn(PathMap, "appMigrations").mockImplementation((connectionName?: string) => {
      return connectionName
        ? path.join(appMigrationsRoot, String(connectionName))
        : appMigrationsRoot;
    });
    jest.spyOn(PathMap, "migrations").mockImplementation((isTest = false, connectionName?: string) => {
      if (isTest) {
        return connectionName
          ? path.join(testMigrationsRoot, String(connectionName))
          : testMigrationsRoot;
      }
      return connectionName
        ? path.join(appMigrationsRoot, String(connectionName))
        : appMigrationsRoot;
    });
    jest.spyOn(PathMap, "seeds").mockImplementation((isTest = false) => {
      return isTest ? seedsDir : path.join(tempRoot, "app-seeds");
    });

    mockedCompile.mockReturnValue(true);
    mockedLoadModule.mockReturnValue({});
    mockedResolveConnectionName.mockReturnValue("sqlite_test" as never);
    mockedCloseAllConnections.mockResolvedValue(undefined);
    mockedMigrateRun.mockResolvedValue(undefined);
    mockedAppendAuditEvent.mockImplementation(() => undefined);

    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    const connections = dbConfig.connections as Record<string, { driver?: string }>;
    for (const [name, driver] of Object.entries(originalConnectionDrivers)) {
      if (connections[name]) {
        connections[name].driver = driver;
      }
    }

    process.env.DB_CONNECTION = originalDbConnection;
    process.env.DB_TEST_CONNECTION = originalDbTestConnection;
    if (originalHooksDisabled === undefined) {
      delete process.env.ELOQUENT_DISABLE_MODEL_HOOKS;
    } else {
      process.env.ELOQUENT_DISABLE_MODEL_HOOKS = originalHooksDisabled;
    }
    process.exitCode = originalExitCode;

    jest.restoreAllMocks();
    jest.clearAllMocks();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test("makeModel skips migration generation when TypeScript compile fails", async () => {
    const toCreateSQLSpy = jest.spyOn(SchemaBuilder, "toCreateSQL");
    mockedCompile.mockReturnValue(false);

    await makeModel("User", { test: true, withMigration: true, force: true });

    expect(mockedCompile).toHaveBeenCalledTimes(1);
    expect(mockedLoadModule).not.toHaveBeenCalled();
    expect(toCreateSQLSpy).not.toHaveBeenCalled();
    expect(mockedCloseAllConnections).toHaveBeenCalledTimes(1);
  });

  test("makeModel keeps existing file unchanged when --force is false", async () => {
    const existingPath = path.join(modelsDir, "User.ts");
    const existingContent = "export class User {}";
    fs.writeFileSync(existingPath, existingContent, "utf8");

    await makeModel("User", { test: true });

    expect(fs.readFileSync(existingPath, "utf8")).toBe(existingContent);
  });

  test("makeMigration stops early when models directory is missing", async () => {
    const missingModelsRoot = path.join(tempRoot, "missing-models-dir");
    jest.spyOn(PathMap, "models").mockReturnValue(missingModelsRoot);

    await makeMigration("all", { test: true, exit: false });

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Models folder not found")
    );
  });

  test("makeMigration skips model files that fail TypeScript compilation", async () => {
    fs.writeFileSync(path.join(modelsDir, "User.ts"), "export class User {}", "utf8");
    mockedCompile.mockReturnValue(false);

    await makeMigration("all", { test: true, exit: false });

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Skipping migration due to TS error")
    );
  });

  test("cacheClear reports warning summary for fallback failures", async () => {
    jest.spyOn(setupCacheModule, "setupCache").mockImplementation(() => undefined);
    jest.spyOn(CacheRegistry, "clearAll").mockRejectedValue(new Error("registry-clear-fail"));
    jest.spyOn(CacheRegistry, "getStats")
      .mockReturnValueOnce({
        models: 1,
        groups: 2,
        keys: 3,
        groupsByModel: [],
      })
      .mockReturnValueOnce({
        models: 0,
        groups: 0,
        keys: 0,
        groupsByModel: [],
      });
    jest.spyOn(CacheFallbackManager, "getDrivers").mockReturnValue([{ constructor: { name: "A" } } as never]);
    jest.spyOn(CacheFallbackManager, "clearAllDrivers").mockResolvedValue([
      { driver: "A", ok: false, error: "clear-fail" },
    ]);
    jest.spyOn(CacheFallbackManager, "shutdownDrivers").mockResolvedValue([
      { driver: "A", closed: false, error: "shutdown-fail" },
    ]);
    jest.spyOn(CacheAnalytics, "reset").mockImplementation(() => undefined);

    await cacheClear();

    expect(console.error).toHaveBeenCalledWith("  warnings:");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("registry-clear-fail"));
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("clear-fail"));
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("shutdown-fail"));
  });

  test("cacheStats prints grouped analytics and fallback shutdown summary", async () => {
    jest.spyOn(setupCacheModule, "setupCache").mockImplementation(() => undefined);
    jest
      .spyOn(CacheManager, "getDriver")
      .mockReturnValue({ constructor: { name: "MemoryCacheDriver" } } as never);
    jest
      .spyOn(CacheFallbackManager, "getActiveDriver")
      .mockReturnValue({ constructor: { name: "FileCacheDriver" } } as never);
    jest.spyOn(CacheFallbackManager, "getDrivers").mockReturnValue([
      { constructor: { name: "FileCacheDriver" } } as never,
      { constructor: { name: "MemoryCacheDriver" } } as never,
    ]);
    jest.spyOn(CacheFallbackManager, "shutdownDrivers").mockResolvedValue([
      { driver: "FileCacheDriver", closed: true },
      { driver: "MemoryCacheDriver", closed: false, error: "close-fail" },
    ]);
    jest.spyOn(CacheRegistry, "getStats").mockReturnValue({
      models: 2,
      groups: 3,
      keys: 5,
      groupsByModel: [
        { model: "User", groups: 2, keys: 3 },
        { model: "Post", groups: 1, keys: 2 },
      ],
    });
    jest.spyOn(CacheAnalytics, "getStats").mockReturnValue([
      {
        model: "User",
        hits: 3,
        misses: 1,
        ttl: 60,
        lastAdjust: new Date().toISOString(),
      },
      {
        model: "Post",
        hits: 1,
        misses: 3,
        ttl: 30,
        lastAdjust: new Date().toISOString(),
      },
    ]);

    await cacheStats();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("fallback chain"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("registry by model"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("analytics by model"));
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("fallback chain shutdown: FileCacheDriver:closed, MemoryCacheDriver:open")
    );
  });

  test("dbSeed handles class-not-found and marks process exit code", async () => {
    fs.writeFileSync(path.join(seedsDir, "PostSeeder.ts"), "export function PostSeeder() {}", "utf8");

    await dbSeed({
      test: true,
      class: "UserSeeder",
      connectionNames: ["sqlite_test"],
      close: false,
      exit: false,
    });

    expect(mockedAppendAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        result: "failure",
        metadata: expect.objectContaining({ reason: "seeder_not_found" }),
      })
    );
    expect(process.exitCode).toBe(1);
  });

  test("dbSeed runs matching class seeder and restores env/hook state", async () => {
    const runSeeder = jest.fn(async () => undefined);
    fs.writeFileSync(path.join(seedsDir, "UserSeeder.ts"), "export function UserSeeder() {}", "utf8");
    mockedLoadModule.mockReturnValue({ UserSeeder: runSeeder });
    process.env.ELOQUENT_DISABLE_MODEL_HOOKS = "false";

    await dbSeed({
      test: true,
      class: "UserSeeder",
      noHooks: true,
      connectionNames: ["sqlite_test"],
      close: true,
      exit: false,
      silent: true,
    });

    expect(runSeeder).toHaveBeenCalledTimes(1);
    expect(mockedAppendAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        result: "success",
        metadata: expect.objectContaining({ className: "UserSeeder" }),
      })
    );
    expect(process.env.ELOQUENT_DISABLE_MODEL_HOOKS).toBe("false");
    expect(mockedCloseAllConnections).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(0);
  });

  test("migrateFresh supports mysql/pg/sqlite drop flows and --all-migrations generation", async () => {
    mockedMakeMigration.mockResolvedValue(undefined);
    dbConfig.connections.mysql.driver = "mysql";
    dbConfig.connections.pg.driver = "pg";
    dbConfig.connections.sqlite.driver = "sqlite";

    mockedGetAdapter.mockImplementation(async (connectionName) => {
      return {
        wrapId: (name: string) => `\`${name}\``,
        execute: jest.fn(async () => undefined),
        query: jest.fn(async (sql: string) => {
          if (connectionName === "mysql" && sql.includes("SHOW TABLES")) {
            return [{ Tables_in_db: "users" }];
          }
          if (connectionName === "pg" && sql.includes("FROM pg_tables")) {
            return [{ tablename: "posts" }];
          }
          if (connectionName === "sqlite" && sql.includes("FROM sqlite_master")) {
            return [{ name: "comments" }];
          }
          return [];
        }),
      } as never;
    });

    await migrateFresh({
      force: true,
      allMigrations: true,
      connectionNames: ["mysql", "pg", "sqlite"],
      auditCommand: "migrate:fresh:test",
    });

    expect(mockedGetAdapter).toHaveBeenCalledTimes(3);
    expect(mockedMakeMigration).toHaveBeenCalledWith(
      "all",
      expect.objectContaining({ connectionName: "mysql", exit: false })
    );
    expect(mockedMakeMigration).toHaveBeenCalledWith(
      "all",
      expect.objectContaining({ connectionName: "pg", exit: false })
    );
    expect(mockedMakeMigration).toHaveBeenCalledWith(
      "all",
      expect.objectContaining({ connectionName: "sqlite", exit: false })
    );
    expect(mockedMigrateRun).toHaveBeenCalledWith(false, undefined, false, false, {
      connectionNames: ["mysql", "pg", "sqlite"],
      auditCommand: "migrate:fresh:test",
    });
  });

  test("migrateFresh cancels when confirmation is denied", async () => {
    const createInterfaceSpy = jest
      .spyOn(readline, "createInterface")
      .mockReturnValue({
        question: (_prompt: string, cb: (answer: string) => void) => cb("n"),
        close: jest.fn(),
      } as unknown as readline.Interface);

    await migrateFresh({
      connectionNames: ["sqlite"],
      allMigrations: false,
    });

    expect(createInterfaceSpy).toHaveBeenCalledTimes(1);
    expect(mockedGetAdapter).not.toHaveBeenCalled();
    expect(mockedMigrateRun).not.toHaveBeenCalled();
  });

  test("migrateFresh marks failure when drop-all fails on a connection", async () => {
    mockedMakeMigration.mockResolvedValue(undefined);
    dbConfig.connections.sqlite.driver = "sqlite";

    mockedGetAdapter.mockResolvedValue({
      wrapId: (name: string) => `\`${name}\``,
      execute: jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("drop-failed")),
      query: jest.fn(async () => [{ name: "broken_table" }]),
    } as never);

    await migrateFresh({
      force: true,
      connectionNames: ["sqlite"],
      allMigrations: false,
    });

    expect(mockedMigrateRun).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(1);
  });
});
