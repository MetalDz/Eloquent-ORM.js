import fs from "fs";
import os from "os";
import path from "path";

type HarnessModule = typeof import("./support/cli.integration.harness.js");

describe("Branch coverage 70 - CLI support helpers", () => {
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

  function loadHarness(): HarnessModule {
    jest.resetModules();
    spawnSyncMock = jest.fn();
    mysqlCreateConnectionMock = jest.fn();
    pgQueryHandler = async () => undefined;
    pgInstances = [];

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

  test("path sanitizers and migration path helpers cover test/app branches", () => {
    const harness = loadHarness();
    process.env.DB_TEST_CONNECTION = "pg:test/conn";

    expect(harness.sanitizePathSegment("bad/path:name")).toBe("bad_path_name");
    expect(harness.currentTestConnectionName()).toBe("pg:test/conn");
    expect(harness.testMigrationsDir()).toContain(path.join("src", "test", "database", "migrations"));
    expect(harness.connectionMigrationsDir(true, "pg:test")).toContain(
      path.join("src", "test", "database", "migrations", "pg_test")
    );
    expect(harness.connectionMigrationsDir(false, "mysql")).toContain(
      path.join("src", "app", "database", "migrations", "mysql")
    );
  });

  test("runCli returns combined output and assertCliSuccess handles success", () => {
    const harness = loadHarness();
    spawnSyncMock.mockReturnValue({
      stdout: "out",
      stderr: "err",
      status: 0,
      signal: null,
      pid: 1,
      output: [],
    });

    const result = harness.runCli(["--help"], 1234, "input", { X: "1" });
    expect(result.combined).toContain("out");
    expect(result.combined).toContain("err");
    expect(result.timeoutMs).toBe(1234);
    expect(spawnSyncMock).toHaveBeenCalledTimes(2);
    expect(spawnSyncMock.mock.calls[1][1]).toEqual(expect.arrayContaining(["--help"]));

    expect(() => harness.assertCliSuccess(result, ["--help"])).not.toThrow();
  });

  test("assertCliSuccess throws timeout, spawn, and non-zero branches", () => {
    const harness = loadHarness();

    const timeoutResult = {
      error: Object.assign(new Error("timeout"), { code: "ETIMEDOUT" }),
      status: null,
      signal: null,
      combined: "x",
      durationMs: 1200,
      timeoutMs: 1000,
    } as unknown as ReturnType<HarnessModule["runCli"]>;
    expect(() => harness.assertCliSuccess(timeoutResult, ["migrate:run"])).toThrow("timed out");

    const spawnErrorResult = {
      error: Object.assign(new Error("spawn failed"), { code: "EPERM" }),
      status: null,
      signal: null,
      combined: "x",
      durationMs: 10,
      timeoutMs: 1000,
    } as unknown as ReturnType<HarnessModule["runCli"]>;
    expect(() => harness.assertCliSuccess(spawnErrorResult, ["migrate:run"])).toThrow(
      "failed to spawn"
    );

    const nonZeroResult = {
      error: undefined,
      status: 1,
      signal: null,
      combined: "stderr",
      durationMs: 10,
      timeoutMs: 1000,
    } as unknown as ReturnType<HarnessModule["runCli"]>;
    expect(() => harness.assertCliSuccess(nonZeroResult, ["migrate:run"])).toThrow("exited non-zero");
  });

  test("identifier and sqlite reset helpers cover valid and invalid branches", () => {
    const harness = loadHarness();
    expect(() => harness.assertSafeIdentifier("users_01", "table")).not.toThrow();
    expect(() => harness.assertSafeIdentifier("users-01", "table")).toThrow("Unsafe table");

    const tmpFile = path.join(os.tmpdir(), `eloquent-cli-support-${Date.now()}.sqlite`);
    fs.writeFileSync(tmpFile, "x");
    harness.resetSqliteDatabase(tmpFile);
    expect(fs.existsSync(tmpFile)).toBe(false);
    expect(() => harness.resetSqliteDatabase(tmpFile)).not.toThrow();
  });

  test("mysql reset helpers drop discovered tables and always close connection", async () => {
    const harness = loadHarness();
    const query = jest.fn(async (sql: string) => {
      if (sql === "SHOW TABLES") {
        return [[{ Tables_in_test: "users" }, { Tables_in_test: "posts" }]];
      }
      return [[]];
    });
    const end = jest.fn(async () => undefined);
    mysqlCreateConnectionMock.mockResolvedValue({ query, end });

    await harness.resetMysqlDatabase("my_db", {
      host: "localhost",
      user: "root",
      password: "",
      port: 3306,
    });
    expect(query).toHaveBeenCalledWith("SHOW TABLES");
    expect(query).toHaveBeenCalledWith("SET FOREIGN_KEY_CHECKS = 0");
    expect(query).toHaveBeenCalledWith("SET FOREIGN_KEY_CHECKS = 1");
    expect(end).toHaveBeenCalledTimes(1);

    process.env.DB_TEST_NAME = "db_test";
    await harness.resetMysqlTestDatabase();
    expect(mysqlCreateConnectionMock).toHaveBeenCalledTimes(2);
  });

  test("mysql reset rejects unsafe identifiers and still closes on unsafe table row", async () => {
    const harness = loadHarness();
    await expect(
      harness.resetMysqlDatabase("bad-name", {
        host: "localhost",
        user: "root",
        password: "",
        port: 3306,
      })
    ).rejects.toThrow("Unsafe database name");
    expect(mysqlCreateConnectionMock).not.toHaveBeenCalled();

    const query = jest.fn(async (sql: string) => {
      if (sql === "SHOW TABLES") {
        return [[{ Tables_in_test: "bad-name" }]];
      }
      return [[]];
    });
    const end = jest.fn(async () => undefined);
    mysqlCreateConnectionMock.mockResolvedValue({ query, end });

    await expect(
      harness.resetMysqlDatabase("good_db", {
        host: "localhost",
        user: "root",
        password: "",
        port: 3306,
      })
    ).rejects.toThrow("Unsafe table name");
    expect(end).toHaveBeenCalledTimes(1);
  });

  test("pg reset handles create-db success and already-exists branch", async () => {
    const harness = loadHarness();

    pgQueryHandler = async (options, sql) => {
      const database = String(options.database);
      if (database === "postgres" && sql.includes("CREATE DATABASE")) {
        throw new Error("database already exists");
      }
      return undefined;
    };

    await harness.resetPgDatabase("my_db", {
      host: "localhost",
      user: "postgres",
      password: "",
      port: 5432,
    });
    expect(pgInstances).toHaveLength(2);
    expect(pgInstances[0].connect).toHaveBeenCalledTimes(1);
    expect(pgInstances[0].end).toHaveBeenCalledTimes(1);
    expect(pgInstances[1].query).toHaveBeenCalledWith("DROP SCHEMA IF EXISTS public CASCADE;");
    expect(pgInstances[1].query).toHaveBeenCalledWith("CREATE SCHEMA public;");
  });

  test("pg reset rethrows non-already-exists create error", async () => {
    const harness = loadHarness();
    pgQueryHandler = async (options, sql) => {
      const database = String(options.database);
      if (database === "postgres" && sql.includes("CREATE DATABASE")) {
        throw new Error("permission denied");
      }
      return undefined;
    };

    await expect(
      harness.resetPgDatabase("another_db", {
        host: "localhost",
        user: "postgres",
        password: "",
        port: 5432,
      })
    ).rejects.toThrow("permission denied");
  });

  test("write helpers and bootstrap fixtures populate a temp project tree", () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-cli-support-tree-"));
    process.chdir(tmpRoot);
    const harness = loadHarness();

    const simpleFile = path.join(tmpRoot, "nested", "file.txt");
    harness.writeFixture(simpleFile, "ok");
    expect(fs.readFileSync(simpleFile, "utf8")).toBe("ok");

    harness.bootstrapAppFixtures();
    expect(
      fs.existsSync(path.join(tmpRoot, "src/app/models/User.ts"))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(tmpRoot, "src/app/database/seeds/BlogScenarioSeeder.ts"))
    ).toBe(true);
  });
});
