import fs from "fs";
import os from "os";
import path from "path";

type HarnessModule = typeof import("./support/cli.integration.harness");
type SharedModule = typeof import("./support/cli.integration.connection.shared");

describe("Branch coverage 100% - phase 21 CLI support deep branches", () => {
  const originalCwd = process.cwd();
  const originalEnv = { ...process.env };

  let spawnSyncMock: jest.Mock;
  let mysqlCreateConnectionMock: jest.Mock;
  let pgQueryHandler: (opts: Record<string, unknown>, sql: string) => Promise<unknown>;
  let pgInstances: Array<{
    options: Record<string, unknown>;
    connect: jest.Mock<Promise<void>, []>;
    query: jest.Mock<Promise<unknown>, [string]>;
    end: jest.Mock<Promise<void>, []>;
  }>;

  function loadHarness(spawnProbeError = false): HarnessModule {
    jest.resetModules();
    spawnSyncMock = jest.fn();
    mysqlCreateConnectionMock = jest.fn();
    pgQueryHandler = async () => undefined;
    pgInstances = [];

    spawnSyncMock.mockImplementationOnce(() => ({
      stdout: "v24",
      stderr: "",
      status: 0,
      signal: null,
      pid: 1,
      output: [],
      error: spawnProbeError ? Object.assign(new Error("spawn blocked"), { code: "EPERM" }) : undefined,
    }));

    jest.doMock("child_process", () => {
      const actual = jest.requireActual("child_process");
      return {
        ...actual,
        spawnSync: spawnSyncMock,
      };
    });

    jest.doMock("mysql2/promise", () => ({
      createConnection: mysqlCreateConnectionMock,
    }));

    jest.doMock("pg", () => ({
      Client: class MockPgClient {
        public readonly options: Record<string, unknown>;
        public readonly connect = jest.fn(async () => undefined);
        public readonly query = jest.fn(async (sql: string) => {
          return await pgQueryHandler(this.options, sql);
        });
        public readonly end = jest.fn(async () => undefined);

        constructor(options: Record<string, unknown>) {
          this.options = options;
          pgInstances.push(this);
        }
      },
    }));

    return require("./support/cli.integration.harness") as HarnessModule;
  }

  function loadShared(harnessMock: Record<string, unknown>): SharedModule {
    jest.resetModules();
    jest.doMock("./support/cli.integration.harness", () => harnessMock);
    return require("./support/cli.integration.connection.shared") as SharedModule;
  }

  beforeEach(() => {
    process.chdir(originalCwd);
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.chdir(originalCwd);
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
    jest.resetModules();
    jest.clearAllMocks();
  });

  test("harness covers default connection name and runCli stdout/stderr fallback", () => {
    const harness = loadHarness();
    delete process.env.DB_TEST_CONNECTION;

    spawnSyncMock.mockImplementationOnce(() => ({
      stdout: undefined,
      stderr: undefined,
      status: 0,
      signal: null,
      pid: 2,
      output: [],
    }));

    const result = harness.runCli(["--help"]);
    expect(harness.currentTestConnectionName()).toBe("mysql_test");
    expect(result.combined).toBe("\n");
    expect(result.timeoutMs).toBe(120000);
    expect(spawnSyncMock).toHaveBeenCalledTimes(2);
    expect(spawnSyncMock.mock.calls[1][2]).toEqual(
      expect.objectContaining({
        input: undefined,
        timeout: 120000,
      })
    );
  });

  test("harness covers mysql test reset env fallbacks and pg admin-db branch", async () => {
    const harness = loadHarness();

    delete process.env.DB_TEST_HOST;
    delete process.env.DB_HOST;
    delete process.env.DB_TEST_USER;
    delete process.env.DB_USER;
    delete process.env.DB_TEST_PASSWORD;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_TEST_PORT;
    delete process.env.DB_TEST_NAME;

    const mysqlQuery = jest.fn(async (sql: string) => {
      if (sql === "SHOW TABLES") return [[]];
      return [[]];
    });
    const mysqlEnd = jest.fn(async () => undefined);
    mysqlCreateConnectionMock.mockResolvedValue({ query: mysqlQuery, end: mysqlEnd });

    await harness.resetMysqlTestDatabase();

    expect(mysqlCreateConnectionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "localhost",
        user: "root",
        password: "",
        port: 3306,
        multipleStatements: false,
      })
    );
    expect(mysqlQuery).toHaveBeenCalledWith("CREATE DATABASE IF NOT EXISTS `db_test`");
    expect(mysqlEnd).toHaveBeenCalledTimes(1);

    pgQueryHandler = async (options, sql) => {
      const dbName = String(options.database);
      if (dbName === "template1" && sql.includes("CREATE DATABASE")) {
        throw "database already exists";
      }
      return undefined;
    };

    await expect(
      harness.resetPgDatabase("postgres", {
        host: "localhost",
        user: "postgres",
        password: "",
        port: 5432,
      })
    ).resolves.toBeUndefined();

    expect(pgInstances[0]?.options.database).toBe("template1");
    expect(pgInstances[1]?.options.database).toBe("postgres");
  });

  test("shared helper covers describe gating and PG env fallback branches", () => {
    const shared = loadShared({
      appRootDir: ".",
      assertCliSuccess: jest.fn(),
      bootstrapAppFixtures: jest.fn(),
      canSpawnCli: true,
      ensureDir: jest.fn(),
      hasAppModels: true,
      hasAppMysqlEnv: true,
      hasBuiltCli: false,
      hasPgAppEnv: true,
      hasPgTestEnv: true,
      hasTestDbEnv: true,
      resetMysqlDatabase: jest.fn(),
      resetMysqlTestDatabase: jest.fn(),
      resetPgDatabase: jest.fn(),
      resetSqliteDatabase: jest.fn(),
      runCli: jest.fn(),
    });

    expect(shared.describeIfBuiltOnly).toBe(describe.skip);

    delete process.env.PG_NAME;
    process.env.PG_DB_NAME = "pg_fallback";
    expect(shared.appPgEnv()).toEqual({
      DB_CONNECTION: "pg",
      PG_NAME: "pg_fallback",
    });

    delete process.env.PG_DB_NAME;
    expect(shared.appPgEnv()).toEqual({
      DB_CONNECTION: "pg",
      PG_NAME: "test_db",
    });
    expect(shared.appAllConnectionsEnv()).toEqual({
      DB_CONNECTION: "mysql",
      PG_NAME: "test_db",
      SQLITE_PATH: "./cli.integration.app.sqlite",
    });
  });

  test("shared fixture lifecycle covers afterAll early return and missing-backup path", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-phase21-shared-"));
    const appRootDir = path.join(tmpRoot, "src", "app");

    const runCli = jest.fn(() => ({
      status: 0,
      signal: null,
      combined: "",
      durationMs: 1,
      timeoutMs: 100,
    }));
    const assertCliSuccess = jest.fn();
    const bootstrapAppFixtures = jest.fn();
    const ensureDir = jest.fn((dirPath: string) => fs.mkdirSync(dirPath, { recursive: true }));
    const resetMysqlDatabase = jest.fn(async () => undefined);
    const resetPgDatabase = jest.fn(async () => undefined);
    const resetMysqlTestDatabase = jest.fn(async () => undefined);
    const resetSqliteDatabase = jest.fn();

    const shared = loadShared({
      appRootDir,
      assertCliSuccess,
      bootstrapAppFixtures,
      canSpawnCli: true,
      ensureDir,
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
      runCli,
    });

    const originalBeforeAll = global.beforeAll;
    const originalAfterAll = global.afterAll;
    let beforeHook: (() => Promise<void>) | null = null;
    let afterHook: (() => void) | null = null;

    (global as unknown as { beforeAll: (fn: () => Promise<void>) => void }).beforeAll = (
      fn: () => Promise<void>
    ) => {
      beforeHook = fn;
    };
    (global as unknown as { afterAll: (fn: () => void) => void }).afterAll = (fn: () => void) => {
      afterHook = fn;
    };

    try {
      shared.registerConnectionFixtureLifecycle();
      expect(beforeHook).not.toBeNull();
      expect(afterHook).not.toBeNull();

      // Covers the `if (!appRootBackupDir) return;` branch.
      if (afterHook) {
        (afterHook as () => void)();
      }

      if (beforeHook) {
        await (beforeHook as () => Promise<void>)();
      }
      expect(ensureDir).toHaveBeenCalledWith(appRootDir);
      expect(bootstrapAppFixtures).toHaveBeenCalledTimes(1);
      expect(runCli).toHaveBeenCalledTimes(1);
      expect(assertCliSuccess).toHaveBeenCalledTimes(1);
      expect(resetMysqlDatabase).not.toHaveBeenCalled();
      expect(resetPgDatabase).not.toHaveBeenCalled();
      expect(resetMysqlTestDatabase).not.toHaveBeenCalled();
      expect(resetSqliteDatabase).toHaveBeenCalledWith("./cli.integration.app.sqlite");
      expect(resetSqliteDatabase).toHaveBeenCalledWith("./cli.integration.test.sqlite");

      // App root is removed and no backup exists to restore from.
      if (afterHook) {
        (afterHook as () => void)();
      }
      expect(fs.existsSync(appRootDir)).toBe(false);
    } finally {
      (global as unknown as { beforeAll: typeof beforeAll }).beforeAll = originalBeforeAll;
      (global as unknown as { afterAll: typeof afterAll }).afterAll = originalAfterAll;
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});

