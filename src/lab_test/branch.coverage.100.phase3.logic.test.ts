import fs from "fs";
import os from "os";
import path from "path";
import { column, relation, type SchemaField } from "../core/schema/SchemaBlueprint.js";

describe("Branch coverage 100% - phase 3 command branch trees", () => {
  const passthroughChalk = {
    __esModule: true,
    default: {
      blue: (v: string) => v,
      blueBright: (v: string) => v,
      green: (v: string) => v,
      greenBright: (v: string) => v,
      yellow: (v: string) => v,
      red: (v: string) => v,
      redBright: (v: string) => v,
      cyan: (v: string) => v,
      cyanBright: (v: string) => v,
      gray: (v: string) => v,
    },
  };

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    jest.clearAllMocks();
    process.exitCode = 0;
  });

  describe("migrateStatus", () => {
    test("handles missing migration directory without opening DB adapter", async () => {
      const missingDir = path.join(os.tmpdir(), "eloquent-status-missing-dir");
      const getAdapter = jest.fn();
      const closeAllConnections = jest.fn(async () => undefined);
      const resolveConnectionName = jest.fn(() => "sqlite");

      jest.doMock("chalk", () => passthroughChalk);
      jest.doMock("../cli/utils/PathMap", () => ({
        PathMap: {
          migrations: () => missingDir,
        },
      }));
      jest.doMock("../core/connection/ConnectionFactory", () => ({
        getAdapter,
        closeAllConnections,
      }));
      jest.doMock("../core/connection/resolveConnectionName", () => ({
        resolveConnectionName,
      }));

      const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
      const { migrateStatus } = await import("../cli/commands/migrateStatus.js");
      await migrateStatus({ connectionNames: ["sqlite" as never] });

      expect(getAdapter).not.toHaveBeenCalled();
      expect(closeAllConnections).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("No migrations directory found"));
    });

    test("reports missing migrations table and still closes all connections", async () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-status-"));
      const migrationsDir = path.join(root, "sqlite");
      fs.mkdirSync(migrationsDir, { recursive: true });
      fs.writeFileSync(path.join(migrationsDir, "20260308001_create_users_table.ts"), "", "utf8");

      const query = jest.fn(async () => {
        throw new Error("table missing");
      });
      const getAdapter = jest.fn(async () => ({ query }));
      const closeAllConnections = jest.fn(async () => undefined);
      const resolveConnectionName = jest.fn(() => "sqlite");

      jest.doMock("chalk", () => passthroughChalk);
      jest.doMock("../cli/utils/PathMap", () => ({
        PathMap: {
          migrations: () => migrationsDir,
        },
      }));
      jest.doMock("../core/connection/ConnectionFactory", () => ({
        getAdapter,
        closeAllConnections,
      }));
      jest.doMock("../core/connection/resolveConnectionName", () => ({
        resolveConnectionName,
      }));

      const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
      const tableSpy = jest.spyOn(console, "table").mockImplementation(() => undefined);
      const { migrateStatus } = await import("../cli/commands/migrateStatus.js");
      await migrateStatus(true);

      expect(resolveConnectionName).toHaveBeenCalledWith(undefined, { test: true });
      expect(getAdapter).toHaveBeenCalledWith("sqlite");
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("No migrations table found."));
      expect(tableSpy).toHaveBeenCalled();
      expect(closeAllConnections).toHaveBeenCalledTimes(1);

      fs.rmSync(root, { recursive: true, force: true });
    });

    test("sets process.exitCode when adapter access throws", async () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-status-fail-"));
      const migrationsDir = path.join(root, "pg");
      fs.mkdirSync(migrationsDir, { recursive: true });

      const getAdapter = jest.fn(async () => {
        throw new Error("adapter down");
      });
      const closeAllConnections = jest.fn(async () => undefined);

      jest.doMock("chalk", () => passthroughChalk);
      jest.doMock("../cli/utils/PathMap", () => ({
        PathMap: {
          migrations: () => migrationsDir,
        },
      }));
      jest.doMock("../core/connection/ConnectionFactory", () => ({
        getAdapter,
        closeAllConnections,
      }));
      jest.doMock("../core/connection/resolveConnectionName", () => ({
        resolveConnectionName: jest.fn(() => "pg"),
      }));

      const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
      const { migrateStatus } = await import("../cli/commands/migrateStatus.js");
      await migrateStatus({ connectionNames: ["pg" as never] });

      expect(process.exitCode).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch migration status for "pg".')
      );

      fs.rmSync(root, { recursive: true, force: true });
    });
  });

  describe("makeMigration", () => {
    function setupMakeMigrationContext() {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-phase3-make-migration-"));
      const modelsDir = path.join(root, "models");
      const testMigrationsRoot = path.join(root, "migrations");
      fs.mkdirSync(modelsDir, { recursive: true });
      fs.mkdirSync(testMigrationsRoot, { recursive: true });

      const compile = jest.fn(() => true);
      const loadModule = jest.fn();
      const resolveConnectionName = jest.fn(() => "sqlite_test");
      const closeAllConnections = jest.fn(async () => undefined);
      const toCreateSQL = jest.fn(async (tableName: string) => ({
        mainSQL: `CREATE TABLE ${tableName} (id INT);`,
        extraTables: [],
        rollbackMainSQL: `DROP TABLE IF EXISTS ${tableName};`,
        rollbackExtraTables: [],
      }));

      const exitSpy = jest.spyOn(process, "exit").mockImplementation((() => undefined) as never);
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
      const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

      jest.doMock("chalk", () => passthroughChalk);
      jest.doMock("../cli/utils/PathMap", () => ({
        PathMap: {
          ensureDirs: () => undefined,
          models: () => modelsDir,
          migrations: (_isTest: boolean, connectionName?: string) =>
            connectionName ? path.join(testMigrationsRoot, String(connectionName)) : testMigrationsRoot,
          testMigrations: (connectionName?: string) =>
            connectionName ? path.join(testMigrationsRoot, String(connectionName)) : testMigrationsRoot,
          appMigrations: (connectionName?: string) =>
            connectionName ? path.join(root, "app-migrations", String(connectionName)) : path.join(root, "app-migrations"),
        },
      }));
      jest.doMock("../cli/utils/typescript/TypeScriptCompiler", () => ({
        TypeScriptCompiler: { compile },
      }));
      jest.doMock("../cli/utils/typescript/tsRuntime", () => ({
        loadModule,
      }));
      jest.doMock("../core/connection/resolveConnectionName", () => ({
        resolveConnectionName,
      }));
      jest.doMock("../core/connection/ConnectionFactory", () => ({
        closeAllConnections,
      }));
      jest.doMock("../core/schema/SchemaBuilder", () => ({
        SchemaBuilder: { toCreateSQL },
      }));

      return {
        root,
        modelsDir,
        testMigrationsRoot,
        compile,
        loadModule,
        resolveConnectionName,
        closeAllConnections,
        toCreateSQL,
        logSpy,
        warnSpy,
        errSpy,
        exitSpy,
      };
    }

    test("sorts --all models by belongsTo dependency before SQL generation", async () => {
      const ctx = setupMakeMigrationContext();
      fs.writeFileSync(path.join(ctx.modelsDir, "Post.ts"), "export class Post {}", "utf8");
      fs.writeFileSync(path.join(ctx.modelsDir, "User.ts"), "export class User {}", "utf8");
      ctx.loadModule.mockImplementation((modulePath: string) => {
        if (modulePath.endsWith("User.ts")) {
          return {
            User: {
              tableName: "users",
              schema: { id: column("increments", undefined, { primary: true }) } satisfies Record<
                string,
                SchemaField
              >,
            },
          };
        }
        return {
          Post: {
            tableName: "posts",
            schema: {
              id: column("increments", undefined, { primary: true }),
              author: relation("belongsTo", "User", { foreignKey: "user_id" }),
            } satisfies Record<string, SchemaField>,
          },
        };
      });

      const { makeMigration } = await import("../cli/commands/makeMigration.js");
      await makeMigration("all", { test: true, exit: false });

      const tables = ctx.toCreateSQL.mock.calls.map((call) => call[0]);
      expect(tables.slice(0, 2)).toEqual(["users", "posts"]);
      expect(ctx.closeAllConnections).toHaveBeenCalledTimes(1);
      expect(ctx.exitSpy).not.toHaveBeenCalled();

      fs.rmSync(ctx.root, { recursive: true, force: true });
    });

    test("covers no-model-files, missing-specific-model, no-schema, and no-diff branches", async () => {
      const ctx = setupMakeMigrationContext();
      const { makeMigration } = await import("../cli/commands/makeMigration.js");

      await makeMigration("all", { test: true, exit: false });
      expect(ctx.warnSpy).toHaveBeenCalledWith(expect.stringContaining("No model files found"));

      await makeMigration("Ghost", { test: true, exit: false });
      expect(ctx.logSpy).toHaveBeenCalledWith(expect.stringContaining("Model not found"));

      fs.writeFileSync(path.join(ctx.modelsDir, "User.ts"), "export class User {}", "utf8");
      ctx.loadModule.mockReturnValueOnce({ User: { tableName: "users" } });
      await makeMigration("User", { test: true, exit: false });
      expect(ctx.logSpy).toHaveBeenCalledWith(expect.stringContaining("No schema found"));

      ctx.loadModule.mockReturnValue({
        User: {
          tableName: "users",
          schema: {
            id: column("increments", undefined, { primary: true }),
          } satisfies Record<string, SchemaField>,
        },
      });
      ctx.toCreateSQL.mockResolvedValueOnce({
        mainSQL: " ",
        extraTables: [],
        rollbackMainSQL: "",
        rollbackExtraTables: [],
      });
      await makeMigration("User", { test: true, exit: false });
      expect(ctx.logSpy).toHaveBeenCalledWith(expect.stringContaining("No new columns or schema changes"));

      fs.rmSync(ctx.root, { recursive: true, force: true });
    });

    test("uses default exit behavior when options.exit is omitted", async () => {
      const ctx = setupMakeMigrationContext();
      fs.writeFileSync(path.join(ctx.modelsDir, "User.ts"), "export class User {}", "utf8");
      ctx.loadModule.mockReturnValue({
        User: {
          tableName: "users",
          schema: {
            id: column("increments", undefined, { primary: true }),
          } satisfies Record<string, SchemaField>,
        },
      });

      const { makeMigration } = await import("../cli/commands/makeMigration.js");
      await makeMigration("User", { test: true });

      expect(ctx.exitSpy).toHaveBeenCalledWith(0);
      fs.rmSync(ctx.root, { recursive: true, force: true });
    });
  });

  describe("makeModel + migrateRollback", () => {
    test("makeModel attrs-from-schema inference and migration-close warning branches", async () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-phase3-make-model-"));
      const modelsDir = path.join(root, "models");
      const migrationsRoot = path.join(root, "migrations");
      fs.mkdirSync(modelsDir, { recursive: true });
      fs.mkdirSync(migrationsRoot, { recursive: true });

      const compile = jest.fn(() => true);
      const loadModule = jest.fn(() => ({
        User: {
          tableName: "users",
          timestamps: true,
          softDeletes: true,
          schema: {
            id: column("increments", undefined, { primary: true }),
            name: column("string", undefined, { notNull: true }),
            is_active: column("boolean"),
            score: column("decimal"),
            profile: column("json"),
            created_custom: column("timestamp"),
            mystery: { kind: "column", type: "mystery", options: {} } as any,
          } satisfies Record<string, SchemaField>,
        },
      }));
      const resolveConnectionName = jest.fn(() => "sqlite_test");
      const closeAllConnections = jest.fn(async () => {
        throw new Error("close failed");
      });
      const toCreateSQL = jest.fn(async () => ({
        mainSQL: "CREATE TABLE users (id INTEGER);",
        extraTables: [],
        rollbackMainSQL: "DROP TABLE IF EXISTS users;",
        rollbackExtraTables: [],
      }));

      const templateLoad = jest.fn(() => "template");
      const templateRender = jest.fn((_tpl: string, data: Record<string, unknown>) => {
        return `export interface UserAttrs {\n${String(data.attrsTypeBody ?? "")}\n}\n`;
      });
      const templateSave = jest.fn((outPath: string, content: string) => {
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, content, "utf8");
      });

      jest.doMock("chalk", () => passthroughChalk);
      jest.doMock("../cli/utils/PathMap", () => ({
        PathMap: {
          ensureDirs: () => undefined,
          models: () => modelsDir,
          testMigrations: () => migrationsRoot,
          appMigrations: () => migrationsRoot,
          migrations: (_isTest: boolean, connectionName?: string) =>
            connectionName ? path.join(migrationsRoot, String(connectionName)) : migrationsRoot,
        },
      }));
      jest.doMock("../cli/utils/TemplateEngine", () => ({
        TemplateEngine: {
          load: templateLoad,
          render: templateRender,
          save: templateSave,
        },
      }));
      jest.doMock("../cli/utils/ImportResolver", () => ({
        ImportResolver: {
          coreImportPath: () => "../../core",
          schemaImportPath: () => "../../core/schema",
        },
      }));
      jest.doMock("../cli/utils/typescript/TypeScriptCompiler", () => ({
        TypeScriptCompiler: { compile },
      }));
      jest.doMock("../cli/utils/typescript/tsRuntime", () => ({
        loadModule,
      }));
      jest.doMock("../core/connection/resolveConnectionName", () => ({
        resolveConnectionName,
      }));
      jest.doMock("../core/connection/ConnectionFactory", () => ({
        closeAllConnections,
      }));
      jest.doMock("../core/schema/SchemaBuilder", () => ({
        SchemaBuilder: { toCreateSQL },
      }));

      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
      const { makeModel } = await import("../cli/commands/makeModel.js");

      await makeModel("User", { test: true, attrsFromSchema: true, force: true });
      const inferredAttrsPayload = (templateRender.mock.calls[1] ?? [])[1] as
        | Record<string, unknown>
        | undefined;
      const inferredAttrs = String(inferredAttrsPayload?.attrsTypeBody ?? "");
      expect(inferredAttrs).toContain("id?: number | null;");
      expect(inferredAttrs).toContain("name: string;");
      expect(inferredAttrs).toContain("is_active?: boolean | null;");
      expect(inferredAttrs).toContain("profile?: Record<string, unknown> | null;");
      expect(inferredAttrs).toContain("mystery?: unknown | null;");
      expect(inferredAttrs).toContain("deleted_at?: string | Date | null;");

      compile.mockReturnValue(false);
      await makeModel("User", { test: true, withMigration: true, force: true });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Skipping migration"));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Could not close DB connections cleanly"));

      fs.rmSync(root, { recursive: true, force: true });
    });

    test("migrateRollback covers missing-dir, mongo, and empty-history branches", async () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-phase3-rollback-"));
      const sqliteMigrationsDir = path.join(root, "sqlite");
      const mongoMigrationsDir = path.join(root, "mongo");
      fs.mkdirSync(sqliteMigrationsDir, { recursive: true });
      fs.mkdirSync(mongoMigrationsDir, { recursive: true });

      const execute = jest.fn(async () => undefined);
      const adapter = {
        execute,
        wrapId: (id: string) => `"${id}"`,
      };
      const getAdapter = jest.fn(async () => adapter);
      const getConnection = jest.fn(async () => ({}));
      const closeAllConnections = jest.fn(async () => undefined);
      const resolveConnectionName = jest.fn(() => "sqlite");
      const ensureMigrationTables = jest.fn(async () => undefined);
      const acquireMigrationLock = jest.fn(async () => undefined);
      const releaseMigrationLock = jest.fn(async () => undefined);
      const validateMigrationHistory = jest.fn(async () => []);
      const ensureMongoMigrationCollection = jest.fn(async () => undefined);
      const acquireMongoMigrationLock = jest.fn(async () => undefined);
      const releaseMongoMigrationLock = jest.fn(async () => undefined);
      const validateMongoMigrationHistory = jest.fn(async () => []);
      const deleteMongoAppliedMigration = jest.fn(async () => undefined);
      const doesCollectionExist = jest.fn(async () => false);

      jest.doMock("chalk", () => passthroughChalk);
      jest.doMock("../cli/utils/PathMap", () => ({
        PathMap: {
          migrations: (_isTest: boolean, connectionName?: string) => {
            if (connectionName === "mongo") return mongoMigrationsDir;
            if (connectionName === "sqlite") return sqliteMigrationsDir;
            return path.join(root, "missing");
          },
        },
      }));
      jest.doMock("../core/connection/ConnectionFactory", () => ({
        getAdapter,
        getConnection,
        closeAllConnections,
      }));
      jest.doMock("../core/connection/resolveConnectionName", () => ({
        resolveConnectionName,
      }));
      jest.doMock("../cli/utils/migrations/MigrationTracker", () => ({
        ensureMigrationTables,
        acquireMigrationLock,
        releaseMigrationLock,
        validateMigrationHistory,
        deleteAppliedMigration: jest.fn(async () => undefined),
        doesMigrationTableExist: jest.fn(async () => false),
        getAutoGeneratedCreateTableName: jest.fn(() => null),
      }));
      jest.doMock("../cli/utils/typescript/tsRuntime", () => ({
        loadModule: jest.fn(() => ({})),
      }));
      jest.doMock("../cli/utils/migrations/MongoMigrationTracker", () => ({
        ensureMigrationCollection: ensureMongoMigrationCollection,
        acquireMigrationLock: acquireMongoMigrationLock,
        releaseMigrationLock: releaseMongoMigrationLock,
        validateMigrationHistory: validateMongoMigrationHistory,
        readAppliedMigrations: jest.fn(async () => []),
        readLastBatch: jest.fn(async () => 0),
        recordAppliedMigration: jest.fn(async () => undefined),
        deleteAppliedMigration: deleteMongoAppliedMigration,
        doesCollectionExist,
      }));

      const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
      const { migrateRollback } = await import("../cli/commands/migrateRollback.js");

      await migrateRollback({ connectionNames: ["missing_conn" as never] });
      expect(getAdapter).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("No migrations directory found"));

      await migrateRollback({ connectionNames: ["mongo" as never] });
      expect(getConnection).toHaveBeenCalledWith("mongo");
      expect(ensureMongoMigrationCollection).toHaveBeenCalled();
      expect(validateMongoMigrationHistory).toHaveBeenCalledTimes(1);

      await migrateRollback({ connectionNames: ["sqlite" as never], allMigrations: true });
      expect(getAdapter).toHaveBeenCalledWith("sqlite");
      expect(validateMigrationHistory).toHaveBeenCalledTimes(1);
      expect(releaseMigrationLock).toHaveBeenCalledWith(adapter, expect.any(String), {
        success: true,
      });
      expect(closeAllConnections).toHaveBeenCalled();

      fs.rmSync(root, { recursive: true, force: true });
    });
  });
});
