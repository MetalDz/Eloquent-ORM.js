import fs from "fs";
import os from "os";
import path from "path";
import { column, relation, type SchemaField } from "../core/schema/SchemaBlueprint.js";

describe("Branch coverage 100% - phase 15 makeMigration extra branches", () => {
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
  });

  function setupContext() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "eloquent-phase15-make-migration-"));
    const modelsDir = path.join(root, "models");
    const testMigrationsRoot = path.join(root, "test-migrations");
    const appMigrationsRoot = path.join(root, "app-migrations");
    fs.mkdirSync(modelsDir, { recursive: true });
    fs.mkdirSync(testMigrationsRoot, { recursive: true });
    fs.mkdirSync(appMigrationsRoot, { recursive: true });

    const compile = jest.fn(() => true);
    const loadModule = jest.fn();
    const resolveConnectionName = jest.fn(() => "custom_conn");
    const closeAllConnections = jest.fn(async () => undefined);
    const toCreateSQL = jest.fn(
      async (
        tableName: string
      ): Promise<{
        mainSQL: string;
        extraTables: string[];
        rollbackMainSQL: string;
        rollbackExtraTables: string[];
      }> => ({
        mainSQL: `CREATE TABLE ${tableName} (id INT);`,
        extraTables: [],
        rollbackMainSQL: `DROP TABLE IF EXISTS ${tableName};`,
        rollbackExtraTables: [],
      })
    );

    jest.doMock("chalk", () => passthroughChalk);
    jest.doMock("../cli/utils/PathMap", () => ({
      PathMap: {
        ensureDirs: () => undefined,
        models: (isTest = false) => (isTest ? modelsDir : modelsDir),
        testMigrations: (connectionName?: string) =>
          connectionName ? path.join(testMigrationsRoot, connectionName) : testMigrationsRoot,
        appMigrations: (connectionName?: string) =>
          connectionName ? path.join(appMigrationsRoot, connectionName) : appMigrationsRoot,
        migrations: (isTest = false, connectionName?: string) => {
          const base = isTest ? testMigrationsRoot : appMigrationsRoot;
          return connectionName ? path.join(base, connectionName) : base;
        },
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
    jest.doMock("../config/database", () => ({
      dbConfig: {
        default: "mysql",
        connections: {
          custom_conn: { driver: "sqlite" },
        },
      },
    }));

    return {
      root,
      modelsDir,
      testMigrationsRoot,
      appMigrationsRoot,
      compile,
      loadModule,
      resolveConnectionName,
      closeAllConnections,
      toCreateSQL,
    };
  }

  test("covers helper index migration naming, grouping, and fallback rollback SQL", async () => {
    const ctx = setupContext();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    fs.writeFileSync(path.join(ctx.modelsDir, "User.ts"), "export class User {}", "utf8");
    fs.mkdirSync(path.join(ctx.appMigrationsRoot, "custom_conn"), { recursive: true });
    fs.writeFileSync(
      path.join(ctx.appMigrationsRoot, "custom_conn", "legacy.js"),
      "module.exports = {};",
      "utf8"
    );

    ctx.loadModule.mockReturnValue({
      User: {
        tableName: "users",
        softDeletes: false,
        schema: {
          id: column("increments"),
        } satisfies Record<string, SchemaField>,
      },
    });
    ctx.toCreateSQL.mockResolvedValue({
      mainSQL: "   ",
      extraTables: [
        'CREATE INDEX user_email_idx ON "users" ("email");',
        'CREATE UNIQUE INDEX user_provider_unique ON "users" ("email", "provider");',
      ],
      rollbackMainSQL: "   ",
      rollbackExtraTables: [],
    });

    const { makeMigration } = await import("../cli/commands/makeMigration.js");
    await makeMigration("User", {
      test: false,
      pivotSeparate: true,
      connectionName: "custom_conn" as any,
      exit: false,
    });
    await makeMigration("User", {
      test: false,
      pivotSeparate: true,
      connectionName: "custom_conn" as any,
      exit: false,
    });

    const migrationDir = path.join(ctx.appMigrationsRoot, "custom_conn");
    const helperFile = fs
      .readdirSync(migrationDir)
      .find((fileName) => fileName.includes("_add_users_indexes.ts"));
    expect(helperFile).toBeDefined();

    const helperContent = fs.readFileSync(path.join(migrationDir, helperFile!), "utf8");
    expect(helperContent).toContain("Auto-generated INDEX helper migration for users indexes");
    expect(helperContent).toContain('CREATE INDEX user_email_idx ON "users" ("email");');
    expect(helperContent).toContain(
      'CREATE UNIQUE INDEX user_provider_unique ON "users" ("email", "provider");'
    );
    expect(helperContent).toContain("DROP INDEX IF EXISTS user_provider_unique;");
    expect(helperContent).toContain("DROP INDEX IF EXISTS user_email_idx;");
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Helper migration unchanged"));
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("Migration generation complete in DEVELOPMENT mode")
    );

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("covers generic schema extra helper naming when extra SQL is not a table or index", async () => {
    const ctx = setupContext();
    fs.writeFileSync(path.join(ctx.modelsDir, "User.ts"), "export class User {}", "utf8");

    ctx.loadModule.mockReturnValue({
      User: {
        tableName: "users",
        softDeletes: false,
        schema: {
          id: column("increments"),
        } satisfies Record<string, SchemaField>,
      },
    });
    ctx.toCreateSQL.mockResolvedValue({
      mainSQL: "   ",
      extraTables: ['ALTER TABLE "users" ADD CONSTRAINT users_email_check CHECK ("email" <> \'\');'],
      rollbackMainSQL: "   ",
      rollbackExtraTables: [],
    });

    const { makeMigration } = require("../cli/commands/makeMigration") as typeof import("../cli/commands/makeMigration.js");
    await makeMigration("User", {
      test: true,
      pivotSeparate: true,
      connectionName: "custom_conn" as any,
      exit: false,
    });

    const migrationDir = path.join(ctx.testMigrationsRoot, "custom_conn");
    const helperFile = fs
      .readdirSync(migrationDir)
      .find((fileName) => fileName.includes("_add_schema_extras.ts"));
    expect(helperFile).toBeDefined();

    const helperContent = fs.readFileSync(path.join(migrationDir, helperFile!), "utf8");
    expect(helperContent).toContain("Auto-generated INDEX helper migration for schema extras");
    expect(helperContent).toContain(
      'ALTER TABLE "users" ADD CONSTRAINT users_email_check CHECK ("email" <> \'\');'
    );
    expect(helperContent).toContain("-- rollback SQL unavailable for schema extras");

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("directly classifies generic schema extras when SQL is not a table or index", () => {
    const { classifyExtraMigrationSql } = require("../cli/utils/migrations/ExtraMigrationClassifier") as typeof import("../cli/utils/migrations/ExtraMigrationClassifier.js");

    expect(
      classifyExtraMigrationSql(
        'ALTER TABLE "users" ADD CONSTRAINT users_email_check CHECK ("email" <> \'\');'
      )
    ).toEqual({
      targetName: "schema_extras",
      fileSuffix: "add_schema_extras",
      headerLabel: "schema extras",
      logLabel: "Helper migration",
      fallbackRollbackSql: "-- rollback SQL unavailable for schema extras",
    });
  });

  test("covers soft-delete column detection variants and no-op relation dependency guards", async () => {
    const ctx = setupContext();
    fs.writeFileSync(path.join(ctx.modelsDir, "User.ts"), "export class User {}", "utf8");
    fs.writeFileSync(path.join(ctx.modelsDir, "Post.ts"), "export class Post {}", "utf8");

    ctx.loadModule.mockImplementation((modulePath: string) => {
      if (modulePath.endsWith("User.ts")) {
        return {
          User: {
            tableName: "users",
            softDeletes: true,
            schema: {
              id: column("increments"),
              deleted_at: column("timestamp"),
              noise: null as any,
              orphan: relation("belongsTo", "Ghost"),
            } satisfies Record<string, SchemaField>,
          },
        };
      }
      return {
        Post: {
          tableName: "posts",
          softDeletes: true,
          schema: {
            id: column("increments"),
            soft: column("softDeletes" as any),
            owner: relation("belongsTo", "User"),
          } satisfies Record<string, SchemaField>,
        },
      };
    });

    ctx.toCreateSQL.mockResolvedValue({
      mainSQL: "",
      extraTables: [],
      rollbackMainSQL: "",
      rollbackExtraTables: [],
    });

    const { makeMigration } = await import("../cli/commands/makeMigration.js");
    await makeMigration("all", { test: true, exit: false });

    const sqlCalls = ctx.toCreateSQL.mock.calls as unknown as unknown[][];
    const userCall = sqlCalls.find((args) => args[0] === "users");
    const postCall = sqlCalls.find((args) => args[0] === "posts");
    expect(userCall).toBeDefined();
    expect(postCall).toBeDefined();

    const userSchema = userCall?.[1] as Record<string, SchemaField>;
    const postSchema = postCall?.[1] as Record<string, SchemaField>;
    expect(userSchema.deleted_at).toBeDefined();
    expect(postSchema.soft).toBeDefined();
    expect(postSchema.deleted_at).toBeUndefined();

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("covers stable body compare fallback branch when previous update file has no marker", async () => {
    const ctx = setupContext();
    fs.writeFileSync(path.join(ctx.modelsDir, "User.ts"), "export class User {}", "utf8");
    const migrationDir = path.join(ctx.testMigrationsRoot, "custom_conn");
    fs.mkdirSync(migrationDir, { recursive: true });
    fs.writeFileSync(
      path.join(migrationDir, "20000101000000001_update_users_table.ts"),
      "plain legacy body without exported up function",
      "utf8"
    );

    ctx.loadModule.mockReturnValue({
      User: {
        tableName: "users",
        schema: {
          id: column("increments"),
          name: column("string"),
        } satisfies Record<string, SchemaField>,
      },
    });
    ctx.toCreateSQL.mockResolvedValue({
      mainSQL: "ALTER TABLE users ADD COLUMN name VARCHAR(255);",
      extraTables: [],
      rollbackMainSQL: "ALTER TABLE users DROP COLUMN name;",
      rollbackExtraTables: [],
    });

    const { makeMigration } = await import("../cli/commands/makeMigration.js");
    await makeMigration("User", {
      test: true,
      connectionName: "custom_conn" as any,
      exit: false,
    });

    const updates = fs
      .readdirSync(migrationDir)
      .filter((fileName) => fileName.includes("update_users_table.ts"));
    expect(updates.length).toBeGreaterThanOrEqual(2);

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("covers non-Error catch branches and default-options exit path", async () => {
    const ctx = setupContext();
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    fs.writeFileSync(path.join(ctx.modelsDir, "User.ts"), "export class User {}", "utf8");

    const { makeMigration } = await import("../cli/commands/makeMigration.js");

    ctx.loadModule.mockImplementation(() => {
      throw "load-failed-string";
    });
    await expect(makeMigration("User", { test: true, exit: false })).rejects.toThrow(
      "User.ts"
    );
    expect(errorSpy).toHaveBeenCalledWith("load-failed-string");

    ctx.loadModule.mockReturnValue({
      User: {
        tableName: "users",
        schema: {
          id: column("increments"),
        } satisfies Record<string, SchemaField>,
      },
    });
    ctx.toCreateSQL.mockImplementation(async () => {
      throw "sql-failed-string";
    });
    await expect(makeMigration("User", { test: true, exit: false })).rejects.toThrow(
      "User.ts"
    );
    expect(errorSpy).toHaveBeenCalledWith("sql-failed-string");

    ctx.toCreateSQL.mockResolvedValue({
      mainSQL: "",
      extraTables: [],
      rollbackMainSQL: "",
      rollbackExtraTables: [],
    });
    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation(((code?: number) => {
        throw new Error(`exit:${String(code)}`);
      }) as never);

    await expect(makeMigration("User")).rejects.toThrow("exit:0");
    expect(exitSpy).toHaveBeenCalledWith(0);

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });

  test("default exit path reports plural model failures and exits with code 1", async () => {
    const ctx = setupContext();
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    fs.writeFileSync(path.join(ctx.modelsDir, "User.ts"), "export class User {}", "utf8");
    fs.writeFileSync(path.join(ctx.modelsDir, "Post.ts"), "export class Post {}", "utf8");

    ctx.loadModule.mockImplementation(() => {
      throw "plural-load-failed";
    });

    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation(((code?: number) => {
        throw new Error(`exit:${String(code)}`);
      }) as never);

    const { makeMigration } = await import("../cli/commands/makeMigration.js");

    await expect(makeMigration("all")).rejects.toThrow("exit:1");
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Migration generation failed for 2 models:"),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);

    fs.rmSync(ctx.root, { recursive: true, force: true });
  });
});
