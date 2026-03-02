import fs from "fs";
import path from "path";
import { PathMap } from "../cli/utils/PathMap";
import { migrateRun } from "../cli/commands/migrateRun";
import {
  closeAllConnections,
  getAdapter,
} from "../core/connection/ConnectionFactory";
import { resolveConnectionName } from "../core/connection/resolveConnectionName";
import {
  acquireMigrationLock,
  computeMigrationChecksum,
  ensureMigrationTables,
  readLastBatch,
  recordAppliedMigration,
  releaseMigrationLock,
  validateMigrationHistory,
} from "../cli/utils/migrations/MigrationTracker";
import { loadModule } from "../cli/utils/typescript/tsRuntime";

jest.mock("chalk", () => ({
  __esModule: true,
  default: {
    gray: (value: string) => value,
    yellow: (value: string) => value,
    cyan: (value: string) => value,
    green: (value: string) => value,
    greenBright: (value: string) => value,
    red: (value: string) => value,
  },
}));

jest.mock("../core/connection/ConnectionFactory", () => ({
  getAdapter: jest.fn(),
  closeAllConnections: jest.fn(),
}));

jest.mock("../core/connection/resolveConnectionName", () => ({
  resolveConnectionName: jest.fn(),
}));

jest.mock("../cli/utils/migrations/MigrationTracker", () => ({
  acquireMigrationLock: jest.fn(),
  computeMigrationChecksum: jest.fn(),
  ensureMigrationTables: jest.fn(),
  readLastBatch: jest.fn(),
  recordAppliedMigration: jest.fn(),
  releaseMigrationLock: jest.fn(),
  validateMigrationHistory: jest.fn(),
}));

jest.mock("../cli/utils/typescript/tsRuntime", () => ({
  loadModule: jest.fn(),
}));

const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;
const mockedCloseAllConnections =
  closeAllConnections as jest.MockedFunction<typeof closeAllConnections>;
const mockedResolveConnectionName =
  resolveConnectionName as jest.MockedFunction<typeof resolveConnectionName>;
const mockedAcquireMigrationLock =
  acquireMigrationLock as jest.MockedFunction<typeof acquireMigrationLock>;
const mockedComputeMigrationChecksum =
  computeMigrationChecksum as jest.MockedFunction<typeof computeMigrationChecksum>;
const mockedEnsureMigrationTables =
  ensureMigrationTables as jest.MockedFunction<typeof ensureMigrationTables>;
const mockedReadLastBatch = readLastBatch as jest.MockedFunction<typeof readLastBatch>;
const mockedRecordAppliedMigration =
  recordAppliedMigration as jest.MockedFunction<typeof recordAppliedMigration>;
const mockedReleaseMigrationLock =
  releaseMigrationLock as jest.MockedFunction<typeof releaseMigrationLock>;
const mockedValidateMigrationHistory =
  validateMigrationHistory as jest.MockedFunction<typeof validateMigrationHistory>;
const mockedLoadModule = loadModule as jest.MockedFunction<typeof loadModule>;

