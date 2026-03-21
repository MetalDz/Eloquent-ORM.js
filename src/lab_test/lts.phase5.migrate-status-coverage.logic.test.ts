import fs from "fs";
import os from "os";
import path from "path";
import type { ConnectionName } from "../core/connection/ConnectionFactory";

const passthroughChalk = {
  __esModule: true,
  default: {
    yellow: (value: string) => value,
    gray: (value: string) => value,
    cyan: (value: string) => value,
    red: (value: string) => value,
  },
};

type MongoAppliedRow = {
  name: string;
  batch: number;
  run_at: string;
};

type MigrateStatusHarnessOptions = {
  connectionName?: ConnectionName;
  driver?: string;
  migrationFiles?: string[];
  createMigrationsDir?: boolean;
  mongoAppliedRows?: MongoAppliedRow[];
  omitGetConnection?: boolean;
  omitConnectionConfig?: boolean;
  mongoError?: Error | null;
  closeError?: Error | null;
  sqlRows?: Array<{ name: string; batch: number; run_at: string }>;
  sqlError?: Error | null;
};

async function setupMigrateStatusHarness(options: MigrateStatusHarnessOptions = {}) {
  jest.resetModules();

  const connectionName = (options.connectionName ?? "mongo") as ConnectionName;
  const driver = options.driver ?? "mongo";
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-lts5-migratestatus-"));
  const migrationsDir = path.join(root, String(connectionName));

  if (options.createMigrationsDir !== false) {
    fs.mkdirSync(migrationsDir, { recursive: true });
    for (const fileName of options.migrationFiles ?? []) {
      fs.writeFileSync(path.join(migrationsDir, fileName), "// migration fixture\n", "utf8");
    }
  }

  const mongoDb = { tag: `${connectionName}-db` };
  const sqlDb = {
    query: jest.fn(async () => {
      if (options.sqlError) throw options.sqlError;
      return options.sqlRows ?? [];
    }),
  };
  const getAdapter = jest.fn(async () => {
    if (driver === "mongo") {
      if (options.mongoError) throw options.mongoError;
      return mongoDb;
    }
    if (options.sqlError) throw options.sqlError;
    return sqlDb;
  });
  const getConnection = options.omitGetConnection
    ? undefined
    : jest.fn(async () => {
        if (options.mongoError) throw options.mongoError;
        return mongoDb;
      });
  const closeAllConnections = jest.fn(async () => {
    if (options.closeError) throw options.closeError;
  });
  const resolveConnectionName = jest.fn(() => connectionName);
  const ensureMigrationCollection = jest.fn(async () => {
    if (options.mongoError) throw options.mongoError;
  });
  const readAppliedMigrations = jest.fn(async () => options.mongoAppliedRows ?? []);

  jest.doMock("chalk", () => passthroughChalk);
  jest.doMock("../config/database", () => ({
    dbConfig: {
      connections: options.omitConnectionConfig
        ? {}
        : {
            [connectionName]: {
              driver,
            },
          },
    },
  }));
  jest.doMock("../cli/utils/PathMap", () => ({
    PathMap: {
      migrations: () => migrationsDir,
    },
  }));
  jest.doMock("../core/connection/ConnectionFactory", () => ({
    getAdapter,
    ...(getConnection ? { getConnection } : {}),
    closeAllConnections,
  }));
  jest.doMock("../core/connection/resolveConnectionName", () => ({
    resolveConnectionName,
  }));
  jest.doMock("../cli/utils/migrations/MongoMigrationTracker", () => ({
    ensureMigrationCollection,
    readAppliedMigrations,
  }));

  const migrateStatusModule = await import("../cli/commands/migrateStatus");

  return {
    root,
    migrationsDir,
    mongoDb,
    sqlDb,
    migrateStatus: migrateStatusModule.migrateStatus,
    mocks: {
      getAdapter,
      getConnection,
      closeAllConnections,
      resolveConnectionName,
      ensureMigrationCollection,
      readAppliedMigrations,
    },
  };
}

