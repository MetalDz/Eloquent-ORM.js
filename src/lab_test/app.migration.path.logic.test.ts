import fs from "fs";
import path from "path";
import { PathMap } from "../cli/utils/PathMap.js";
import { migrateStatus } from "../cli/commands/migrateStatus.js";
import { resolveMigrationConnectionNames } from "../cli/commands/migrateRun.js";
import {
  getAdapter,
  closeAllConnections,
} from "../core/connection/ConnectionFactory.js";
import { resolveConnectionName } from "../core/connection/resolveConnectionName.js";

jest.mock("chalk", () => ({
  __esModule: true,
  default: {
    gray: (value: string) => value,
    yellow: (value: string) => value,
    cyan: (value: string) => value,
  },
}));

jest.mock("../core/connection/ConnectionFactory", () => ({
  getAdapter: jest.fn(),
  closeAllConnections: jest.fn(),
}));

jest.mock("../core/connection/resolveConnectionName", () => ({
  resolveConnectionName: jest.fn(),
}));

const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;
const mockedCloseAllConnections = closeAllConnections as jest.MockedFunction<
  typeof closeAllConnections
>;
const mockedResolveConnectionName =
  resolveConnectionName as jest.MockedFunction<typeof resolveConnectionName>;

describe("App migration path resolution", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test("PathMap resolves app migrations per connection", () => {
    expect(PathMap.migrations(false, "mysql")).toBe(
      path.resolve(process.cwd(), "src/app/database/migrations/mysql")
    );
    expect(PathMap.migrations(false, "pg")).toBe(
      path.resolve(process.cwd(), "src/app/database/migrations/pg")
    );
    expect(PathMap.migrations(false, "sqlite")).toBe(
      path.resolve(process.cwd(), "src/app/database/migrations/sqlite")
    );
  });

  test("resolveMigrationConnectionNames maps app and test flags correctly", () => {
    expect(resolveMigrationConnectionNames(false, { mysql: true })).toEqual(["mysql"]);
    expect(resolveMigrationConnectionNames(false, { pg: true })).toEqual(["pg"]);
    expect(resolveMigrationConnectionNames(false, { sqlite: true })).toEqual(["sqlite"]);
    expect(resolveMigrationConnectionNames(false, { allConnections: true })).toEqual([
      "mysql",
      "pg",
      "sqlite",
    ]);

    expect(resolveMigrationConnectionNames(true, { mysql: true })).toEqual(["mysql_test"]);
    expect(resolveMigrationConnectionNames(true, { pg: true })).toEqual(["pg_test"]);
    expect(resolveMigrationConnectionNames(true, { sqlite: true })).toEqual(["sqlite_test"]);
    expect(resolveMigrationConnectionNames(true, { allConnections: true })).toEqual([
      "mysql_test",
      "pg_test",
      "sqlite_test",
    ]);
  });

  test("resolveMigrationConnectionNames rejects conflicting explicit flags", () => {
    expect(() =>
      resolveMigrationConnectionNames(false, { mysql: true, pg: true })
    ).toThrow("Choose only one explicit connection flag or use --all-connections.");
  });

  test("migrateStatus reads the resolved app connection directory", async () => {
    const connectionName = "pg";
    const migrationsDir = PathMap.migrations(false, connectionName);
    const originalExistsSync = fs.existsSync;
    const existsSpy = jest
      .spyOn(fs, "existsSync")
      .mockImplementation((target: fs.PathLike) => {
        if (String(target) === migrationsDir) return true;
        return originalExistsSync(target);
      });
    const readdirSpy = jest
      .spyOn(fs, "readdirSync")
      .mockImplementation((target: fs.PathLike) => {
        if (String(target) !== migrationsDir) {
          return [];
        }
        return ["20260302083051002_create_users_table.ts"] as unknown as ReturnType<
          typeof fs.readdirSync
        >;
      });
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const consoleTableSpy = jest.spyOn(console, "table").mockImplementation(() => undefined);

    mockedResolveConnectionName.mockReturnValue(connectionName as never);
    mockedGetAdapter.mockResolvedValue({
      query: jest.fn().mockResolvedValue([]),
    } as never);
    mockedCloseAllConnections.mockResolvedValue(undefined);

    await migrateStatus(false);

    expect(mockedResolveConnectionName).toHaveBeenCalledWith(undefined, { test: false });
    expect(mockedGetAdapter).toHaveBeenCalledWith(connectionName);
    expect(existsSpy).toHaveBeenCalledWith(migrationsDir);
    expect(readdirSpy).toHaveBeenCalledWith(migrationsDir);
    expect(consoleLogSpy.mock.calls.some(([value]) => String(value).includes(connectionName))).toBe(
      true
    );
    expect(consoleTableSpy).toHaveBeenCalled();
    expect(mockedCloseAllConnections).toHaveBeenCalled();
  });
});
