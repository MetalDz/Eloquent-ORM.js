import fs from "fs";
import path from "path";
import { PathMap } from "../cli/utils/PathMap";
import { dbConfig } from "../config/database";
import { migrateRun } from "../cli/commands/migrateRun";
import {
  closeAllConnections,
  getConnection,
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
import { appendAuditEvent } from "../cli/utils/AuditTrail";
import { loadModule } from "../cli/utils/typescript/tsRuntime";
import {
  acquireMigrationLock as acquireMongoMigrationLock,
  ensureMigrationCollection,
  readLastBatch as readLastMongoBatch,
  recordAppliedMigration as recordMongoAppliedMigration,
  releaseMigrationLock as releaseMongoMigrationLock,
  validateMigrationHistory as validateMongoMigrationHistory,
} from "../cli/utils/migrations/MongoMigrationTracker";

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
  getConnection: jest.fn(),
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

jest.mock("../cli/utils/AuditTrail", () => ({
  appendAuditEvent: jest.fn(),
}));

jest.mock("../cli/utils/typescript/tsRuntime", () => ({
  loadModule: jest.fn(),
}));

jest.mock("../cli/utils/migrations/MongoMigrationTracker", () => ({
  acquireMigrationLock: jest.fn(),
  ensureMigrationCollection: jest.fn(),
  readLastBatch: jest.fn(),
  recordAppliedMigration: jest.fn(),
  releaseMigrationLock: jest.fn(),
  validateMigrationHistory: jest.fn(),
}));

const mockedGetAdapter = getAdapter as jest.MockedFunction<typeof getAdapter>;
const mockedGetConnection = getConnection as jest.MockedFunction<typeof getConnection>;
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
const mockedAppendAuditEvent = appendAuditEvent as jest.MockedFunction<typeof appendAuditEvent>;
const mockedLoadModule = loadModule as jest.MockedFunction<typeof loadModule>;
const mockedAcquireMongoMigrationLock =
  acquireMongoMigrationLock as jest.MockedFunction<typeof acquireMongoMigrationLock>;
const mockedEnsureMigrationCollection =
  ensureMigrationCollection as jest.MockedFunction<typeof ensureMigrationCollection>;
const mockedReadLastMongoBatch =
  readLastMongoBatch as jest.MockedFunction<typeof readLastMongoBatch>;
const mockedRecordMongoAppliedMigration =
  recordMongoAppliedMigration as jest.MockedFunction<typeof recordMongoAppliedMigration>;
const mockedReleaseMongoMigrationLock =
  releaseMongoMigrationLock as jest.MockedFunction<typeof releaseMongoMigrationLock>;
const mockedValidateMongoMigrationHistory =
  validateMongoMigrationHistory as jest.MockedFunction<typeof validateMongoMigrationHistory>;

describe("Branch coverage 100% - phase 7 migrateRun edge paths", () => {
  const adapter = {
    execute: jest.fn<Promise<void>, [string, unknown[]?]>(),
  };
  const originalExistsSync = fs.existsSync;
  const originalReaddirSync = fs.readdirSync;
  const originalDbConnections = dbConfig.connections;

  beforeEach(() => {
    jest.clearAllMocks();
    process.exitCode = 0;
    delete process.env.ELOQUENT_DEBUG;
    delete process.env.ELOQUENT_CLI;

    (dbConfig as { connections: unknown }).connections = {
      ...(originalDbConnections as Record<string, unknown>),
    };

    mockedResolveConnectionName.mockReturnValue("sqlite" as never);
    mockedGetAdapter.mockResolvedValue(adapter as never);
    mockedGetConnection.mockResolvedValue({} as never);
    mockedCloseAllConnections.mockResolvedValue(undefined);
    mockedEnsureMigrationTables.mockResolvedValue("sqlite");
    mockedAcquireMigrationLock.mockResolvedValue(undefined);
    mockedReleaseMigrationLock.mockResolvedValue(undefined);
    mockedValidateMigrationHistory.mockResolvedValue([]);
    mockedReadLastBatch.mockResolvedValue(0);
    mockedRecordAppliedMigration.mockResolvedValue(undefined);
    mockedComputeMigrationChecksum.mockReturnValue("checksum");
    mockedAppendAuditEvent.mockImplementation(() => undefined);
    mockedEnsureMigrationCollection.mockResolvedValue(undefined);
    mockedAcquireMongoMigrationLock.mockResolvedValue(undefined);
    mockedReleaseMongoMigrationLock.mockResolvedValue(undefined);
    mockedValidateMongoMigrationHistory.mockResolvedValue([]);
    mockedReadLastMongoBatch.mockResolvedValue(0);
    mockedRecordMongoAppliedMigration.mockResolvedValue(undefined);
    mockedLoadModule.mockReturnValue({
      up: jest.fn(async (db: { query(sql: string): Promise<void> }) => {
        await db.query("CREATE TABLE users (id INT);");
      }),
    } as never);
    adapter.execute.mockResolvedValue(undefined);

    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.exitCode = 0;
    delete process.env.ELOQUENT_DEBUG;
    delete process.env.ELOQUENT_CLI;
    (dbConfig as { connections: unknown }).connections = originalDbConnections;
  });

  function mockMigrationsDir(
    connectionName: string,
    options: { exists?: boolean; files?: string[] } = {}
  ): void {
    const dir = PathMap.migrations(connectionName.endsWith("_test"), connectionName);
    const exists = options.exists ?? true;
    const files = options.files ?? [];

    jest.spyOn(fs, "existsSync").mockImplementation((target: fs.PathLike) => {
      const normalized = path.resolve(String(target));
      if (normalized === path.resolve(dir)) {
        return exists;
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

  test("returns early when migrations directory is missing", async () => {
    const connection = "sqlite_missing";
    (dbConfig.connections as Record<string, { driver?: string }>)[connection] = {
      driver: "sqlite",
    };
    mockMigrationsDir(connection, { exists: false });

    await migrateRun(false, undefined, false, false, {
      connectionNames: [connection as never],
    });

    expect(mockedGetAdapter).not.toHaveBeenCalled();
    expect(mockedEnsureMigrationTables).not.toHaveBeenCalled();
    expect(mockedAppendAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ connectionName: connection, result: "success" })
    );
  });

  test("runs mongo migrations via mongo tracker path without SQL adapter", async () => {
    const connection = "mongo_sidecar";
    (dbConfig.connections as Record<string, { driver?: string }>)[connection] = {
      driver: "mongo",
    };
    mockMigrationsDir(connection, { files: ["20260308001_create_users_table.ts"] });
    mockedLoadModule.mockReturnValue({
      up: jest.fn(async () => undefined),
    } as never);

    await migrateRun(false, undefined, false, false, {
      connectionNames: [connection as never],
    });

    expect(mockedGetConnection).toHaveBeenCalledWith(connection);
    expect(mockedEnsureMigrationCollection).toHaveBeenCalled();
    expect(mockedGetAdapter).not.toHaveBeenCalledWith(connection);
  });

  test("handles model-targeted run with no matching files", async () => {
    const connection = "sqlite_model_target";
    (dbConfig.connections as Record<string, { driver?: string }>)[connection] = {
      driver: "sqlite",
    };
    mockMigrationsDir(connection, {
      files: ["20260308001_create_users_table.ts"],
    });

    await migrateRun(false, "Post", false, false, {
      connectionNames: [connection as never],
    });

    expect(mockedGetAdapter).toHaveBeenCalledWith(connection);
    expect(mockedAcquireMigrationLock).toHaveBeenCalledTimes(1);
    expect(mockedReleaseMigrationLock).toHaveBeenCalledWith(
      adapter,
      expect.any(String),
      expect.objectContaining({ success: true })
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("No migrations found for model: Post")
    );
  });

  test("logs and exits early when there are no pending migrations", async () => {
    const connection = "sqlite_pending_none";
    const file = "20260308001_create_users_table.ts";
    (dbConfig.connections as Record<string, { driver?: string }>)[connection] = {
      driver: "sqlite",
    };
    mockMigrationsDir(connection, { files: [file] });
    mockedValidateMigrationHistory.mockResolvedValue([
      {
        id: 1,
        name: file,
        batch: 1,
        checksum: "same",
        run_at: new Date().toISOString(),
      },
    ]);

    await migrateRun(false, undefined, false, false, {
      connectionNames: [connection as never],
    });

    expect(mockedRecordAppliedMigration).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("No new migrations to run"));
  });

  test("skips invalid migration modules that do not export up()", async () => {
    const connection = "sqlite_invalid_migration";
    const file = "20260308001_create_users_table.ts";
    (dbConfig.connections as Record<string, { driver?: string }>)[connection] = {
      driver: "sqlite",
    };
    mockMigrationsDir(connection, { files: [file] });
    mockedLoadModule.mockReturnValue({} as never);

    await migrateRun(false, undefined, false, false, {
      connectionNames: [connection as never],
    });

    expect(mockedRecordAppliedMigration).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining(`Invalid migration: ${file}`));
  });

  test("covers debug logs and CLI exit callback branch", async () => {
    const connection = "sqlite_debug";
    (dbConfig.connections as Record<string, { driver?: string }>)[connection] = {
      driver: "sqlite",
    };
    process.env.ELOQUENT_DEBUG = "true";
    process.env.ELOQUENT_CLI = "true";

    mockMigrationsDir(connection, { files: [] });
    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);

    await migrateRun(false, undefined, true, true, {
      connectionNames: [connection as never],
    });
    await new Promise((resolve) => setImmediate(resolve));

    expect(console.log).toHaveBeenCalledWith("[migrate:run] start", {
      isTest: false,
      modelName: undefined,
      dryRun: true,
      connectionNames: [connection],
    });
    expect(console.log).toHaveBeenCalledWith("[migrate:run] connectionName", connection);
    expect(console.log).toHaveBeenCalledWith("[migrate:run] before getAdapter");
    expect(console.log).toHaveBeenCalledWith("[migrate:run] after getAdapter");
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
