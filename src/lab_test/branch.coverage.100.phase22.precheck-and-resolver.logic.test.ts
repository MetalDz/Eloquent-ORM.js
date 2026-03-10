import fs from "fs";
import path from "path";
import { dbConfig } from "../config/database";
import { PathMap } from "../cli/utils/PathMap";
import {
  assertSeedBootstrapPrecheck,
  printSeedBootstrapPrecheck,
  runSeedBootstrapPrecheck,
} from "../cli/utils/SeedBootstrapPrecheck";
import {
  closeAllConnections,
  getConnection,
  getAdapter,
} from "../core/connection/ConnectionFactory";
import { resolveConnectionName as resolveSeedConnectionName } from "../core/connection/resolveConnectionName";
const { resolveConnectionName: resolveConnectionNameActual } =
  jest.requireActual("../core/connection/resolveConnectionName") as typeof import("../core/connection/resolveConnectionName");

jest.mock("chalk", () => ({
  __esModule: true,
  default: {
    cyan: (value: string) => value,
    green: (value: string) => value,
    red: (value: string) => value,
    yellow: (value: string) => value,
  },
}));

jest.mock("../core/connection/ConnectionFactory", () => ({
  closeAllConnections: jest.fn(),
  getConnection: jest.fn(),
  getAdapter: jest.fn(),
}));

jest.mock("../core/connection/resolveConnectionName", () => ({
  resolveConnectionName: jest.fn(),
}));

const mockedCloseAllConnections =
  closeAllConnections as jest.MockedFunction<typeof closeAllConnections>;
const mockedGetConnection =
  getConnection as jest.MockedFunction<typeof getConnection>;
const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;
const mockedResolveSeedConnectionName =
  resolveSeedConnectionName as jest.MockedFunction<typeof resolveSeedConnectionName>;

describe("Branch coverage 100% - phase 22 seed precheck and resolver branches", () => {
  const originalExistsSync = fs.existsSync;
  const originalReaddirSync = fs.readdirSync;
  const originalDbConnection = process.env.DB_CONNECTION;
  const originalDbTestConnection = process.env.DB_TEST_CONNECTION;
  const originalDefault = dbConfig.default;
  const originalConnections = dbConfig.connections;
  const dirFixtures = new Map<string, { exists: boolean; files: string[] }>();

  const adapter = {
    query: jest.fn<Promise<Array<{ name: string }>>, [string, unknown[]?]>(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.exitCode = 0;
    dirFixtures.clear();

    mockedCloseAllConnections.mockResolvedValue(undefined);
    mockedGetConnection.mockResolvedValue({} as never);
    mockedGetAdapter.mockResolvedValue(adapter as never);
    mockedResolveSeedConnectionName.mockReturnValue("mysql" as never);
    adapter.query.mockResolvedValue([]);

    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(fs, "existsSync").mockImplementation((target: fs.PathLike) => {
      const normalized = path.resolve(String(target));
      const fixture = dirFixtures.get(normalized);
      if (fixture) return fixture.exists;
      return originalExistsSync(target);
    });
    jest.spyOn(fs, "readdirSync").mockImplementation((target: fs.PathLike) => {
      const normalized = path.resolve(String(target));
      const fixture = dirFixtures.get(normalized);
      if (fixture) {
        return fixture.files as unknown as ReturnType<typeof fs.readdirSync>;
      }
      return originalReaddirSync(target) as unknown as ReturnType<typeof fs.readdirSync>;
    });

    dbConfig.default = originalDefault;
    dbConfig.connections = { ...originalConnections };
    process.env.DB_CONNECTION = originalDbConnection;
    process.env.DB_TEST_CONNECTION = originalDbTestConnection;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.exitCode = 0;
    dbConfig.default = originalDefault;
    dbConfig.connections = originalConnections;
    process.env.DB_CONNECTION = originalDbConnection;
    process.env.DB_TEST_CONNECTION = originalDbTestConnection;
  });

  function setMigrationsDir(
    connectionName: string,
    files: string[],
    exists = true
  ): void {
    const migrationsDir = PathMap.migrations(false, connectionName as never);
    dirFixtures.set(path.resolve(migrationsDir), { exists, files });
  }

  test("seed precheck covers missing migrations directory and clean output branch", async () => {
    setMigrationsDir("mysql", [], false);

    const report = await runSeedBootstrapPrecheck({
      test: false,
      connectionNames: ["mysql" as never],
    });

    expect(report.clean).toBe(false);
    expect(report.checks[0].reasons[0]).toContain("Missing migrations directory");

    printSeedBootstrapPrecheck({
      clean: true,
      checks: [
        {
          connectionName: "mysql" as never,
          migrationsDir: "/tmp/migrations",
          clean: true,
          reasons: [],
          pendingMigrations: [],
        },
      ],
    });
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("[mysql] clean")
    );
  });

  test("seed precheck treats mongo connection as non-SQL N/A while still validating connection reachability", async () => {
    setMigrationsDir("mongo", [], false);
    (dbConfig.connections as Record<string, { driver?: string }>).mongo = {
      driver: "mongo",
    };

    const report = await runSeedBootstrapPrecheck({
      test: false,
      connectionNames: ["mongo" as never],
    });

    expect(report.clean).toBe(true);
    expect(report.checks[0].clean).toBe(true);
    expect(report.checks[0].reasons).toEqual([]);
    expect(mockedGetConnection).toHaveBeenCalledWith("mongo");

    setMigrationsDir("mysql", ["20260301000001_create_users_table.ts"], true);
    adapter.query.mockResolvedValue([{ name: "20260301000001_create_users_table.ts" }]);
    const ok = await assertSeedBootstrapPrecheck({
      test: false,
      connectionNames: ["mysql" as never],
    });
    expect(ok).toBe(true);
    expect(process.exitCode).toBe(0);
  });

  test("resolveConnectionName covers non-test path branches and mysql fallback", () => {
    delete process.env.DB_CONNECTION;
    delete process.env.DB_TEST_CONNECTION;

    expect(resolveConnectionNameActual({ connectionName: "pg" }, { test: false })).toBe("pg");

    process.env.DB_CONNECTION = "sqlite";
    expect(resolveConnectionNameActual(undefined, { test: false })).toBe("sqlite");

    delete process.env.DB_CONNECTION;
    dbConfig.default = "pg";
    expect(resolveConnectionNameActual(undefined, { test: false })).toBe("pg");

    dbConfig.default = "" as any;
    expect(resolveConnectionNameActual(undefined, { test: false })).toBe("mysql");

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(resolveConnectionNameActual({ connectionName: "invalid_conn" }, { test: false })).toBe(
      "mysql"
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid connection "invalid_conn"')
    );
  });
});
