import fs from "fs";
import os from "os";
import path from "path";
import type { ConnectionName } from "../core/connection/ConnectionFactory.js";

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
  sqlRows?: Array<{ name: string; batch: number; run_at: string | null }>;
  sqlError?: Error | null;
};

async function setupMigrateStatusHarness(options: MigrateStatusHarnessOptions = {}) {
  jest.resetModules();

  const connectionName = (options.connectionName ?? "sqlite_test") as ConnectionName;
  const driver = options.driver ?? "sqlite";
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-lts5-migratestatus-cont-"));
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
    if (options.sqlError && options.sqlRows === undefined) throw options.sqlError;
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

  const migrateStatusModule = await import("../cli/commands/migrateStatus.js");

  return {
    root,
    migrationsDir,
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

describe("LTS phase 5 migrateStatus continuation", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.resetModules();
    process.exitCode = 0;
  });

  test("continuation plan records the SQL-side Docker residual slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-MigrateStatus-Continuation-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 MigrateStatus Continuation Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("line `104`");
    expect(content).toContain("line `158`");
    expect(content).toContain(
      "src/lab_test/lts.phase5.migrate-status-continuation.logic.test.ts",
    );
    expect(content).toContain("Focused `migrateStatus.ts` Docker `v8` snapshot after this slice:");
  });

  test("covers SQL missing-directory short-circuit without opening adapters", async () => {
    const harness = await setupMigrateStatusHarness({
      connectionName: "sqlite_status_missing_dir" as ConnectionName,
      driver: "sqlite",
      createMigrationsDir: false,
    });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    await harness.migrateStatus({
      connectionNames: ["sqlite_status_missing_dir" as ConnectionName],
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("No migrations directory found for sqlite_status_missing_dir."),
    );
    expect(harness.mocks.getAdapter).not.toHaveBeenCalled();
    expect(harness.mocks.closeAllConnections).not.toHaveBeenCalled();

    fs.rmSync(harness.root, { recursive: true, force: true });
  });

  test("covers SQL file filtering, applied status mapping, and missing migrations-table fallback", async () => {
    const harness = await setupMigrateStatusHarness({
      connectionName: "sqlite_status_sql" as ConnectionName,
      driver: "sqlite",
      migrationFiles: [
        "202603220001_create_users.ts",
        "202603220002_create_posts.js",
        "README.md",
      ],
      sqlRows: [
        {
          name: "202603220001_create_users.ts",
          batch: 4,
          run_at: "2026-03-22T00:01:00.000Z",
        },
      ],
    });
    const tableSpy = jest.spyOn(console, "table").mockImplementation(() => undefined);
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    await harness.migrateStatus({
      connectionNames: ["sqlite_status_sql" as ConnectionName],
    });

    const rows = tableSpy.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(rows).toEqual([
      {
        Migration: "202603220001_create_users.ts",
        Status: "Applied",
        Batch: 4,
        RunAt: "2026-03-22T00:01:00.000Z",
      },
      {
        Migration: "202603220002_create_posts.js",
        Status: "Pending",
        Batch: "-",
        RunAt: "-",
      },
    ]);
    expect(rows.some((row) => row.Migration === "README.md")).toBe(false);
    expect(harness.mocks.closeAllConnections).toHaveBeenCalledTimes(1);

    harness.sqlDb.query.mockRejectedValueOnce(new Error("missing migrations table"));
    tableSpy.mockClear();
    await harness.migrateStatus({
      connectionNames: ["sqlite_status_sql" as ConnectionName],
    });

    expect(logSpy).toHaveBeenCalledWith("No migrations table found.");
    const fallbackRows = tableSpy.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(fallbackRows).toEqual([
      {
        Migration: "202603220001_create_users.ts",
        Status: "Pending",
        Batch: "-",
        RunAt: "-",
      },
      {
        Migration: "202603220002_create_posts.js",
        Status: "Pending",
        Batch: "-",
        RunAt: "-",
      },
    ]);

    fs.rmSync(harness.root, { recursive: true, force: true });
  });

  test("covers SQL outer failure handling plus boolean option normalization and default connection resolution", async () => {
    const harness = await setupMigrateStatusHarness({
      connectionName: "sqlite_status_default" as ConnectionName,
      driver: "sqlite",
      migrationFiles: ["202603220003_create_fail.ts"],
    });
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    harness.mocks.getAdapter.mockRejectedValueOnce(new Error("adapter exploded"));
    await harness.migrateStatus(true);

    expect(harness.mocks.resolveConnectionName).toHaveBeenCalledWith(undefined, { test: true });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch migration status for "sqlite_status_default".'),
    );
    expect(process.exitCode).toBe(1);
    expect(harness.mocks.closeAllConnections).toHaveBeenCalledTimes(1);

    fs.rmSync(harness.root, { recursive: true, force: true });
  });
});
