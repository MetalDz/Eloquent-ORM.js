import fs from "fs";
import os from "os";
import path from "path";
import type { ConnectionName } from "../core/connection/ConnectionFactory";

const passthroughChalk = {
  __esModule: true,
  default: {
    gray: (value: string) => value,
    yellow: (value: string) => value,
    cyan: (value: string) => value,
    green: (value: string) => value,
    greenBright: (value: string) => value,
    red: (value: string) => value,
  },
};

type AppliedRow = {
  id?: string | number;
  name: string;
  batch: number;
  checksum?: string;
};

type MigrateRunHarnessOptions = {
  connectionName?: ConnectionName;
  driver?: string;
  migrationFiles?: string[];
  mongoAppliedRows?: AppliedRow[];
  sqlAppliedRows?: AppliedRow[];
  existingCollections?: string[];
  loadModuleImpl?: (modulePath: string) => unknown;
  omitGetConnection?: boolean;
  omitConnectionConfig?: boolean;
  createMigrationsDir?: boolean;
};

async function setupMigrateRunHarness(options: MigrateRunHarnessOptions = {}) {
  jest.resetModules();

  const connectionName = (options.connectionName ?? "sqlite_test") as ConnectionName;
  const driver = options.driver ?? "sqlite";
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-lts5-migraterun-cont-"));
  const migrationsDir = path.join(root, String(connectionName));

  if (options.createMigrationsDir !== false) {
    fs.mkdirSync(migrationsDir, { recursive: true });
    for (const fileName of options.migrationFiles ?? []) {
      fs.writeFileSync(path.join(migrationsDir, fileName), "// migration fixture\n", "utf8");
    }
  }

  const existingCollections = new Set(options.existingCollections ?? []);
  const collectionHandles = new Map<
    string,
    {
      drop: jest.Mock<Promise<void>, []>;
      createIndex: jest.Mock<Promise<void>, [Record<string, 1 | -1>, Record<string, unknown>?]>;
      dropIndex: jest.Mock<Promise<void>, [string]>;
    }
  >();

  const getCollectionHandle = (name: string) => {
    const current = collectionHandles.get(name);
    if (current) return current;

    const created = {
      drop: jest.fn<Promise<void>, []>(async () => {
        existingCollections.delete(name);
      }),
      createIndex: jest.fn<Promise<void>, [Record<string, 1 | -1>, Record<string, unknown>?]>(
        async () => undefined,
      ),
      dropIndex: jest.fn<Promise<void>, [string]>(async () => undefined),
    };
    collectionHandles.set(name, created);
    return created;
  };

  const mongoDb = {
    listCollections: jest.fn((filter: { name?: string }) => ({
      toArray: async () =>
        filter?.name && existingCollections.has(filter.name) ? [{ name: filter.name }] : [],
    })),
    createCollection: jest.fn(async (name: string) => {
      existingCollections.add(name);
    }),
    collection: jest.fn((name: string) => getCollectionHandle(name)),
  };

  const sqlDb = {
    execute: jest.fn<Promise<void>, [string, unknown[]?]>(async () => undefined),
  };

  const getAdapter = jest.fn(async () => (driver === "mongo" ? mongoDb : sqlDb));
  const getConnection = options.omitGetConnection ? undefined : jest.fn(async () => mongoDb);
  const closeAllConnections = jest.fn(async () => undefined);
  const resolveConnectionName = jest.fn(() => connectionName);

  const acquireMigrationLock = jest.fn(async () => undefined);
  const ensureMigrationTables = jest.fn(async () => driver);
  const readLastBatch = jest.fn(async () => 4);
  const recordAppliedMigration = jest.fn(async () => undefined);
  const releaseMigrationLock = jest.fn(async () => undefined);
  const validateMigrationHistory = jest.fn(async () => options.sqlAppliedRows ?? []);
  const computeMigrationChecksum = jest.fn((filePath: string) => `checksum:${path.basename(filePath)}`);

  const acquireMongoMigrationLock = jest.fn(async () => undefined);
  const ensureMigrationCollection = jest.fn(async () => undefined);
  const readLastMongoBatch = jest.fn(async () => 8);
  const recordAppliedMongoMigration = jest.fn(async () => undefined);
  const releaseMongoMigrationLock = jest.fn(async () => undefined);
  const validateMongoMigrationHistory = jest.fn(async () => options.mongoAppliedRows ?? []);

  const loadModule = jest.fn((modulePath: string) =>
    options.loadModuleImpl ? options.loadModuleImpl(modulePath) : {},
  );
  const appendAuditEvent = jest.fn();

  jest.doMock("chalk", () => passthroughChalk);
  jest.doMock("../cli/utils/PathMap", () => ({
    PathMap: {
      migrations: () => migrationsDir,
    },
  }));
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
  jest.doMock("../core/connection/ConnectionFactory", () => ({
    getAdapter,
    ...(getConnection ? { getConnection } : {}),
    closeAllConnections,
  }));
  jest.doMock("../core/connection/resolveConnectionName", () => ({
    resolveConnectionName,
  }));
  jest.doMock("../cli/utils/migrations/MigrationTracker", () => ({
    acquireMigrationLock,
    ensureMigrationTables,
    readLastBatch,
    recordAppliedMigration,
    releaseMigrationLock,
    validateMigrationHistory,
    computeMigrationChecksum,
  }));
  jest.doMock("../cli/utils/migrations/MongoMigrationTracker", () => ({
    acquireMigrationLock: acquireMongoMigrationLock,
    ensureMigrationCollection,
    readLastBatch: readLastMongoBatch,
    recordAppliedMigration: recordAppliedMongoMigration,
    releaseMigrationLock: releaseMongoMigrationLock,
    validateMigrationHistory: validateMongoMigrationHistory,
  }));
  jest.doMock("../cli/utils/typescript/tsRuntime", () => ({
    loadModule,
  }));
  jest.doMock("../cli/utils/AuditTrail", () => ({
    appendAuditEvent,
  }));

  const migrateRunModule = await import("../cli/commands/migrateRun");

  return {
    root,
    connectionName,
    sqlDb,
    mongoDb,
    collectionHandles,
    migrateRun: migrateRunModule.migrateRun,
    mocks: {
      getAdapter,
      getConnection,
      closeAllConnections,
      resolveConnectionName,
      acquireMigrationLock,
      ensureMigrationTables,
      readLastBatch,
      recordAppliedMigration,
      releaseMigrationLock,
      validateMigrationHistory,
      computeMigrationChecksum,
      acquireMongoMigrationLock,
      ensureMigrationCollection,
      readLastMongoBatch,
      recordAppliedMongoMigration,
      releaseMongoMigrationLock,
      validateMongoMigrationHistory,
      loadModule,
      appendAuditEvent,
    },
  };
}

