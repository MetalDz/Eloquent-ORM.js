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
};

async function setupMigrateRunHarness(options: MigrateRunHarnessOptions = {}) {
  jest.resetModules();

  const connectionName = (options.connectionName ?? "mongo") as ConnectionName;
  const driver = options.driver ?? "mongo";
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-lts5-migraterun-"));
  const migrationsDir = path.join(root, String(connectionName));
  fs.mkdirSync(migrationsDir, { recursive: true });

  for (const fileName of options.migrationFiles ?? []) {
    fs.writeFileSync(path.join(migrationsDir, fileName), "// migration fixture\n", "utf8");
  }

  const existingCollections = new Set(options.existingCollections ?? []);
  const collectionHandles = new Map<
    string,
    {
      drop: jest.Mock<Promise<void>, []>;
      createIndex: jest.Mock<
        Promise<void>,
        [Record<string, 1 | -1>, Record<string, unknown>?]
      >;
      dropIndex: jest.Mock<Promise<void>, [string]>;
    }
  >();

  const getCollectionHandle = (name: string) => {
    const current = collectionHandles.get(name);
    if (current) {
      return current;
    }

    const created = {
      drop: jest.fn<Promise<void>, []>(async () => {
        existingCollections.delete(name);
      }),
      createIndex: jest.fn<
        Promise<void>,
        [Record<string, 1 | -1>, Record<string, unknown>?]
      >(async () => undefined),
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

  const getAdapter = jest.fn(async (name: ConnectionName) =>
    driver === "mongo" ? mongoDb : name === connectionName ? sqlDb : sqlDb,
  );
  const getConnection = options.omitGetConnection
    ? undefined
    : jest.fn(async () => mongoDb);
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
    mongoDb,
    sqlDb,
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

describe("LTS phase 5 migrateRun coverage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.resetModules();
    process.exitCode = 0;
    delete process.env.ELOQUENT_DEBUG;
    delete process.env.ELOQUENT_CLI;
  });

  test("plan tracks the dedicated migrateRun coverage slice", () => {
    const planPath = path.resolve(
      process.cwd(),
      "validation tasks/LTS-Phase5-MigrateRun-Coverage-Plan.md",
    );
    const content = fs.readFileSync(planPath, "utf8");

    expect(content).toContain("# LTS Phase 5 MigrateRun Coverage Plan");
    expect(content).toContain("Status: COMPLETED");
    expect(content).toContain("src/cli/commands/migrateRun.ts");
    expect(content).toContain("src/lab_test/lts.phase5.migrate-run-coverage.logic.test.ts");
  });

  test("covers Mongo dry-run helpers and getConnection fallback through getAdapter", async () => {
    let observedCollection: unknown;
    let queryGuardError = "";

    const harness = await setupMigrateRunHarness({
      omitGetConnection: true,
      migrationFiles: ["202603150101_manage_media.ts"],
      loadModuleImpl: () => ({
        up: async (ctx: {
          ensureCollection: (name: string) => Promise<void>;
          dropCollection: (name: string) => Promise<void>;
          createIndex: (
            collectionName: string,
            keys: Record<string, 1 | -1>,
            options?: Record<string, unknown>,
          ) => Promise<void>;
          dropIndex: (collectionName: string, indexName: string) => Promise<void>;
          collection: (name: string) => unknown;
          query: (sql: string) => Promise<void>;
        }) => {
          await ctx.ensureCollection("media");
          await ctx.dropCollection("ghosts");
          await ctx.createIndex("media", { user_id: 1 }, { unique: true });
          await ctx.dropIndex("media", "user_id_1");
          observedCollection = ctx.collection("media");
          await ctx.query("   ");
          try {
            await ctx.query("DROP TABLE users");
          } catch (error) {
            queryGuardError = (error as Error).message;
          }
        },
      }),
    });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    await harness.migrateRun(false, undefined, true, false, {
      connectionNames: [harness.connectionName],
      auditCommand: "lts:migrate:run",
    });

    expect(harness.mocks.getAdapter).toHaveBeenCalledWith(harness.connectionName);
    expect(harness.mocks.getConnection).toBeUndefined();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[DRY-RUN] Would ensure collection "media"'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[DRY-RUN] Would drop collection "ghosts"'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[DRY-RUN] Would create index on "media"'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[DRY-RUN] Would drop index "user_id_1" on "media"'));
    expect(observedCollection).toBe(harness.collectionHandles.get("media"));
    expect(queryGuardError).toContain("Mongo migrations do not support SQL query() calls");
    expect(harness.mocks.acquireMongoMigrationLock).not.toHaveBeenCalled();
    expect(harness.mocks.recordAppliedMongoMigration).not.toHaveBeenCalled();
    expect(harness.mocks.appendAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "lts:migrate:run",
        connectionName: harness.connectionName,
        result: "success",
        metadata: expect.objectContaining({ dryRun: true, modelName: null }),
      }),
    );

    fs.rmSync(harness.root, { recursive: true, force: true });
  });

  test("covers Mongo successful non-dry-run execution with collection operations and recorded migration", async () => {
    const migrationFile = "202603150102_manage_geo.ts";
    const harness = await setupMigrateRunHarness({
      migrationFiles: [migrationFile],
      existingCollections: ["ghosts"],
      mongoAppliedRows: [{ id: "old", name: "202603150000_old.ts", batch: 8 }],
      loadModuleImpl: () => ({
        up: async (ctx: {
          ensureCollection: (name: string) => Promise<void>;
          dropCollection: (name: string) => Promise<void>;
          createIndex: (
            collectionName: string,
            keys: Record<string, 1 | -1>,
            options?: Record<string, unknown>,
          ) => Promise<void>;
          dropIndex: (collectionName: string, indexName: string) => Promise<void>;
        }) => {
          await ctx.ensureCollection("geo_points");
          await ctx.dropCollection("ghosts");
          await ctx.createIndex("geo_points", { user_id: 1 }, { sparse: true });
          await ctx.dropIndex("geo_points", "old_user_id_idx");
        },
      }),
    });

    await harness.migrateRun(false, undefined, false, false, {
      connectionNames: [harness.connectionName],
    });

    expect(harness.mocks.acquireMongoMigrationLock).toHaveBeenCalledWith(
      harness.mongoDb as never,
      expect.any(String),
    );
    expect(harness.mongoDb.createCollection).toHaveBeenCalledWith("geo_points");
    expect(harness.collectionHandles.get("ghosts")?.drop).toHaveBeenCalled();
    expect(harness.collectionHandles.get("geo_points")?.createIndex).toHaveBeenCalledWith(
      { user_id: 1 },
      { sparse: true },
    );
    expect(harness.collectionHandles.get("geo_points")?.dropIndex).toHaveBeenCalledWith(
      "old_user_id_idx",
    );
    expect(harness.mocks.recordAppliedMongoMigration).toHaveBeenCalledWith(
      harness.mongoDb as never,
      migrationFile,
      9,
      `checksum:${migrationFile}`,
    );
    expect(harness.mocks.releaseMongoMigrationLock).toHaveBeenCalledWith(
      harness.mongoDb as never,
      expect.any(String),
    );
    expect(process.exitCode).toBe(0);

    fs.rmSync(harness.root, { recursive: true, force: true });
  });

  test("covers Mongo model filter miss, no-pending branch, invalid migration branch, and catch failure", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const noMatchHarness = await setupMigrateRunHarness({
      migrationFiles: ["202603150103_create_users.ts"],
    });
    await noMatchHarness.migrateRun(false, "Post", false, false, {
      connectionNames: [noMatchHarness.connectionName],
    });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("No migrations found for model: Post"));
    fs.rmSync(noMatchHarness.root, { recursive: true, force: true });

    const noPendingFile = "202603150104_create_users.ts";
    const noPendingHarness = await setupMigrateRunHarness({
      migrationFiles: [noPendingFile],
      mongoAppliedRows: [{ id: "applied", name: noPendingFile, batch: 1 }],
    });
    await noPendingHarness.migrateRun(false, undefined, false, false, {
      connectionNames: [noPendingHarness.connectionName],
    });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("No new migrations to run."));
    fs.rmSync(noPendingHarness.root, { recursive: true, force: true });

    const invalidHarness = await setupMigrateRunHarness({
      migrationFiles: ["202603150105_invalid.ts"],
      loadModuleImpl: () => ({}),
    });
    await invalidHarness.migrateRun(false, undefined, false, false, {
      connectionNames: [invalidHarness.connectionName],
    });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Invalid migration: 202603150105_invalid.ts"));
    fs.rmSync(invalidHarness.root, { recursive: true, force: true });

    const failingHarness = await setupMigrateRunHarness({
      migrationFiles: ["202603150106_broken.ts"],
      loadModuleImpl: () => ({
        up: async () => {
          throw new Error("mongo migration failed");
        },
      }),
    });
    await failingHarness.migrateRun(false, undefined, false, false, {
      connectionNames: [failingHarness.connectionName],
      auditCommand: "lts:migrate:run",
    });
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Error during migration execution:"));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Rolling back partial changes..."));
    expect(failingHarness.mocks.appendAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "lts:migrate:run",
        result: "failure",
      }),
    );
    expect(process.exitCode).toBe(1);
    fs.rmSync(failingHarness.root, { recursive: true, force: true });
  });

  test("covers unsupported-driver skip and SQL debug/applied-history branches", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    const unsupportedHarness = await setupMigrateRunHarness({
      connectionName: "legacy" as ConnectionName,
      driver: "oracle",
    });
    await unsupportedHarness.migrateRun(false, undefined, false, false, {
      connectionNames: [unsupportedHarness.connectionName],
    });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping migrations: "legacy" has unsupported driver "oracle".'),
    );
    fs.rmSync(unsupportedHarness.root, { recursive: true, force: true });

    process.env.ELOQUENT_DEBUG = "true";
    const pendingFile = "202603150107_create_profiles.ts";
    const sqlHarness = await setupMigrateRunHarness({
      connectionName: "sqlite" as ConnectionName,
      driver: "sqlite",
      migrationFiles: ["202603150100_old.ts", pendingFile],
      sqlAppliedRows: [{ id: 10, name: "202603150100_old.ts", batch: 4 }],
      loadModuleImpl: (modulePath: string) => {
        if (modulePath.endsWith(pendingFile)) {
          return {
            up: async (ctx: { query(sql: string, params?: unknown[]): Promise<void> }) => {
              await ctx.query("CREATE TABLE profiles(id INTEGER)", []);
            },
          };
        }
        return {};
      },
    });

    await sqlHarness.migrateRun(false, undefined, false, false, {
      connectionNames: [sqlHarness.connectionName],
    });

    expect(logSpy).toHaveBeenCalledWith("[migrate:run] before getAdapter");
    expect(logSpy).toHaveBeenCalledWith("[migrate:run] after getAdapter");
    expect(sqlHarness.mocks.acquireMigrationLock).toHaveBeenCalledWith(
      sqlHarness.sqlDb as never,
      expect.any(String),
    );
    expect(sqlHarness.sqlDb.execute).toHaveBeenCalledWith(
      "CREATE TABLE profiles(id INTEGER)",
      [],
    );
    expect(sqlHarness.mocks.recordAppliedMigration).toHaveBeenCalledWith(
      sqlHarness.sqlDb as never,
      pendingFile,
      5,
      `checksum:${pendingFile}`,
    );
    expect(sqlHarness.mocks.releaseMigrationLock).toHaveBeenCalledWith(
      sqlHarness.sqlDb as never,
      expect.any(String),
      expect.objectContaining({ success: true }),
    );
    fs.rmSync(sqlHarness.root, { recursive: true, force: true });
  });

  test("covers Mongo collection no-op branches and createIndex default options", async () => {
    const harness = await setupMigrateRunHarness({
      connectionName: "mongo" as ConnectionName,
      migrationFiles: ["202603150108_manage_media.ts"],
      existingCollections: ["media"],
      loadModuleImpl: () => ({
        up: async (ctx: {
          ensureCollection: (name: string) => Promise<void>;
          dropCollection: (name: string) => Promise<void>;
          createIndex: (
            collectionName: string,
            keys: Record<string, 1 | -1>,
            options?: Record<string, unknown>,
          ) => Promise<void>;
        }) => {
          await ctx.ensureCollection("media");
          await ctx.dropCollection("ghosts");
          await ctx.createIndex("media", { slug: 1 });
        },
      }),
    });

    await harness.migrateRun(false, undefined, false, false, {
      connectionNames: [harness.connectionName],
    });

    expect(harness.mongoDb.createCollection).not.toHaveBeenCalled();
    expect(harness.collectionHandles.get("ghosts")?.drop).toBeUndefined();
    expect(harness.collectionHandles.get("media")?.createIndex).toHaveBeenCalledWith(
      { slug: 1 },
      {},
    );

    fs.rmSync(harness.root, { recursive: true, force: true });
  });

  test("covers Mongo dry-run default index options, config fallback driver, js discovery, and model misses", async () => {
    const dryRunHarness = await setupMigrateRunHarness({
      connectionName: "mongo" as ConnectionName,
      migrationFiles: ["202603150109_manage_media.ts"],
      loadModuleImpl: () => ({
        up: async (ctx: {
          createIndex: (
            collectionName: string,
            keys: Record<string, 1 | -1>,
            options?: Record<string, unknown>,
          ) => Promise<void>;
        }) => {
          await ctx.createIndex("media", { slug: 1 });
        },
      }),
    });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    await dryRunHarness.migrateRun(false, undefined, true, false, {
      connectionNames: [dryRunHarness.connectionName],
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('"options":{}'),
    );
    fs.rmSync(dryRunHarness.root, { recursive: true, force: true });

    const fallbackHarness = await setupMigrateRunHarness({
      connectionName: "mongo" as ConnectionName,
      driver: "mongo",
      omitConnectionConfig: true,
      migrationFiles: ["202603150110_media.js"],
    });

    await fallbackHarness.migrateRun(false, "user", false, false, {
      connectionNames: [fallbackHarness.connectionName],
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("No migrations found for model: user"),
    );
    expect(fallbackHarness.mocks.getConnection).toHaveBeenCalledWith("mongo");
    expect(fallbackHarness.mocks.loadModule).not.toHaveBeenCalled();

    fs.rmSync(fallbackHarness.root, { recursive: true, force: true });
  });

  test("covers mongo model-specific filtering when matching js migrations remain", async () => {
    const matchingFile = "202603150111_media.js";
    const harness = await setupMigrateRunHarness({
      connectionName: "mongo" as ConnectionName,
      migrationFiles: [matchingFile],
      loadModuleImpl: () => ({
        up: async () => undefined,
      }),
    });

    await harness.migrateRun(false, "media", false, false, {
      connectionNames: [harness.connectionName],
    });

    expect(harness.mocks.loadModule).toHaveBeenCalledWith(
      expect.stringContaining(matchingFile),
    );
    expect(harness.mocks.appendAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionName: harness.connectionName,
        result: "success",
        metadata: expect.objectContaining({ modelName: "media" }),
      }),
    );

    fs.rmSync(harness.root, { recursive: true, force: true });
  });
});