describe("migrate:run behavior", () => {
  const originalExistsSync = fs.existsSync;
  const originalReadFileSync = fs.readFileSync;
  const adapter = {
    execute: jest.fn<Promise<void>, [string, unknown[]?]>(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.exitCode = 0;

    mockedGetAdapter.mockResolvedValue(adapter as never);
    mockedCloseAllConnections.mockResolvedValue(undefined);
    mockedEnsureMigrationTables.mockResolvedValue("mysql");
    mockedAcquireMigrationLock.mockResolvedValue(undefined);
    mockedReleaseMigrationLock.mockResolvedValue(undefined);
    mockedValidateMigrationHistory.mockResolvedValue([]);
    mockedReadLastBatch.mockResolvedValue(0);
    mockedRecordAppliedMigration.mockResolvedValue(undefined);
    mockedComputeMigrationChecksum.mockReturnValue("checksum");
    mockedLoadModule.mockReturnValue({
      up: jest.fn().mockResolvedValue(undefined),
    } as never);
    adapter.execute.mockResolvedValue(undefined);

    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.exitCode = 0;
  });

  function mockMigrationFiles(
    connectionNames: string[],
    fileName = "202603020001_create_users_table.ts"
  ): void {
    const dirSet = new Set(connectionNames.map((name) => PathMap.migrations(name.endsWith("_test"), name)));

    jest.spyOn(fs, "existsSync").mockImplementation((target: fs.PathLike) => {
      const normalized = path.resolve(String(target));
      if (dirSet.has(normalized)) {
        return true;
      }
      return originalExistsSync(target);
    });

    jest.spyOn(fs, "readdirSync").mockImplementation((target: fs.PathLike) => {
      const normalized = path.resolve(String(target));
      if (dirSet.has(normalized)) {
        return [fileName] as unknown as ReturnType<typeof fs.readdirSync>;
      }
      return [] as unknown as ReturnType<typeof fs.readdirSync>;
    });

    jest.spyOn(fs, "readFileSync").mockImplementation((target: fs.PathOrFileDescriptor) => {
      if (typeof target === "string" && target.endsWith(fileName)) {
        return "await db.query(`CREATE TABLE users (id INT);`);" as never;
      }
      return originalReadFileSync(target) as never;
    });
  }

  test("runs migrations for the resolved default connection", async () => {
    const connectionName = "mysql";
    const fileName = "202603020001_create_users_table.ts";
    mockMigrationFiles([connectionName], fileName);
    mockedResolveConnectionName.mockReturnValue(connectionName as never);

    const up = jest.fn().mockResolvedValue(undefined);
    mockedLoadModule.mockReturnValue({ up } as never);

    await migrateRun(false, undefined, false, false);

    expect(mockedResolveConnectionName).toHaveBeenCalledWith(undefined, { test: false });
    expect(mockedGetAdapter).toHaveBeenCalledWith(connectionName);
    expect(up).toHaveBeenCalled();
    expect(mockedRecordAppliedMigration).toHaveBeenCalledWith(
      adapter,
      fileName,
      1,
      "checksum"
    );
    expect(mockedCloseAllConnections).toHaveBeenCalledTimes(1);
  });

  test("runs all targeted connections in order", async () => {
    const connections = ["mysql_test", "pg_test", "sqlite_test"] as const;
    mockMigrationFiles([...connections]);

    await migrateRun(true, undefined, false, false, {
      connectionNames: [...connections],
    });

    expect(mockedGetAdapter.mock.calls.map(([name]) => name)).toEqual([...connections]);
    expect(mockedEnsureMigrationTables).toHaveBeenCalledTimes(3);
    expect(mockedCloseAllConnections).toHaveBeenCalledTimes(3);
    expect(process.exitCode).toBe(0);
  });

  test("dry run skips lock, db execute, and applied migration records", async () => {
    const connectionName = "pg";
    mockMigrationFiles([connectionName]);

    const up = jest.fn(async (db: { query(sql: string, params?: unknown[]): Promise<void> }) => {
      await db.query("CREATE TABLE users (id INT);");
    });
    mockedLoadModule.mockReturnValue({ up } as never);

    await migrateRun(false, undefined, true, false, {
      connectionNames: [connectionName],
    });

    expect(up).toHaveBeenCalled();
    expect(adapter.execute).not.toHaveBeenCalled();
    expect(mockedAcquireMigrationLock).not.toHaveBeenCalled();
    expect(mockedRecordAppliedMigration).not.toHaveBeenCalled();
    expect(mockedReleaseMigrationLock).not.toHaveBeenCalled();
  });

  test("continues all-connections execution and sets non-zero exitCode on partial failure", async () => {
    const fileName = "202603020001_create_users_table.ts";
    const connections = ["mysql_test", "pg_test", "sqlite_test"] as const;
    mockMigrationFiles([...connections], fileName);

    mockedValidateMigrationHistory.mockImplementation(async (_db, migrationsDir) => {
      if (String(migrationsDir).includes(`${path.sep}pg_test`)) {
        throw new Error("checksum mismatch");
      }
      return [];
    });

    await migrateRun(true, undefined, false, false, {
      connectionNames: [...connections],
    });

    expect(mockedGetAdapter.mock.calls.map(([name]) => name)).toEqual([...connections]);
    expect(mockedCloseAllConnections).toHaveBeenCalledTimes(3);
    expect(process.exitCode).toBe(1);
  });
});
