import fs from "fs";
import path from "path";
import { PathMap } from "../cli/utils/PathMap.js";
import {
  assertSeedBootstrapPrecheck,
  runSeedBootstrapPrecheck,
} from "../cli/utils/SeedBootstrapPrecheck.js";
import {
  closeAllConnections,
  getAdapter,
} from "../core/connection/ConnectionFactory.js";
import { resolveConnectionName } from "../core/connection/resolveConnectionName.js";

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
  getAdapter: jest.fn(),
}));

jest.mock("../core/connection/resolveConnectionName", () => ({
  resolveConnectionName: jest.fn(),
}));

const mockedCloseAllConnections =
  closeAllConnections as jest.MockedFunction<typeof closeAllConnections>;
const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;
const mockedResolveConnectionName =
  resolveConnectionName as jest.MockedFunction<typeof resolveConnectionName>;

describe("db:seed bootstrap precheck", () => {
  const originalExistsSync = fs.existsSync;
  const originalReaddirSync = fs.readdirSync;
  const dirFixtures = new Map<string, { exists: boolean; files: string[] }>();
  const adapter = {
    query: jest.fn<
      Promise<Array<{ name: string }>>,
      [string, unknown[]?]
    >(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.exitCode = 0;
    dirFixtures.clear();

    mockedCloseAllConnections.mockResolvedValue(undefined);
    mockedGetAdapter.mockResolvedValue(adapter as never);
    mockedResolveConnectionName.mockReturnValue("mysql" as never);
    adapter.query.mockResolvedValue([]);

    jest.spyOn(console, "log").mockImplementation(() => undefined);

    jest.spyOn(fs, "existsSync").mockImplementation((target: fs.PathLike) => {
      const normalized = path.resolve(String(target));
      const fixture = dirFixtures.get(normalized);
      if (fixture) {
        return fixture.exists;
      }
      return originalExistsSync(target);
    });

    jest
      .spyOn(fs, "readdirSync")
      .mockImplementation((target: fs.PathLike): ReturnType<typeof fs.readdirSync> => {
        const normalized = path.resolve(String(target));
        const fixture = dirFixtures.get(normalized);
        if (fixture) {
          return fixture.files as unknown as ReturnType<typeof fs.readdirSync>;
        }
        return originalReaddirSync(target) as unknown as ReturnType<
          typeof fs.readdirSync
        >;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.exitCode = 0;
  });

  function setMigrationsDir(
    connectionName: string,
    files: string[],
    exists = true
  ): void {
    const migrationsDir = PathMap.migrations(false, connectionName);
    dirFixtures.set(path.resolve(migrationsDir), { exists, files });
  }

  test("passes when migration files and applied history are fully aligned", async () => {
    setMigrationsDir("mysql", ["20260301000001_create_users_table.ts"]);
    adapter.query.mockResolvedValue([
      { name: "20260301000001_create_users_table.ts" },
    ]);

    const report = await runSeedBootstrapPrecheck({
      test: false,
      connectionNames: ["mysql"],
    });

    expect(report.clean).toBe(true);
    expect(report.checks).toHaveLength(1);
    expect(report.checks[0].clean).toBe(true);
    expect(report.checks[0].pendingMigrations).toEqual([]);
    expect(mockedCloseAllConnections).toHaveBeenCalled();
  });

  test("fails when pending migrations exist", async () => {
    setMigrationsDir("mysql", [
      "20260301000001_create_users_table.ts",
      "20260301000002_create_posts_table.ts",
    ]);
    adapter.query.mockResolvedValue([
      { name: "20260301000001_create_users_table.ts" },
    ]);

    const report = await runSeedBootstrapPrecheck({
      test: false,
      connectionNames: ["mysql"],
    });

    expect(report.clean).toBe(false);
    expect(report.checks[0].pendingMigrations).toEqual([
      "20260301000002_create_posts_table.ts",
    ]);
    expect(
      report.checks[0].reasons.some((reason) =>
        reason.includes("Pending migrations detected")
      )
    ).toBe(true);
  });

  test("fails when migrations table cannot be read", async () => {
    setMigrationsDir("mysql", ["20260301000001_create_users_table.ts"]);
    adapter.query.mockRejectedValue(new Error("relation \"migrations\" does not exist"));

    const report = await runSeedBootstrapPrecheck({
      test: false,
      connectionNames: ["mysql"],
    });

    expect(report.clean).toBe(false);
    expect(
      report.checks[0].reasons.some((reason) =>
        reason.includes("Unable to read migrations table")
      )
    ).toBe(true);
  });

  test("defaults to resolved connection and sets non-zero exitCode when assert fails", async () => {
    setMigrationsDir("mysql", ["20260301000001_create_users_table.ts"]);
    adapter.query.mockResolvedValue([]);

    const ok = await assertSeedBootstrapPrecheck({ test: false });

    expect(ok).toBe(false);
    expect(mockedResolveConnectionName).toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });
});