describe("LTS phase 5 migrateStatus coverage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.resetModules();
    process.exitCode = 0;
  });

  test("plan tracks the dedicated migrateStatus coverage slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-MigrateStatus-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 MigrateStatus Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/commands/migrateStatus.ts");
    expect(content).toContain(
      "src/lab_test/lts.phase5.migrate-status-coverage.logic.test.ts",
    );
  });

  test("covers Mongo getConnection fallback via getAdapter and applied batch/run_at mapping", async () => {
    const appliedFile = "202603150201_create_users.ts";
    const pendingFile = "202603150202_create_posts.js";
    const harness = await setupMigrateStatusHarness({
      connectionName: "mongo_status_fallback" as ConnectionName,
      omitGetConnection: true,
      migrationFiles: [appliedFile, pendingFile],
      mongoAppliedRows: [
        {
          name: appliedFile,
          batch: 6,
          run_at: "2026-03-15T02:01:00.000Z",
        },
      ],
    });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const tableSpy = jest.spyOn(console, "table").mockImplementation(() => undefined);

    await harness.migrateStatus({
      connectionNames: ["mongo_status_fallback" as ConnectionName],
    });

    expect(harness.mocks.getConnection).toBeUndefined();
    expect(harness.mocks.getAdapter).toHaveBeenCalledWith("mongo_status_fallback");
    expect(harness.mocks.ensureMigrationCollection).toHaveBeenCalledWith(harness.mongoDb);
    expect(harness.mocks.readAppliedMigrations).toHaveBeenCalledWith(harness.mongoDb);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Connected to mongo_status_fallback."),
    );
    expect(tableSpy).toHaveBeenCalledTimes(1);

    const rows = tableSpy.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Migration: appliedFile,
          Status: "Applied",
          Batch: 6,
          RunAt: "2026-03-15T02:01:00.000Z",
        }),
        expect.objectContaining({
          Migration: pendingFile,
          Status: "Pending",
          Batch: "-",
          RunAt: "-",
        }),
      ]),
    );
    expect(harness.mocks.closeAllConnections).toHaveBeenCalledTimes(1);

    fs.rmSync(harness.root, { recursive: true, force: true });
  });

  test("covers Mongo missing-directory and unsupported-driver skip branches", async () => {
    const missingHarness = await setupMigrateStatusHarness({
      connectionName: "mongo_status_missing" as ConnectionName,
      createMigrationsDir: false,
    });
    const unsupportedHarness = await setupMigrateStatusHarness({
      connectionName: "legacy_status" as ConnectionName,
      driver: "oracle",
    });

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    await missingHarness.migrateStatus({
      connectionNames: ["mongo_status_missing" as ConnectionName],
    });
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("No migrations directory found for mongo_status_missing."),
    );
    expect(missingHarness.mocks.getAdapter).not.toHaveBeenCalled();
    expect(missingHarness.mocks.getConnection).not.toHaveBeenCalled();
    expect(missingHarness.mocks.closeAllConnections).not.toHaveBeenCalled();

    await unsupportedHarness.migrateStatus({
      connectionNames: ["legacy_status" as ConnectionName],
    });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Status skipped: "legacy_status" has unsupported driver "oracle".',
      ),
    );
    expect(unsupportedHarness.mocks.getAdapter).not.toHaveBeenCalled();
    expect(unsupportedHarness.mocks.closeAllConnections).not.toHaveBeenCalled();

    fs.rmSync(missingHarness.root, { recursive: true, force: true });
    fs.rmSync(unsupportedHarness.root, { recursive: true, force: true });
  });

  test("covers connection-name driver fallback when config entry is absent", async () => {
    const harness = await setupMigrateStatusHarness({
      connectionName: "legacy_status_fallback" as ConnectionName,
      omitConnectionConfig: true,
    });
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    await harness.migrateStatus({
      connectionNames: ["legacy_status_fallback" as ConnectionName],
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Status skipped: "legacy_status_fallback" has unsupported driver "legacy_status_fallback".',
      ),
    );
    expect(harness.mocks.getAdapter).not.toHaveBeenCalled();
    expect(harness.mocks.closeAllConnections).not.toHaveBeenCalled();

    fs.rmSync(harness.root, { recursive: true, force: true });
  });

  test("covers Mongo failure handling, cleanup, and exitCode propagation", async () => {
    const mongoError = new Error("mongo status failure");
    const harness = await setupMigrateStatusHarness({
      connectionName: "mongo_status_fail" as ConnectionName,
      migrationFiles: ["202603150203_create_fail.ts"],
      mongoError,
    });
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    await harness.migrateStatus({
      connectionNames: ["mongo_status_fail" as ConnectionName],
    });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch migration status for "mongo_status_fail".'),
    );
    expect(errorSpy).toHaveBeenCalledWith(mongoError);
    expect(harness.mocks.closeAllConnections).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(1);

    fs.rmSync(harness.root, { recursive: true, force: true });
  });

  test("cleanup failures propagate from Mongo and SQL finally blocks", async () => {
    const mongoHarness = await setupMigrateStatusHarness({
      connectionName: "mongo_status_close_fail" as ConnectionName,
      migrationFiles: ["202603150204_create_fail.ts"],
      closeError: new Error("mongo close failed"),
    });

    await expect(
      mongoHarness.migrateStatus({
        connectionNames: ["mongo_status_close_fail" as ConnectionName],
      }),
    ).rejects.toThrow("mongo close failed");
    expect(mongoHarness.mocks.closeAllConnections).toHaveBeenCalledTimes(1);
    fs.rmSync(mongoHarness.root, { recursive: true, force: true });

    const sqlHarness = await setupMigrateStatusHarness({
      connectionName: "sqlite_status_close_fail" as ConnectionName,
      driver: "sqlite",
      migrationFiles: ["202603150205_create_users.ts"],
      sqlRows: [],
      closeError: new Error("sql close failed"),
    });

    await expect(
      sqlHarness.migrateStatus({
        connectionNames: ["sqlite_status_close_fail" as ConnectionName],
      }),
    ).rejects.toThrow("sql close failed");
    expect(sqlHarness.sqlDb.query).toHaveBeenCalledWith(
      "SELECT name, batch, run_at FROM migrations ORDER BY batch, id",
    );
    expect(sqlHarness.mocks.closeAllConnections).toHaveBeenCalledTimes(1);
    fs.rmSync(sqlHarness.root, { recursive: true, force: true });
  });
});