describe("LTS phase 5 migrateRun continuation", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.resetModules();
    process.exitCode = 0;
    delete process.env.ELOQUENT_DEBUG;
    delete process.env.ELOQUENT_CLI;
  });

  test("continuation plan records the completed SQL-side and wrapper slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-MigrateRun-Continuation-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 MigrateRun Continuation Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("line `148`");
    expect(content).toContain("line `398`");
    expect(content).toContain(
      "src/lab_test/lts.phase5.migrate-run-continuation.logic.test.ts",
    );
    expect(content).toContain("focused Docker `v8` run:");
    expect(content).toContain("`migrateRun.ts` -> `100%` statements / `100%` branches / `100%` functions / `100%` lines");
  });

  test("covers SQL missing-directory short-circuit and TEST banner with model targeting", async () => {
    const missingHarness = await setupMigrateRunHarness({
      connectionName: "sqlite_test" as ConnectionName,
      driver: "sqlite",
      createMigrationsDir: false,
    });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    await missingHarness.migrateRun(true, "User", false, false, {
      connectionNames: [missingHarness.connectionName],
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Running migrations in TEST mode on "sqlite_test" for model "User"'),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("No migrations directory found for sqlite_test."),
    );
    expect(missingHarness.mocks.getAdapter).not.toHaveBeenCalled();

    fs.rmSync(missingHarness.root, { recursive: true, force: true });
  });

  test("covers SQL file filtering, model filtering miss, no pending branch, invalid migration, blank query, dry-run, and empty migration skip", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    const modelMissHarness = await setupMigrateRunHarness({
      connectionName: "sqlite" as ConnectionName,
      driver: "sqlite",
      migrationFiles: ["202603220010_create_users.ts", "README.md"],
    });
    await modelMissHarness.migrateRun(false, "Post", false, false, {
      connectionNames: [modelMissHarness.connectionName],
    });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("No migrations found for model: Post"));
    fs.rmSync(modelMissHarness.root, { recursive: true, force: true });

    const noPendingFile = "202603220011_create_users.ts";
    const noPendingHarness = await setupMigrateRunHarness({
      connectionName: "sqlite" as ConnectionName,
      driver: "sqlite",
      migrationFiles: [noPendingFile, "notes.txt"],
      sqlAppliedRows: [{ name: noPendingFile, batch: 4 }],
    });
    await noPendingHarness.migrateRun(false, undefined, false, false, {
      connectionNames: [noPendingHarness.connectionName],
    });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("No new migrations to run."));
    fs.rmSync(noPendingHarness.root, { recursive: true, force: true });

    const invalidHarness = await setupMigrateRunHarness({
      connectionName: "sqlite" as ConnectionName,
      driver: "sqlite",
      migrationFiles: ["202603220012_invalid.ts"],
      loadModuleImpl: () => ({}),
    });
    await invalidHarness.migrateRun(false, undefined, false, false, {
      connectionNames: [invalidHarness.connectionName],
    });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Invalid migration: 202603220012_invalid.ts"));
    fs.rmSync(invalidHarness.root, { recursive: true, force: true });

    const blankAndDryRunFile = "202603220013_profiles.ts";
    const dryRunHarness = await setupMigrateRunHarness({
      connectionName: "sqlite" as ConnectionName,
      driver: "sqlite",
      migrationFiles: [blankAndDryRunFile],
      loadModuleImpl: () => ({
        up: async (ctx: { query(sql: string, params?: unknown[]): Promise<void> }) => {
          await ctx.query("   ");
          await ctx.query("CREATE TABLE profiles(id INTEGER)", []);
        },
      }),
    });
    await dryRunHarness.migrateRun(false, undefined, true, false, {
      connectionNames: [dryRunHarness.connectionName],
    });
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("[DRY-RUN] Would execute:\nCREATE TABLE profiles(id INTEGER)\n"),
    );
    expect(dryRunHarness.sqlDb.execute).not.toHaveBeenCalled();
    fs.rmSync(dryRunHarness.root, { recursive: true, force: true });

    const emptyHarness = await setupMigrateRunHarness({
      connectionName: "sqlite" as ConnectionName,
      driver: "sqlite",
      migrationFiles: ["202603220014_empty.ts"],
      loadModuleImpl: () => ({
        up: async (ctx: { query(sql: string, params?: unknown[]): Promise<void> }) => {
          await ctx.query(" ");
        },
      }),
    });
    await emptyHarness.migrateRun(false, undefined, false, false, {
      connectionNames: [emptyHarness.connectionName],
    });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Skipping empty migration: 202603220014_empty.ts"));
    expect(emptyHarness.mocks.recordAppliedMigration).not.toHaveBeenCalled();
    fs.rmSync(emptyHarness.root, { recursive: true, force: true });
  });

  test("covers entrypoint default connection resolution, debug start logging, audit default command, and CLI exit scheduling", async () => {
    process.env.ELOQUENT_DEBUG = "true";
    process.env.ELOQUENT_CLI = "true";

    const harness = await setupMigrateRunHarness({
      connectionName: "sqlite_test" as ConnectionName,
      driver: "sqlite",
      migrationFiles: ["202603220015_users.ts"],
      sqlAppliedRows: [],
      loadModuleImpl: () => ({
        up: async (ctx: { query(sql: string, params?: unknown[]): Promise<void> }) => {
          await ctx.query("CREATE TABLE users(id INTEGER)", []);
        },
      }),
    });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const setImmediateSpy = jest
      .spyOn(global, "setImmediate")
      .mockImplementation(((callback: (...args: unknown[]) => void, ...args: unknown[]) => {
        callback(...args);
        return {} as NodeJS.Immediate;
      }) as typeof setImmediate);
    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation(((code?: string | number | null | undefined) => code as never) as typeof process.exit);

    await harness.migrateRun(true, undefined, false, true);

    expect(logSpy).toHaveBeenCalledWith("[migrate:run] start", {
      isTest: true,
      modelName: undefined,
      dryRun: false,
      connectionNames: undefined,
    });
    expect(harness.mocks.resolveConnectionName).toHaveBeenCalledWith(undefined, { test: true });
    expect(harness.mocks.appendAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "migrate:run",
        connectionName: "sqlite_test",
        test: true,
        result: "success",
      }),
    );
    expect(setImmediateSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);

    fs.rmSync(harness.root, { recursive: true, force: true });
  });

  test("covers exitCli nullish fallback when process.exitCode is undefined", async () => {
    process.env.ELOQUENT_CLI = "true";

    const harness = await setupMigrateRunHarness({
      connectionName: "sqlite_test" as ConnectionName,
      driver: "sqlite",
      migrationFiles: ["202603220016_users.ts"],
      loadModuleImpl: () => ({
        up: async (ctx: { query(sql: string, params?: unknown[]): Promise<void> }) => {
          await ctx.query("CREATE TABLE users(id INTEGER)", []);
        },
      }),
    });
    const setImmediateSpy = jest
      .spyOn(global, "setImmediate")
      .mockImplementation(((callback: (...args: unknown[]) => void, ...args: unknown[]) => {
        callback(...args);
        return {} as NodeJS.Immediate;
      }) as typeof setImmediate);
    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation(((code?: string | number | null | undefined) => code as never) as typeof process.exit);

    process.exitCode = undefined;

    await harness.migrateRun(true, undefined, false, true);

    expect(setImmediateSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);

    fs.rmSync(harness.root, { recursive: true, force: true });
  });
});
