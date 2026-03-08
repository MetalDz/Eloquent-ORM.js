import fs from "fs";
import os from "os";
import path from "path";

type SharedModule = typeof import("./support/cli.integration.connection.shared");

describe("Branch coverage 70 - CLI support shared helpers", () => {
  const originalEnv = { ...process.env };
  const originalCwd = process.cwd();

  function loadShared(harnessMock: Record<string, unknown>): SharedModule {
    jest.resetModules();
    jest.doMock("./support/cli.integration.harness", () => harnessMock);
    return require("./support/cli.integration.connection.shared") as SharedModule;
  }

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.chdir(originalCwd);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    process.chdir(originalCwd);
    jest.restoreAllMocks();
    jest.resetModules();
    jest.clearAllMocks();
  });

  test("connection env helper builders return expected payloads", () => {
    const shared = loadShared({
      appRootDir: ".",
      assertCliSuccess: jest.fn(),
      bootstrapAppFixtures: jest.fn(),
      ensureDir: jest.fn(),
      hasAppModels: true,
      hasAppMysqlEnv: true,
      hasBuiltCli: true,
      hasPgAppEnv: true,
      hasPgTestEnv: true,
      hasTestDbEnv: true,
      resetMysqlDatabase: jest.fn(),
      resetMysqlTestDatabase: jest.fn(),
      resetPgDatabase: jest.fn(),
      resetSqliteDatabase: jest.fn(),
      runCli: jest.fn(),
    });

    process.env.PG_NAME = "pg_main";
    process.env.PG_DB_NAME = "pg_fallback";
    expect(shared.appMysqlEnv()).toEqual({ DB_CONNECTION: "mysql" });
    expect(shared.appPgEnv()).toEqual({ DB_CONNECTION: "pg", PG_NAME: "pg_main" });
    expect(shared.appSqliteEnv()).toEqual({
      DB_CONNECTION: "sqlite",
      SQLITE_PATH: "./cli.integration.app.sqlite",
    });
    expect(shared.appAllConnectionsEnv()).toEqual({
      DB_CONNECTION: "mysql",
      PG_NAME: "pg_main",
      SQLITE_PATH: "./cli.integration.app.sqlite",
    });
    expect(shared.testMysqlEnv()).toEqual({ DB_TEST_CONNECTION: "mysql_test" });
    expect(shared.testPgEnv()).toEqual({ DB_TEST_CONNECTION: "pg_test" });
    expect(shared.testSqliteEnv()).toEqual({
      DB_TEST_CONNECTION: "sqlite_test",
      SQLITE_TEST_PATH: "./cli.integration.test.sqlite",
    });
    expect(shared.testAllConnectionsEnv()).toEqual({
      DB_TEST_CONNECTION: "mysql_test",
      SQLITE_TEST_PATH: "./cli.integration.test.sqlite",
    });
  });

  test("reset app/test wrappers obey env gates", async () => {
    const resetMysqlDatabase = jest.fn(async () => undefined);
    const resetPgDatabase = jest.fn(async () => undefined);
    const resetMysqlTestDatabase = jest.fn(async () => undefined);
    const resetSqliteDatabase = jest.fn();
    const shared = loadShared({
      appRootDir: ".",
      assertCliSuccess: jest.fn(),
      bootstrapAppFixtures: jest.fn(),
      ensureDir: jest.fn(),
      hasAppModels: true,
      hasAppMysqlEnv: true,
      hasBuiltCli: true,
      hasPgAppEnv: true,
      hasPgTestEnv: true,
      hasTestDbEnv: true,
      resetMysqlDatabase,
      resetMysqlTestDatabase,
      resetPgDatabase,
      resetSqliteDatabase,
      runCli: jest.fn(),
    });

    process.env.DB_NAME = "app_db";
    process.env.DB_HOST = "localhost";
    process.env.DB_USER = "root";
    process.env.DB_PASSWORD = "";
    process.env.DB_PORT = "3306";
    process.env.PG_NAME = "pg_app";
    process.env.PG_HOST = "localhost";
    process.env.PG_USER = "postgres";
    process.env.PG_PASSWORD = "";
    process.env.PG_PORT = "5432";
    process.env.PG_TEST_NAME = "pg_test_db";
    process.env.PG_TEST_HOST = "localhost";
    process.env.PG_TEST_USER = "postgres";
    process.env.PG_TEST_PASSWORD = "";
    process.env.PG_TEST_PORT = "5432";

    await shared.resetAppMysql();
    await shared.resetAppPg();
    await shared.resetTestPg();

    expect(resetMysqlDatabase).toHaveBeenCalledTimes(1);
    expect(resetPgDatabase).toHaveBeenCalledTimes(2);

    await shared.resetAllTestDatabases();
    expect(resetMysqlTestDatabase).toHaveBeenCalledTimes(1);
    expect(resetSqliteDatabase).toHaveBeenCalledWith("./cli.integration.test.sqlite");

    await shared.resetAllAppDatabases();
    expect(resetMysqlDatabase).toHaveBeenCalledTimes(2);
    expect(resetSqliteDatabase).toHaveBeenCalledWith("./cli.integration.app.sqlite");
  });

  test("reset wrappers no-op when gates are disabled", async () => {
    const resetMysqlDatabase = jest.fn(async () => undefined);
    const resetPgDatabase = jest.fn(async () => undefined);
    const resetMysqlTestDatabase = jest.fn(async () => undefined);
    const resetSqliteDatabase = jest.fn();
    const shared = loadShared({
      appRootDir: ".",
      assertCliSuccess: jest.fn(),
      bootstrapAppFixtures: jest.fn(),
      ensureDir: jest.fn(),
      hasAppModels: false,
      hasAppMysqlEnv: false,
      hasBuiltCli: true,
      hasPgAppEnv: false,
      hasPgTestEnv: false,
      hasTestDbEnv: false,
      resetMysqlDatabase,
      resetMysqlTestDatabase,
      resetPgDatabase,
      resetSqliteDatabase,
      runCli: jest.fn(),
    });

    await shared.resetAppMysql();
    await shared.resetAppPg();
    await shared.resetTestPg();
    await shared.resetAllTestDatabases();
    await shared.resetAllAppDatabases();

    expect(resetMysqlDatabase).not.toHaveBeenCalled();
    expect(resetPgDatabase).not.toHaveBeenCalled();
    expect(resetMysqlTestDatabase).not.toHaveBeenCalled();
    expect(resetSqliteDatabase).toHaveBeenCalledTimes(2);
  });

  test("migrate wrappers pass through runCli and assertCliSuccess", () => {
    const result = { status: 0, signal: null, combined: "", durationMs: 1, timeoutMs: 100 } as any;
    const runCli = jest.fn(() => result);
    const assertCliSuccess = jest.fn();

    const shared = loadShared({
      appRootDir: ".",
      assertCliSuccess,
      bootstrapAppFixtures: jest.fn(),
      ensureDir: jest.fn(),
      hasAppModels: true,
      hasAppMysqlEnv: true,
      hasBuiltCli: true,
      hasPgAppEnv: true,
      hasPgTestEnv: true,
      hasTestDbEnv: true,
      resetMysqlDatabase: jest.fn(),
      resetMysqlTestDatabase: jest.fn(),
      resetPgDatabase: jest.fn(),
      resetSqliteDatabase: jest.fn(),
      runCli,
    });

    const testResult = shared.migrateTestConnection(["migrate:run", "--test"], { A: "1" });
    const appResult = shared.migrateAppConnection(["migrate:run"], { B: "1" });

    expect(testResult).toBe(result);
    expect(appResult).toBe(result);
    expect(runCli).toHaveBeenCalledTimes(2);
    expect(assertCliSuccess).toHaveBeenCalledTimes(2);
  });

  test("registerConnectionFixtureLifecycle executes before/after hooks", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-cli-shared-"));
    const appRootDir = path.join(tmpRoot, "src", "app");
    fs.mkdirSync(appRootDir, { recursive: true });
    fs.writeFileSync(path.join(appRootDir, "placeholder.txt"), "x", "utf8");

    const runCli = jest.fn(() => ({
      status: 0,
      signal: null,
      combined: "",
      durationMs: 1,
      timeoutMs: 100,
    }));
    const assertCliSuccess = jest.fn();
    const bootstrapAppFixtures = jest.fn();
    const ensureDir = jest.fn();
    const resetAppMysql = jest.fn(async () => undefined);
    const resetAppPg = jest.fn(async () => undefined);
    const resetMysqlTestDatabase = jest.fn(async () => undefined);
    const resetTestPg = jest.fn(async () => undefined);
    const resetSqliteDatabase = jest.fn();

    const shared = loadShared({
      appRootDir,
      assertCliSuccess,
      bootstrapAppFixtures,
      ensureDir,
      hasAppModels: true,
      hasAppMysqlEnv: true,
      hasBuiltCli: true,
      hasPgAppEnv: true,
      hasPgTestEnv: true,
      hasTestDbEnv: true,
      resetMysqlDatabase: resetAppMysql,
      resetMysqlTestDatabase,
      resetPgDatabase: resetAppPg,
      resetSqliteDatabase,
      runCli,
    });

    const originalBeforeAll = global.beforeAll;
    const originalAfterAll = global.afterAll;
    let beforeHook: (() => Promise<void>) | null = null;
    let afterHook: (() => void) | null = null;

    (global as any).beforeAll = (fn: () => Promise<void>) => {
      beforeHook = fn;
    };
    (global as any).afterAll = (fn: () => void) => {
      afterHook = fn;
    };

    try {
      shared.registerConnectionFixtureLifecycle();
      expect(beforeHook).not.toBeNull();
      expect(afterHook).not.toBeNull();

      if (beforeHook) {
        await (beforeHook as unknown as () => Promise<void>)();
      }
      expect(ensureDir).toHaveBeenCalledWith(appRootDir);
      expect(bootstrapAppFixtures).toHaveBeenCalledTimes(1);
      expect(runCli).toHaveBeenCalledTimes(1);
      expect(assertCliSuccess).toHaveBeenCalledTimes(1);
      expect(resetAppMysql).toHaveBeenCalledTimes(1);
      expect(resetAppPg).toHaveBeenCalledTimes(2);
      expect(resetMysqlTestDatabase).toHaveBeenCalledTimes(1);
      expect(resetSqliteDatabase).toHaveBeenCalledWith("./cli.integration.app.sqlite");
      expect(resetSqliteDatabase).toHaveBeenCalledWith("./cli.integration.test.sqlite");

      if (afterHook) {
        (afterHook as unknown as () => void)();
      }
      expect(fs.existsSync(appRootDir)).toBe(true);
    } finally {
      (global as any).beforeAll = originalBeforeAll;
      (global as any).afterAll = originalAfterAll;
    }
  });
});
