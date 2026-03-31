import fs from "fs";
import path from "path";
import { PathMap } from "../cli/utils/PathMap.js";
import { migrateRun } from "../cli/commands/migrateRun.js";
import {
  closeAllConnections,
  getAdapter,
} from "../core/connection/ConnectionFactory.js";
import {
  acquireMigrationLock,
  computeMigrationChecksum,
  ensureMigrationTables,
  readLastBatch,
  recordAppliedMigration,
  releaseMigrationLock,
  validateMigrationHistory,
} from "../cli/utils/migrations/MigrationTracker.js";
import { loadModule } from "../cli/utils/typescript/tsRuntime.js";

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

describe("migrate:run empty-migration detection robustness", () => {
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
    adapter.execute.mockResolvedValue(undefined);

    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.exitCode = 0;
  });

  function mockMigrationFile(
    connectionName: string,
    fileName: string,
    fileContent: string
  ): void {
    const migrationsDir = PathMap.migrations(false, connectionName);

    jest.spyOn(fs, "existsSync").mockImplementation((target: fs.PathLike) => {
      if (path.resolve(String(target)) === migrationsDir) {
        return true;
      }
      return originalExistsSync(target);
    });

    jest.spyOn(fs, "readdirSync").mockImplementation((target: fs.PathLike) => {
      if (path.resolve(String(target)) === migrationsDir) {
        return [fileName] as unknown as ReturnType<typeof fs.readdirSync>;
      }
      return [] as unknown as ReturnType<typeof fs.readdirSync>;
    });

    jest.spyOn(fs, "readFileSync").mockImplementation((target: fs.PathOrFileDescriptor) => {
      if (typeof target === "string" && target.endsWith(fileName)) {
        return fileContent as never;
      }
      return originalReadFileSync(target) as never;
    });
  }

  test("applies migration when up() executes db.query using variable SQL", async () => {
    const connectionName = "mysql";
    const fileName = "202603060001_update_users_table.ts";
    mockMigrationFile(
      connectionName,
      fileName,
      `export async function up(db) { const sql = "CREATE TABLE users (id INT);"; await db.query(sql); }`
    );

    const up = jest.fn(async (db: { query(sql: string, params?: unknown[]): Promise<void> }) => {
      const sql = "CREATE TABLE users (id INT);";
      await db.query(sql);
    });
    mockedLoadModule.mockReturnValue({ up } as never);

    await migrateRun(false, undefined, false, false, {
      connectionNames: [connectionName as never],
    });

    expect(up).toHaveBeenCalled();
    expect(adapter.execute).toHaveBeenCalledWith("CREATE TABLE users (id INT);", []);
    expect(mockedRecordAppliedMigration).toHaveBeenCalledWith(
      adapter,
      fileName,
      1,
      "checksum"
    );
  });

  test("skips migration when up() executes no SQL statements", async () => {
    const connectionName = "mysql";
    const fileName = "202603060002_update_users_table.ts";
    mockMigrationFile(
      connectionName,
      fileName,
      `export async function up() { /* no-op */ }`
    );

    const up = jest.fn(async () => undefined);
    mockedLoadModule.mockReturnValue({ up } as never);

    await migrateRun(false, undefined, false, false, {
      connectionNames: [connectionName as never],
    });

    expect(up).toHaveBeenCalled();
    expect(adapter.execute).not.toHaveBeenCalled();
    expect(mockedRecordAppliedMigration).not.toHaveBeenCalled();
    expect(
      (console.log as jest.Mock).mock.calls.some((args) =>
        String(args[0]).includes(`Skipping empty migration: ${fileName}`)
      )
    ).toBe(true);
  });
});
