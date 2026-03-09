import fs from "fs";
import path from "path";
import { dbConfig } from "../config/database";
import { migrateRun } from "../cli/commands/migrateRun";
import { PathMap } from "../cli/utils/PathMap";
import { resolveConnectionName } from "../core/connection/resolveConnectionName";
import {
  closeAllConnections,
  getAdapter,
} from "../core/connection/ConnectionFactory";
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
import { appendAuditEvent } from "../cli/utils/AuditTrail";

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

jest.mock("../cli/utils/AuditTrail", () => ({
  appendAuditEvent: jest.fn(),
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
const mockedAppendAuditEvent = appendAuditEvent as jest.MockedFunction<typeof appendAuditEvent>;

describe("Branch coverage 100% - phase 20 migrateRun default/empty SQL branches", () => {
  const adapter = {
    execute: jest.fn<Promise<void>, [string, unknown[]?]>(),
  };
  const originalExistsSync = fs.existsSync;
  const originalReaddirSync = fs.readdirSync;
  const originalConnections = dbConfig.connections;
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    jest.clearAllMocks();
    process.exitCode = 0;
    process.env.ELOQUENT_CLI = "true";

    (dbConfig as { connections: unknown }).connections = {
      ...(originalConnections as Record<string, unknown>),
    };

    mockedResolveConnectionName.mockReturnValue("sqlite" as never);
    mockedGetAdapter.mockResolvedValue(adapter as never);
    mockedCloseAllConnections.mockResolvedValue(undefined);
    mockedEnsureMigrationTables.mockResolvedValue("sqlite");
    mockedAcquireMigrationLock.mockResolvedValue(undefined);
    mockedReleaseMigrationLock.mockResolvedValue(undefined);
    mockedValidateMigrationHistory.mockResolvedValue([]);
    mockedReadLastBatch.mockResolvedValue(0);
    mockedRecordAppliedMigration.mockResolvedValue(undefined);
    mockedComputeMigrationChecksum.mockReturnValue("checksum");
    mockedAppendAuditEvent.mockImplementation(() => undefined);
    adapter.execute.mockResolvedValue(undefined);

    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (dbConfig as { connections: unknown }).connections = originalConnections;
    process.exitCode = originalExitCode;
    delete process.env.ELOQUENT_CLI;
  });

  function mockMigrationDirectory(connectionName: string, files: string[]): void {
    const dir = PathMap.migrations(false, connectionName);

    jest.spyOn(fs, "existsSync").mockImplementation((target: fs.PathLike) => {
      const normalized = path.resolve(String(target));
      if (normalized === path.resolve(dir)) {
        return true;
      }
      return originalExistsSync(target);
    });

    jest.spyOn(fs as any, "readdirSync").mockImplementation((target: any) => {
      const normalized = path.resolve(String(target));
      if (normalized === path.resolve(dir)) {
        return files as unknown as ReturnType<typeof fs.readdirSync>;
      }
      return originalReaddirSync(target);
    });
  }

  test("default migrateRun() flow handles js files and skips blank SQL statements", async () => {
    const connection = "sqlite";
    (dbConfig.connections as Record<string, { driver?: string }>)[connection] = {
      driver: "sqlite",
    };
    mockMigrationDirectory(connection, [
      "20260309001_update_users_table.js",
      "README.md",
    ]);

    mockedLoadModule.mockReturnValue({
      up: jest.fn(async (db: { query(sql: string): Promise<void> }) => {
        await db.query("   ");
      }),
    } as never);
    process.exitCode = undefined;

    jest
      .spyOn(global, "setImmediate")
      .mockImplementation(((cb: (...args: unknown[]) => void, ...args: unknown[]) => {
        cb(...args);
        return 0 as never;
      }) as never);
    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);

    await migrateRun();

    expect(mockedLoadModule.mock.calls[0]?.[0]).toEqual(
      expect.stringContaining("20260309001_update_users_table.js")
    );
    expect(adapter.execute).not.toHaveBeenCalled();
    expect(mockedRecordAppliedMigration).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Skipping empty migration: 20260309001_update_users_table.js")
    );
    expect(mockedReleaseMigrationLock).toHaveBeenCalledWith(
      adapter,
      expect.any(String),
      expect.objectContaining({ success: true })
    );
    expect(mockedAppendAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ result: "success", connectionName: connection })
    );
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  test("model-targeted run exits early when no files match model filter", async () => {
    const connection = "sqlite";
    (dbConfig.connections as Record<string, { driver?: string }>)[connection] = {
      driver: "sqlite",
    };
    mockMigrationDirectory(connection, ["20260309001_create_users_table.ts"]);
    mockedLoadModule.mockReturnValue({ up: jest.fn(async () => undefined) } as never);

    await migrateRun(false, "Post", false, false, {
      connectionNames: [connection as never],
    });

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("No migrations found for model: Post")
    );
    expect(mockedLoadModule).not.toHaveBeenCalled();
    expect(mockedReleaseMigrationLock).toHaveBeenCalledWith(
      adapter,
      expect.any(String),
      expect.objectContaining({ success: true })
    );
  });

  test("model-targeted run continues when files match model filter", async () => {
    const connection = "sqlite";
    (dbConfig.connections as Record<string, { driver?: string }>)[connection] = {
      driver: "sqlite",
    };
    mockMigrationDirectory(connection, ["20260309001_create_posts_table.ts"]);
    mockedLoadModule.mockReturnValue({
      up: jest.fn(async (db: { query(sql: string, params?: unknown[]): Promise<void> }) => {
        await db.query("CREATE TABLE posts(id INTEGER)", []);
      }),
    } as never);

    await migrateRun(false, "Post", false, false, {
      connectionNames: [connection as never],
    });

    expect(mockedLoadModule).toHaveBeenCalledTimes(1);
    expect(mockedRecordAppliedMigration).toHaveBeenCalledTimes(1);
    expect(mockedAppendAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ result: "success", connectionName: connection })
    );
  });
});
